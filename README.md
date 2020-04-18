# hclustjs
Vanilla JS Hierarchical Clustering (with non-vanilla plotting).
Currently only supports the Ward merging method.

### Requires
- [linalgejs](https://github.com/eliovr/linalgejs): Vanilla JS functions for linear algebra (and some other convenience functions).
- [D3js](https://d3js.org/): For plotting the dendrogram.

### Usage
```javascript
let data = load('path/to/data');
// data is expected as a 2D array of numbers.
let ward = new HClust().fit(data);
ward.plot('html-elem-id'); // plots a dendrogram in the given html element.
let tree = ward.tree; // tree is an array, where each row is a list of clusters at each merging level.
```
