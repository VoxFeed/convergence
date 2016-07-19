const crudSelector = {
  postgres: require('./../drivers/postgres/crud'),
  memory: require('./../drivers/memory/crud')
};

const Crud = (driver, schema) => {
  const {engine} = driver;
  const buildCrud = crudSelector[engine];
  return buildCrud(driver, schema);
};

module.exports = Crud;
