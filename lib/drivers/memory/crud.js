const MemoryFilter = require('./filter');
const PostgresCrud = (engine, schema) => {
  const {store} = engine.connection;
  const {filter} = MemoryFilter(schema, store);

  const findOne = query => {
    return filter(query);
  };

  const create = data => {
    return data;
  };

  return {findOne, create};
};

module.exports = PostgresCrud;
