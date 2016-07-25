const {values, snakeCase, uniq} = require('lodash');
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

const defineModel = (args = {}) => {
  _validateDefinition(args.definition);

  const {collection, engine} = args;
  const definition = snakeobj(args.definition);
  const uniqueIndexes = [];

  const getKnownFields = (data, schema) => {
    return Object.keys(snakeobj(data)).filter(determineKnownField);
  };

  const determineKnownField = field => {
    const knownFields = Object.keys(definition);
    return knownFields.includes(field);
  };

  const getFieldType = (field) => definition[field];

  const validatesUniquenessOf = (...fields) => {
    const known = uniq(fields.map(snakeCase).filter(determineKnownField));
    known.forEach(appendFieldToUnique);
    return known;
  };

  const appendFieldToUnique = field => {
    if (!uniqueIndexes.includes(field)) uniqueIndexes.push(field);
  };

  const getUniqueIndexes = () => [].concat(uniqueIndexes);

  const schema = {
    collection, getKnownFields, getFieldType,
    validatesUniquenessOf, getUniqueIndexes
  };
  const crud = buildCrud(engine, schema);

  return Object.assign({}, schema, crud);
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
