const {first} = require('lodash');
const MemoryFilter = require('./filter');
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');
const utils = require('./../utils');

const MemoryCrud = (engine, schema) => {
  const {store} = engine.connection;
  const filter = MemoryFilter(schema, store);
  const {validateQueryWithSchema} = utils(schema);

  const findOne = query => _find(query).then(_handleSingleRecord);

  const find = query => _find(query).then(_handleMultipleRecords);

  const count = query => _find(query).then(records => records.length);

  const _find = (query) => {
    return validateQueryWithSchema(snakeobj(query))
    .then(() => filter(query));
  };

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  const _handleSingleRecord = (records) => {
    const record = first(records);
    return camelobj(record);
  };

  const insert = data => {
    return data;
  };

  return {find, findOne, count, insert};
};

module.exports = MemoryCrud;
