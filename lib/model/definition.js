const {values, snakeCase, uniq, isString, isFunction} = require('lodash');
const snakeobj = require('snakeobj');
const buildCrud = require('./crud');
const {BadInputError} = require('./../errors');

const types = {
  PRIMARY_KEY: 'uuid',
  FOREIGN_KEY: 'uuid',
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
  'getUniqueIndexes', 'extend', 'getExtendedModel', 'setPrimaryKey'
];

const defineModel = (args = {}) => {
  _validateDefinition(args.definition);

  const {collection, engine} = args;
  const definition = snakeobj(args.definition);
  let primaryKey;
  const uniqueIndexes = [];
  let extendedModel;

  const setPrimaryKey = key => {
    const pk = snakeCase(key);
    if (!_isValidAsKey(pk)) return;
    primaryKey = {primaryKey: pk};
    return Object.assign({}, primaryKey);
  };

  const getPrimaryKey = () => primaryKey.primaryKey;

  const getKnownFields = (data, schema) => {
    return Object.keys(snakeobj(data)).filter(isKnownField);
  };

  const getOwnFields = (data, schema) => {
    return Object.keys(snakeobj(data)).filter(isOwnField);
  };

  const getFieldType = field => {
    if (isExtended()) return _getExtendedFieldType(field);
    return definition[field];
  };

  const _getExtendedFieldType = field => {
    return definition[field] || extendedModel.model.getFieldType(field);
  };

  const getCollectionForField = field => {
    if (isUnknownField(field)) return;
    if (isExtended()) return _getExtendedCollectionForField(field);
    return collection;
  };

  const _getExtendedCollectionForField = field => {
    if (isOwnField(field)) return collection;
    return extendedModel.name;
  };

  const validatesUniquenessOf = (...fields) => {
    const known = uniq(fields.map(snakeCase).filter(isKnownField));
    known.forEach(appendFieldToUnique);
    return known;
  };

  const extend = (model, foreignKey) => {
    const fk = snakeCase(foreignKey);
    if (isUnknownField(fk) || !_isModel(model) || !_isValidAsKey(fk)) return;
    _setExtendedModel(model, fk);
    return Object.assign({}, extendedModel);
  };

  const _isValidAsKey = pk => {
    return isOwnField(pk) && getFieldType(pk) === types.PRIMARY_KEY;
  };

  const _setExtendedModel = (model, foreignKey) => {
    extendedModel = {name: model.collection, model, foreignKey};
  };

  const getExtendedModel = () => extendedModel;

  const isExtended = () => !!extendedModel;

  const isOwnField = field => {
    return Object.keys(definition).includes(field);
  };

  const isKnownField = field => {
    const knownFields = Object.keys(definition);
    if (!isExtended()) return knownFields.includes(field);
    return knownFields.includes(field) || extendedModel.model.isKnownField(field);
  };

  const isUnknownField = field => !isKnownField(field);

  const appendFieldToUnique = field => {
    if (!uniqueIndexes.includes(field)) uniqueIndexes.push(field);
  };

  const getUniqueIndexes = () => [...uniqueIndexes];

  const schema = {
    collection, getKnownFields, getFieldType, isExtended, isKnownField,
    validatesUniquenessOf, getUniqueIndexes, extend, getExtendedModel,
    getOwnFields, isOwnField, getCollectionForField, setPrimaryKey, getPrimaryKey
  };

  const crud = buildCrud(engine, schema);

  return Object.assign({}, schema, crud);
};

const _isModel = model => {
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
