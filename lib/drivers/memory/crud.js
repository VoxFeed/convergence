const first = require('lodash/first');
const MemoryFilter = require('./filter');

const MemoryCrud = (engine, schema) => {
  const {store} = engine.connection;
  const {filter} = MemoryFilter(schema, store);

  const findOne = query => {
    return new Promise(resolve => {
      const record = first(filter(query));
      resolve(record);
    });
  };

  const create = data => {
    return data;
  };

  return {findOne, create};
};

module.exports = MemoryCrud;
