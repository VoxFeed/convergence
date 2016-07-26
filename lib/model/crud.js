const buildValidations = require('./validations');
const crudSelector = {
  postgres: require('./../drivers/postgres/crud'),
  memory: require('./../drivers/memory/crud')
};

const Crud = (engine, schema) => {
  const {name} = engine;
  const {validateFieldsAreInSchema, validateQueryWithSchema} = buildValidations(schema);

  const buildCrud = crudSelector[name];
  const crud = buildCrud(engine, schema);

  const count = query => validateQueryWithSchema(query).then(() => crud.count(query));

  const find = query => validateQueryWithSchema(query).then(() => crud.find(query));

  const findOne = query => validateQueryWithSchema(query).then(() => crud.findOne(query));

  const insert = data => validateFieldsAreInSchema(data).then(() => crud.insert(data));

  const remove = query => validateQueryWithSchema(query).then(() => crud.remove(query));

  const update = (query, data) => {
    return validateQueryWithSchema(query)
    .then(() => validateFieldsAreInSchema(data))
    .then(() => crud.update(query, data));
  };

  const upsert = data => {
    return validateFieldsAreInSchema(data)
      .then(() => crud.upsert(data));
  };

  return {count, find, findOne, insert, update, upsert, remove};
};

module.exports = Crud;
