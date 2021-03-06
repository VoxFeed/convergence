const {forEach, isEmpty} = require('lodash');

module.exports = (tables, store) => {
  const resetMemory = () => {
    return new Promise(resolve => {
      forEach(tables, resetTable);
      resolve();
    });
  };

  const resetTable = (model, table) => {
    cleanTable(table);
    loadTable(model);
  };

  const cleanTable = table => {
    const index = `${table}_indexes`;
    delete store[table];
    delete store[index];
  };

  const loadTable = model => {
    const indexName = `${model.collection}_indexes`;
    let indexField = model.getUniqueSingleIndexes();
    if (isEmpty(indexField)) {
      indexField = model.getUniqueCombinedIndexes();
    }
    indexField = indexField.join('°U°');
    store[model.collection] = {};
    store[indexName] = { primary: {}, unique: {[indexField]: {} }};
  };

  return resetMemory();
};
