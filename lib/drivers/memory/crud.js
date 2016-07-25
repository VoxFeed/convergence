const first = require('lodash/first');
const clone = require('lodash/cloneDeep');
const MemoryFilter = require('./filter');
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');
const utils = require('./../utils');

const MemoryCrud = (engine, schema) => {
  const {store} = engine.connection;
  const filter = MemoryFilter(schema, store);
  const {validateQueryWithSchema, validateFieldsAreInSchema} = utils(schema);

  const COLLECTION_NAME = schema.collection;

  const findOne = query => _find(query).then(records => _handleSingleRecord(first(records)));

  const find = query => _find(query).then(_handleMultipleRecords);

  const count = query => _find(query).then(records => records.length);

  const _find = (query) => {
    return validateQueryWithSchema(snakeobj(query))
    .then(() => filter(snakeobj(query)));
  };

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  const _handleSingleRecord = (record) => camelobj(record);

  const insert = (data = {}) => {
    const toSave = snakeobj(data);
    return validateFieldsAreInSchema(toSave)
      .then(() => _insert(toSave))
      .then(_handleSingleRecord);
  };

  const _insert = (data) => {
    store[COLLECTION_NAME].push(data);
    return data;
  };

  const update = (query, data) => {
    const toSave = snakeobj(data);
    return validateQueryWithSchema(snakeobj(query))
      .then(() => validateFieldsAreInSchema(toSave))
      .then(() => _update(query, toSave))
      .then(_handleResponse);
  };

  const _update = (query, data) => {
    return _find(snakeobj(query))
      .then(records => records.map(record => Object.assign(record, data)));
  };

  const _handleResponse = records => {
    if (_isSingleRecord(records)) return _handleSingleRecord(records[0]);
    return _handleMultipleRecords(records);
  };

  const _isSingleRecord = records => records.length === 1;

  const remove = query => {
    return validateQueryWithSchema(clone(query))
      .then(() => _remove(query))
      .then(_handleMultipleRecords);
  };

  const _remove = (query) => {
    return _find(snakeobj(query))
      .then(records => records.map(_removeRecord));
  };

  const _removeRecord = (record) => {
    const start = store[COLLECTION_NAME].indexOf(record);
    const toRemove = 1;
    store[COLLECTION_NAME].splice(start, toRemove);
    return record;
  };

  return {find, findOne, count, insert, update, remove};
};

module.exports = MemoryCrud;
