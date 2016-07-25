const {values, snakeCase, uniq, isString, isFunction} = require('lodash');
const snakeobj = require('snakeobj');
const buildCrud = require('./crud');
const {BadInputError} = require('./../errors');

const types = {
  UUID: 'uuid',
  STRING: 'string',
  TEXT: 'text',
  INTEGER: 'integer',
  JSON: 'json',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DECIMAL: 'decimal'
};

const validTypes = values(types);

const modelFunctions = [
  'getKnownFields', 'getFieldType', 'validatesUniquenessOf',
  'getUniqueIndexes', 'extend'
];

const defineModel = (args = {}) => {
  _validateDefinition(args.definition);

  const {collection, engine} = args;
  const definition = snakeobj(args.definition);
  const uniqueIndexes = [];
  let extendedModel;

  const getKnownFields = (data, schema) => {
    return Object.keys(snakeobj(data)).filter(isKnownField);
  };

  const getFieldType = (field) => definition[field];

  const validatesUniquenessOf = (...fields) => {
    const known = uniq(fields.map(snakeCase).filter(isKnownField));
    known.forEach(appendFieldToUnique);
    return known;
  };

  const extend = (model, fk) => {
    const foreignKey = snakeCase(fk);
    if (isUnknownField(foreignKey) || isNotModel(model)) return;
    setExtendedModel(model, foreignKey);
    return Object.assign({}, extendedModel);
  };

  const setExtendedModel = (model, foreignKey) => {
    extendedModel = {name: model.collection, model, foreignKey};
  };

  const isKnownField = field => {
    const knownFields = Object.keys(definition);
    return knownFields.includes(field);
  };

  const isUnknownField = field => !isKnownField(field);

  const appendFieldToUnique = field => {
    if (!uniqueIndexes.includes(field)) uniqueIndexes.push(field);
  };

  const getUniqueIndexes = () => [...uniqueIndexes];

  const schema = {
    collection, getKnownFields, getFieldType,
    validatesUniquenessOf, getUniqueIndexes, extend
  };

  const crud = buildCrud(engine, schema);

  return Object.assign({}, schema, crud);
};

const isNotModel = model => !isModel(model);

const isModel = model => {
  if (!isString(model.collection)) return false;
  return modelFunctions.reduce((valid, func) => {
    return valid && isFunction(model[func]);
  }, true);
};

const _validateDefinition = definition => {
  if (!definition) throw BadInputError('schema definition is missing');
  _validateDefinitionTypes(definition);
};

const _validateDefinitionTypes = definition => {
  Object.keys(definition).forEach(field => _throwIfBadType(definition[field]));
};

const _throwIfBadType = (type) => {
  if (!validTypes.includes(type)) throw BadInputError(`${type} is not known schema type`);
};

module.exports = Object.assign({}, {types, defineModel});
