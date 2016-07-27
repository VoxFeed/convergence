const {first, pick, filter, isEmpty} = require('lodash');
const MemoryFilter = require('./filter');
const dotobj = require('dot-object').object;
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');

const MemoryCrud = (engine, model) => {
  const {store} = engine.connection;
  const memoryFilter = MemoryFilter(model, store);
  const parentModel = model.isExtended() ? model.getExtendedModel().model : {};

  const collectionName = model.collection;
  const parentCollectionName = model.isExtended() ? parentModel.collection : null;
  const foreignKey = model.isExtended() ? model.getExtendedModel().foreignKey : '';

  const count = query => _find(query).then(records => records.length);

  const find = query => _find(query).then(_handleMultipleRecords);

  const findOne = query => _find(query).then(records => _handleSingleRecord(first(records)));

  const _find = query => {
    return new Promise(resolve => {
      const records = memoryFilter(snakeobj(query));
      resolve(records);
    });
  };

  const insert = (data = {}) => _insert(snakeobj(data)).then(_handleSingleRecord);

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
    const query = { [foreignKey]: record.id };
    const child = filter(store[collectionName], query)[0];
    const fields = model.getOwnFields(data);
    return Object.assign(child, pick(data, fields));
  };

  const _updateParent = (record, data) => {
    const query = {id: record.id};
    const parent = filter(store[parentCollectionName], query)[0];
    const fields = parentModel.getOwnFields(data);
    return Object.assign(parent, pick(data, fields));
  };

  const upsert = data => _upsert(snakeobj(data)).then(_handleSingleRecord);

  const _upsert = data => {
    const uniqueIndexes = model.getUniqueIndexes();
    if (isEmpty(uniqueIndexes)) return _insert(data);
    const query = {where: pick(data, uniqueIndexes)};
    return _upsertRecord(query, data);
  };

  const _upsertRecord = (query, data) => {
    return _find(query)
      .then(records => records[0])
      .then(record => {
        if (!record) return _insert(data);
        return _updateRecord(record, data);
      });
  };

  const _insert = data => {
    return new Promise(resolve => {
      _insertChild(data);
      _insertParent(data);
      resolve(data);
    });
  };

  const _insertChild = data => {
    const toSave = Object.assign({[foreignKey]: data.id}, data);
    const storeFields = model.getOwnFields(toSave);
    store[collectionName].push(pick(toSave, storeFields));;
  };

  const _insertParent = data => {
    if (!model.isExtended()) return;

    const extendedStoreFields = parentModel.getOwnFields(data);
    store[parentCollectionName].push(pick(data, extendedStoreFields));
  };

  const _handleResponse = records => {
    if (_isSingleRecord(records)) return _handleSingleRecord(records[0]);
    return _handleMultipleRecords(records);
  };

  const _isSingleRecord = records => records.length === 1;

  const _handleSingleRecord = record => camelobj(record);

  const remove = query => _remove(query).then(_handleMultipleRecords);

  const _remove = query => {
    return _find(snakeobj(query))
      .then(records => records.map((record) => {
        return model.isExtended() ? _removeComposeRecord(record) : _removeRecord(record);
      }));
  };

  const _removeComposeRecord = record => {
    _removeChild(record);
    _removeParent(record);
    return record;
  };

  const _removeChild = record => {
    const query = {[foreignKey]: record.id};
    const recordToRemove = filter(store[collectionName], query)[0];
    _removeRecord(recordToRemove, collectionName);
  };

  const _removeParent = record => {
    const query = {id: record.id};
    const recordToRemove = filter(store[parentCollectionName], query)[0];
    _removeRecord(recordToRemove, parentCollectionName);
  };

  const _removeRecord = (record, collection = collectionName) => {
    const start = store[collection].indexOf(record);
    const toRemove = 1;
    store[collection].splice(start, toRemove);
    return record;
  };

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  return {find, findOne, count, insert, update, upsert, remove};
};

module.exports = MemoryCrud;
