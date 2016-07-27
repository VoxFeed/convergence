const first = require('lodash/first');
const pick = require('lodash/pick');
const MemoryFilter = require('./filter');
const dotobj = require('dot-object').object;
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');

const MemoryCrud = (engine, schema) => {
  const {store} = engine.connection;
  const filter = MemoryFilter(schema, store);
  const extendedSchema = schema.isExtended() ? schema.getExtendedModel() : {};

  const COLLECTION_NAME = schema.collection;
  const EXTENDED_COLLECTION_NAME = schema.isExtended() ? extendedSchema.model.collection : null;

  const count = query => _find(query).then(records => records.length);

  const find = query => _find(query).then(_handleMultipleRecords);

  const findOne = query => _find(query).then(records => _handleSingleRecord(first(records)));

  const _find = (query) => {
    return new Promise(resolve => {
      const records = filter(snakeobj(query));
      resolve(records);
    });
  };

  const insert = (data = {}) => _insert(snakeobj(data)).then(_handleSingleRecord);

  const _insert = data => {
    return new Promise(resolve => {
      _insertChild(data);
      _insertParent(data);
      resolve(data);
    });
  }

  const _insertChild = data => {
    const toSave = Object.assign({}, data);
    toSave[extendedSchema.foreignKey] = data.id;
    const storeFields = schema.getOwnFields(toSave);
    store[COLLECTION_NAME].push(pick(toSave, storeFields));;
  };

  const _insertParent = data => {
    if (!schema.isExtended()) return;

    const extendedStoreFields = extendedSchema.model.getOwnFields(data);
    store[EXTENDED_COLLECTION_NAME].push(pick(data, extendedStoreFields))
  };

  const update = (query, data) => _update(query, snakeobj(data)).then(_handleResponse);

  const _update = (query, data) => {
    return _find(query)
      .then(records => records.map(record => Object.assign(record, dotobj(data))));
  };

  const _handleResponse = records => {
    if (_isSingleRecord(records)) return _handleSingleRecord(records[0]);
    return _handleMultipleRecords(records);
  };

  const _isSingleRecord = records => records.length === 1;

  const _handleSingleRecord = (record) => camelobj(record);

  const remove = query => _remove(query).then(_handleMultipleRecords);

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

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  return {find, findOne, count, insert, update, remove};
};

module.exports = MemoryCrud;
