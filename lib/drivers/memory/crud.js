const MemoryFilter = require('./filter');
const PostgresCrud = (driver, schema) => {
  const {store} = driver;
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
