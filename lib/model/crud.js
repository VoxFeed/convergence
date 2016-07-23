const crudSelector = {
  postgres: require('./../drivers/postgres/crud'),
  memory: require('./../drivers/memory/crud')
};

const Crud = (engine, schema) => {
  const {name} = engine;
  const buildCrud = crudSelector[name];
  return buildCrud(engine, schema);
};

module.exports = Crud;
