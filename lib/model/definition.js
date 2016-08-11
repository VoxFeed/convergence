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
  'getKnownFields', 'getFieldType', 'unique',
  'getUniqueSingleIndexes', 'extend', 'getExtendedModel', 'setPrimaryKey'
];

const defineModel = (args = {}) => {
  _validateDefinition(args.definition);

  const {collection, engine} = args;
  const definition = snakeobj(args.definition);
  const uniqueIndexes = {single: [], combined: []};
  const notNull = [];
  let primaryKey;
  let extendedModel;

  const setPrimaryKey = key => {
    const pk = snakeCase(key);
    if (!_isValidAsKey(pk)) return;
    primaryKey = pk;
    crud.setPrimaryKey(primaryKey);
    return primaryKey;
  };

  const getPrimaryKey = () => primaryKey;

  const getKnownFields = (data, schema) => {
    return Object.keys(snakeobj(data)).filter(isKnownField);
  };

  const getOwnFields = (data, schema) => {
    return Object.keys(snakeobj(data)).filter(isOwnField);
  };

  const getFieldType = field => {
    const fieldName = snakeCase(field);
    if (isExtended()) return _getExtendedFieldType(fieldName);
    return definition[fieldName];
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

  const unique = ({single, combined}) => {
    return [..._singleUnique(single || []), ..._combinedUnique(combined || [])];
  };

  const present = fields => {
    const toAdd = uniq(fields).filter(isKnownField).filter(_notInNotNull);
    toAdd.forEach(field => notNull.push(snakeCase(field)));
    return toAdd;
  };

  const getRequiredFields = () => {
    if (isExtended()) return [...notNull, ...extendedModel.model.getRequiredFields()];
    return [...notNull];
  };

  const _notInNotNull = field => !notNull.includes(field);

  const _singleUnique = fields => {
    const known = uniq(fields.map(snakeCase).filter(isKnownField));
    known.forEach(_appendFieldToUniqueSingle);
    crud.setSingleUnique(known);
    return known;
  };

  const _combinedUnique = fields => {
    const known = uniq(fields.map(snakeCase).filter(isKnownField));
    known.forEach(_appendFieldToUniqueCombined);
    crud.setCombinedUnique(known);
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
    const fieldName = snakeCase(field);
    if (!isExtended()) return knownFields.includes(fieldName);
    return knownFields.includes(fieldName) || extendedModel.model.isKnownField(fieldName);
  };

  const isUnknownField = field => !isKnownField(field);

  const _appendFieldToUniqueSingle = field => {
    if (!uniqueIndexes.single.includes(field)) uniqueIndexes.single.push(field);
  };

  const _appendFieldToUniqueCombined = field => {
    if (!uniqueIndexes.combined.includes(field)) uniqueIndexes.combined.push(field);
  };

  const getUniqueSingleIndexes = () => [...uniqueIndexes.single];

  const getUniqueCombinedIndexes = () => [...uniqueIndexes.combined];

  const getData = data => {
    const fields = getOwnFields(data || {});
    return fields.reduce(_getSelectedFields(data || {}), {});
  };

  const _getSelectedFields = data => (selected, field) => {
    selected[field] = data[field];
    return selected;
  };

  const schema = {
    collection, getKnownFields, getFieldType, isExtended, isKnownField,
    unique, present, getRequiredFields, getUniqueSingleIndexes,
    getUniqueCombinedIndexes, extend, getExtendedModel, getOwnFields,
    isOwnField, getCollectionForField, setPrimaryKey, getPrimaryKey, getData
  };

  const crud = buildCrud(engine, schema);

  return Object.assign({}, crud, schema);
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
