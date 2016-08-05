const {first, pick, filter, isEmpty, get, values, omit} = require('lodash');
const uuid = require('uuid-v4');

const MemoryFilter = require('./filter');
const dotobj = require('dot-object').object;
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');

const MemoryCrud = (engine, model) => {
  const {store} = engine.connection;
  const memoryFilter = MemoryFilter(model, store);

  const parentModel = model.isExtended() ? model.getExtendedModel().model : {};
  const parentCollectionName = model.isExtended() ? parentModel.collection : null;
  const foreignKey = model.isExtended() ? model.getExtendedModel().foreignKey : '';
  const parentPrimaryKey = model.isExtended() ? parentModel.getPrimaryKey() : '';

  const collectionName = model.collection;

  const count = query => _find(query).then(records => records.length);

  const find = query => _find(query).then(_handleMultipleRecords);

  const findOne = query => _find(query).then(records => _handleSingleRecord(first(records)));

  const insert = (data = {}) => _insert(snakeobj(data)).then(_handleSingleRecord);

  const update = (query, data) => _update(query, snakeobj(data)).then(_handleResponse);

  const _update = (query, data) => {
    return _find(query)
      .then(records => records.map(record => _updateRecord(record, dotobj(data))));
  };

  const upsert = data => _upsert(snakeobj(data)).then(_handleSingleRecord);

  const _upsert = data => {
    const index = _getUniqueIndex(model, data);
    return isEmpty(index) ? _insert(data) : _upsertRecord(index, data);
  };

  const _upsertRecord = (query, data) => {
    return _getRecord(query, data)
      .then(record => {
        if (!record) return _insert(data);
        return _updateRecord(record, data);
      });
  };

  const _getRecord = (indexKey, data) => {
    return indexKey === model.getPrimaryKey() ? _getRecordByPrimaryKey(indexKey, data) : _getRecordByUniqueIndex(indexKey, data);
  };

  const _getRecordByPrimaryKey = (indexKey, data) => {
    return new Promise(resolve => {
      const indexCollection = `${collectionName}_indexes`;
      const index = get(store, [indexCollection, 'primary', data[indexKey]]);
      return resolve(get(store, [collectionName, index]));
    });
  };

  const _getRecordByUniqueIndex = (indexKey, data) => {
    return new Promise(resolve => {
      const index = _getIndex(collectionName, indexKey, data);
      if (!index) return resolve();
      return resolve(get(store, [collectionName, index]));
    });
  };

  const _updateRecord = (record, data) => {
    const dataToUpdate = omit(data, [model.getPrimaryKey(), parentPrimaryKey]);
    return model.isExtended() ? _updateComposeRecord(record, dataToUpdate) : Object.assign(record, dataToUpdate);
  };

  const _updateComposeRecord = (record, data) => {
    const childRecord = _updateChild(record, data);
    const parentRecord = _updateParent(record, data);
    return Object.assign({}, childRecord, parentRecord);
  };

  const _updateChild = (record, data) => {
    const query = { [foreignKey]: record[foreignKey] };
    const child = filter(values(store[collectionName]), query)[0];
    const fields = model.getOwnFields(data);
    return Object.assign(child, pick(data, fields));
  };

  const _updateParent = (record, data) => {
    const query = {id: record[foreignKey]};
    const parent = filter(values(store[parentCollectionName]), query)[0];
    const fields = parentModel.getOwnFields(data);
    return Object.assign(parent, pick(data, fields));
  };

  const _insert = data => {
    if (!model.isExtended()) return _insertRecord(data);
    const parent = _insertParent(data);
    const child = _insertChild(data, parent);
    return Promise.resolve(Object.assign({}, parent, child));
  };

  const _insertRecord = data => {
    const record = pick(data, model.getOwnFields(data));
    _insertOnStore(record, model);
    return Promise.resolve(record);
  };

  const _insertChild = data => {
    const toSave = Object.assign({}, data);
    const childData = pick(toSave, model.getOwnFields(toSave));
    _insertOnStore(childData, model);
    return childData;
  };

  const _insertParent = data => {
    const parentData = pick(data, parentModel.getOwnFields(data));
    _insertOnStore(parentData, parentModel);
    return parentData;
  };

  const _insertOnStore = (record, _model) => {
    const index = uuid();
    const primaryKey = _model.getPrimaryKey();
    const indexName = `${_model.collection}_indexes`;

    if (!store.hasOwnProperty(_model.collection)) _loadCollection(_model);

    store[_model.collection][index] = record;
    store[indexName].primary[record[primaryKey]] = index;
    _insertIndex(record, _model, index);
  };

  const _insertIndex = (record, _model, index) => {
    const indexName = `${_model.collection}_indexes`;
    let indexKey = _model.getUniqueSingleIndexes();

    if (isEmpty(indexKey)) {
      indexKey = _model.getUniqueCombinedIndexes();
    }
    const indexValue = values(pick(record, indexKey)).join('°U°');
    indexKey = indexKey.join('°U°');
    store[indexName].unique[indexKey][indexValue] = index;
  }

  const _loadCollection = (_model) => {
    const indexName = `${_model.collection}_indexes`;
    let indexFields = _model.getUniqueSingleIndexes();
    if (isEmpty(indexFields)) {
      indexFields = _model.getUniqueCombinedIndexes();
    }

    store[_model.collection] = {};
    store[indexName] = { primary: {}, unique: {}};
    store[indexName].unique[indexFields.join('°U°')] = {};
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
        return model.isExtended() ? _removeComposeRecord(record) : _removeRecord(model, record);
      }));
  };

  const _find = query => {
    return new Promise(resolve => {
      const records = memoryFilter(snakeobj(query));
      resolve(records);
    });
  };

  const _removeComposeRecord = record => {
    _removeChild(record);
    _removeParent(record);
    return record;
  };

  const _removeChild = record => {
    const query = {[foreignKey]: record.id};
    const recordToRemove = filter(store[collectionName], query)[0];
    _removeRecord(model, recordToRemove, collectionName);
  };

  const _removeParent = record => {
    const query = {id: record.id};
    const recordToRemove = filter(store[parentCollectionName], query)[0];
    _removeRecord(parentModel, recordToRemove, parentCollectionName);
  };

  const _removeRecord = (_model, record, collection = collectionName) => {
    const indexKeys = _getUniqueIndex(_model, record);
    const uniqueIndex = _getIndex(_model.collection, indexKeys, record);
    delete store[_model.collection][uniqueIndex];
    return record;
  };

  const _getUniqueIndex = (_model, data) => {
    const singleIndexKey = _model.getUniqueSingleIndexes();
    const combinedIndexKeys = _model.getUniqueCombinedIndexes();
    if (!isEmpty(singleIndexKey)) return singleIndexKey;
    if (!isEmpty(combinedIndexKeys)) return combinedIndexKeys;
    return _model.getPrimaryKey();
  };

  const _getIndex = (collection, indexKey, data) => {
    const indexCollection = `${collection}_indexes`;
    const uniqueIndexKey = indexKey.join('°U°');
    const uniqueIndexValue = values(pick(data, indexKey)).join('°U°');
    return get(store, [indexCollection, 'unique', uniqueIndexKey, uniqueIndexValue]);
  };

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  return {find, findOne, count, insert, update, upsert, remove};
};

module.exports = MemoryCrud;
