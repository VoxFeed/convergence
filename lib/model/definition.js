const values = require('lodash/values');
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

const defineModel = args => {
  _validateDefinition(args.definition);

  const {collection, engine} = args;
  const definition = snakeobj(args.definition || {});

  const getKnownFields = (data, schema) => {
    const knownFields = Object.keys(definition);
    return Object.keys(data).filter(field => knownFields.includes(field));
  };

  const getFieldType = (field) => definition[field];

  const schema = {collection, getKnownFields, getFieldType};
  const crud = buildCrud(engine, schema);

  return Object.assign({}, schema, crud);
};

const _validateDefinition = (definition) => {
  if (!definition) throw BadInputError('schema definition is missing');
  _validateDefinitionTypes(definition);
};

const _validateDefinitionTypes = (definition) => {
  Object.keys(definition).forEach(field => _throwIfBadType(definition[field]));
};

const _throwIfBadType = (type) => {
  if (!validTypes.includes(type)) throw BadInputError(`${type} is not known schema type`);
};

module.exports = Object.assign({}, {types, defineModel});
