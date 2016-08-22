
const uuid = require('uuid-v4');
const camelCase = require('lodash/camelCase');

const buildValidations = require('./validations');
const crudSelector = {
  postgres: require('./../drivers/postgres/crud'),
  memory: require('./../drivers/memory/crud')
};

const Crud = (engine, model) => {
  const {name} = engine;
  const {validateFieldsAreInSchema, validateQueryWithSchema, validateIndexesForUpsert} = buildValidations(model);

  const buildCrud = crudSelector[name];
  const crud = buildCrud(engine, model);

  const count = query => validateQueryWithSchema(query).then(() => crud.count(query));

  const find = query => validateQueryWithSchema(query).then(() => crud.find(query));

  const findOne = query => validateQueryWithSchema(query).then(() => crud.findOne(query));

  const insert = data => {
    return validateFieldsAreInSchema(data)
    .then(() => _setKeys(data))
    .then(() => crud.insert(data));
  };

  const remove = query => validateQueryWithSchema(query).then(() => crud.remove(query));

  const update = (query, data) => {
    return validateQueryWithSchema(query)
    .then(() => validateFieldsAreInSchema(data))
    .then(() => crud.update(query, data));
  };

  const upsert = (data, query) => {
    return validateFieldsAreInSchema(data)
      .then(() => validateIndexesForUpsert())
      .then(() => _setKeys(data))
      .then(() => crud.upsert(data, query));
  };

  const _setKeys = data => {
    model.isExtended() ? _setPrimaryAndForeignKeys(data) : _setPrimaryKey(data, model);
  };

  const _setPrimaryAndForeignKeys = (data) => {
    const parentModel = model.getExtendedModel().model;
    _setPrimaryKey(data, parentModel);
    const pk = camelCase(parentModel.getPrimaryKey());
    const fk = camelCase(model.getExtendedModel().foreignKey);
    data[fk] = data[pk];
  };

  const _setPrimaryKey = (data, _model) => {
    const pk = camelCase(_model.getPrimaryKey());
    data[pk] = data[pk] ? data[pk] : uuid();
  };

  return Object.assign({}, crud, {count, find, findOne, insert, update, upsert, remove});
};

module.exports = Crud;
