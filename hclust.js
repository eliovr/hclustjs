/**
* An implementation of Hierarchical Clustering using the Ward method, and
* a plotting function to show the results as a dendrogram.
*
* Training relies on the linalgejs library, and plotting on D3js.
*/

class HClust {
  constructor() {
    this.tree = [];
    this.plotParams = {
      'width': 800,
      'height': 500,
      'nodes': {
        'show': true,
        'fill': 'black',
        'stroke': null,
        'radius': 1
      },
      'branches': {
        'stroke': '#ccc'
      },
      'leafs': {
        'show': true,
        'size': 5
      }
    }
  }

  /**
  * Agglomerates data based on their similarity and returns an array of size 'n'
  * (where n = # of instancess).
  * @param {2D array} data Data to be fitted.
  * @return {2D array} Each row has an array of clusters for the given
  *   level of the tree. Each cluster within each level is an object with four
  *   attributes: an 'id', an array of 'instances', an array of 'children' and a
  *   distance value 'dist'.
  */
  fit(data) {
    // Initialize leafs of the tree.
    let leafs = [];
    for (var i = 0; i < data.length; i++) {
      leafs[i] = {'id': i, 'instances': [i], 'dist': 0, 'children': []};
    }

    // Ward.D2 uses squared distances.
    let distMatrix = data.distMatrix();
    for (var i = 0; i < data.length-1; i++) {
      for (var j = i+1; j < data.length; j++) {
        distMatrix[i][j] = Math.pow(distMatrix[i][j], 2);
      }
    }

    this.tree = [leafs];
    this.tree = this.train(distMatrix, this.tree);
    return this;
  }

  train(distMatrix, tree){
    for (var level = 0; level < distMatrix.length; level++) {
      let clusters = tree[level];
      let ids = clusters.map((cs) => { return cs.id });
      let [ai, bi] = this.bestMerge(distMatrix, ids);
      let a = clusters[ai];
      let b = clusters[bi];
      let ab_dist = distMatrix[a.id][b.id];
      let newBranch = [{
        'id': a.id, // Math.min(a.id, b.id),
        'children': [a, b], // merged cluster objects.
        'instances': a.instances.concat(b.instances), // data instances.
        'dist': Math.sqrt(ab_dist) // height used in the plot.
      }];

      for (var i = 0; i < clusters.length; i++) {
        if (ai != i && bi != i) {
          newBranch.push(clusters[i]);
        }
      }

      let a_count = a.instances.length;
      let b_count = b.instances.length;

      // Update distances between the new cluster and all other instances/clusters.
      for (var i = 0+1; i < newBranch.length; i++) {
        const c = newBranch[i];
        let c_count = c.instances.length;
        let x = Math.min(b.id, c.id);
        let y = Math.max(b.id, c.id);
        let bc_dist = distMatrix[x][y];
        x = Math.min(a.id, c.id);
        y = Math.max(a.id, c.id);
        let ac_dist = distMatrix[x][y];

        distMatrix[x][y] = ((a_count + c_count) * ac_dist) +
            ((b_count + c_count) * bc_dist) - (c_count * ab_dist);
        distMatrix[x][y] = distMatrix[x][y] / (a_count + b_count + c_count);
      }

      tree[level+1] = newBranch;
    }

    return tree;
  }

  /**
  * Get the best merge between a set of clusters. Best in this case is given by
  * the lowest distance.
  */
  bestMerge(distMatrix, clusterIds) {
    let lowest = Number.MAX_SAFE_INTEGER;
    let best = [0, 1];

    for (var i = 0; i < clusterIds.length; i++) {
      let a = clusterIds[i];

      for (var j = i+1; j < clusterIds.length; j++) {
        let b = clusterIds[j];
        let dist = lowest;

        if (a < b) dist = distMatrix[a][b];
        else  dist = distMatrix[b][a];

        if (lowest > dist) {
          best = [i, j];
          if (a > b) best = [j, i]; // order matters.
          lowest = dist;
        }
        if (lowest == 0) return best;
      }
    }

    return best;
  }

  /**
  * Plots the fitted tree as a dendrogram.
  * @param {String} elem_id ID if the html elemen in which to create the plot.
  */
  plot(elem_id) {
    let params = this.plotParams;
    let root = this.tree[this.tree.length-1][0];
    let maxDist = root.dist;
    let width = params.width;
    let height = params.height;

    // append the svg object to the body of the page
    let svg = d3.select('#' + elem_id)
      .append("svg")
        .attr("width", width)
        .attr("height", height)

    let hierarchy = d3.hierarchy(root, (d) => { return d.children; });
    let cluster = d3.cluster().size([width-10, height-20]);
    cluster(hierarchy);

    height -= 30; // bottom margin.
    let descendants = hierarchy.descendants().map((d) => {
      d.y = height - ((d.data.dist*height) / maxDist) + 5;
      return d;
    });

    let branches = svg
      .append('g')
      .attr('class', 'tree-branches')
      .selectAll('path')
      .data(descendants.slice(1));

    branches.enter()
      .append('path')
      .style("fill", 'none')
      .attr("stroke", params.branches.stroke)
      .attr("d", (d) => {
        return "M" + d.x + "," + d.y + "V" + d.parent.y + "H" + d.parent.x;
      });

    if (params.nodes.show) {
      let nodes = svg
        .append('g')
        .attr('class', 'tree-nodes')
        .selectAll("circle")
        .data(descendants);

      nodes.enter()
        .append("circle")
        .attr('r', params.nodes.radius)
        .attr("stroke", params.nodes.stroke)
        .style("fill", params.nodes.fill)
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")"
        });
    }

    if (params.leafs.show) {
      let leafs = svg
        .append('g')
        .attr('class', 'tree-leafs')
        .selectAll("text")
        .data(descendants);

      leafs.enter().append('text')
        .style("text-anchor", "end")
        .style("font-size", params.leafs.size)
        .attr("transform", (d) => {
            return "translate(" + (d.x+1) + "," + (d.y+2) + ") rotate(-90)";
        })
        .text((d) => {
            if (typeof(d.children) === 'undefined') return d.data.id;
            return null;
        });
    }

    return this;
  }

  /**
  * Expensive implementation of Ward.
  */
  train2(data, tree, level) {
    if (level >= data.length - 1) return tree;

    let clusters = tree[level];
    let clusterIds = clusters.map((cs) => { return cs.instances });
    let merge = this.bestMerge2(data, clusterIds);
    let instaceIds = clusterIds[merge.a].concat(clusterIds[merge.b]);
    let clustA = clusters[merge.a];
    let clustB = clusters[merge.b];
    let newBranch = [{
      'children': [clusters[merge.a], clusters[merge.b]],
      'instances': instaceIds,
      'dist': merge.dist + clustA.dist + clustB.dist
    }];

    for (var i = 0; i < clusters.length; i++) {
      if (merge['a'] != i && merge['b'] != i) {
        newBranch.push(clusters[i]);
      }
    }

    tree[level+1] = newBranch;
    return this.train2(data, tree, level+1);
  }

  bestMerge2(data, clusters) {
    let bestDist = Number.MAX_SAFE_INTEGER;
    let bestIds = {'a': 0, 'b': 1, 'dist': bestDist};

    for (var i = 0; i < clusters.length; i++) {
      let a = data.gather(clusters[i]);
      for (var j = i+1; j < clusters.length; j++) {
        let b = data.gather(clusters[j]);
        let dist = a.concat(b).ess();

        if (bestDist > dist) {
          bestIds = {'a': i, 'b': j, 'dist': dist};
          bestDist = dist;
        }
        if (bestDist == 0) return bestIds;
      }
    }

    return bestIds;
  }
}
