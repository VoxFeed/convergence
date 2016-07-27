const {first, pick, filter} = require('lodash');
const MemoryFilter = require('./filter');
const dotobj = require('dot-object').object;
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');

const MemoryCrud = (engine, model) => {
  const {store} = engine.connection;
  const memoryFilter = MemoryFilter(model, store);
  const parentModel = model.isExtended() ? model.getExtendedModel() : {};

  const COLLECTION_NAME = model.collection;
  const PARENT_COLLECTION_NAME = model.isExtended() ? parentModel.model.collection : null;

  const count = query => _find(query).then(records => records.length);

  const find = query => _find(query).then(_handleMultipleRecords);

  const findOne = query => _find(query).then(records => _handleSingleRecord(first(records)));

  const _find = (query) => {
    return new Promise(resolve => {
      const records = memoryFilter(snakeobj(query));
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
  };

  const _insertChild = data => {
    const toSave = Object.assign({[parentModel.foreignKey]: data.id}, data);
    const storeFields = model.getOwnFields(toSave);
    store[COLLECTION_NAME].push(pick(toSave, storeFields));;
  };

  const _insertParent = data => {
    if (!model.isExtended()) return;

    const extendedStoreFields = parentModel.model.getOwnFields(data);
    store[PARENT_COLLECTION_NAME].push(pick(data, extendedStoreFields));
  };

  const update = (query, data) => _update(query, snakeobj(data)).then(_handleResponse);

  const _update = (query, data) => {
    return _find(query)
      .then(records => records.map(record => _updateRecord(record, dotobj(data))));
  };

  const _updateRecord = (record, data) => {
    return model.isExtended() ? _updateComposeRecord(record, data) : Object.assign(record, data);
  };

  const _updateComposeRecord = (record, data) => {
    const childRecord = _updateChild(record, data);
    const parentRecord = _updateParent(record, data);
    return Object.assign({}, childRecord, parentRecord);
  };

  const _updateChild = (record, data) => {
    const query = { [parentModel.foreignKey]: record.id };
    const child = filter(store[COLLECTION_NAME], query)[0];
    const fields = model.getOwnFields(data);
    return Object.assign(child, pick(data, fields));
  };

  const _updateParent = (record, data) => {
    const query = {id: record.id};
    const parent = filter(store[PARENT_COLLECTION_NAME], query)[0];
    const fields = parentModel.model.getOwnFields(data);
    return Object.assign(parent, pick(data, fields));
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
      .then(records => records.map((record) => {
        return model.isExtended() ? _removeComposeRecord(record) : _removeRecord(record);
      }));
  };

  const _removeComposeRecord = (record) => {
    _removeChild(record);
    _removeParent(record);
    return record;
  };

  const _removeChild = (record) => {
    const query = {[parentModel.foreignKey]: record.id};
    const recordToRemove = filter(store[COLLECTION_NAME], query)[0];
    _removeRecord(recordToRemove, COLLECTION_NAME);
  };

  const _removeParent = (record) => {
    const query = {id: record.id};
    const recordToRemove = filter(store[PARENT_COLLECTION_NAME], query)[0];
    _removeRecord(recordToRemove, PARENT_COLLECTION_NAME);
  };

  const _removeRecord = (record, collectionName = COLLECTION_NAME) => {
    const start = store[collectionName].indexOf(record);
    const toRemove = 1;
    store[collectionName].splice(start, toRemove);
    return record;
  };

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  return {find, findOne, count, insert, update, remove};
};

module.exports = MemoryCrud;
