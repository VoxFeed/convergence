const {first, pick, filter, isEmpty, get, values, omit} = require('lodash');
const uuid = require('uuid-v4');
const camelobj = require('camelobj');
const snakeobj = require('snakeobj');
const dotobj = require('dot-object').object;

const MemoryFilter = require('./filter');
const {CantUpsertRecordError, CantInsertRecordError} = require('./../../errors');

const indexSeparator = '°U°';

const MemoryCrud = (engine, model) => {
  const {store} = engine.connection;
  const memoryFilter = MemoryFilter(model, store);

  const parentModel = () => {
    return model.isExtended() ? model.getExtendedModel().model : {};
  };

  const parentCollectionName = () => {
    return model.isExtended() ? parentModel().collection : null;
  };

  const foreignKey = () => {
    return model.isExtended() ? model.getExtendedModel().foreignKey : '';
  };

  const parentPrimaryKey = () => {
    return model.isExtended() ? parentModel().getPrimaryKey() : '';
  };

  const collectionName = model.collection;

  const count = query => _find(query).then(records => records.length);

  const find = query => _find(query).then(_handleMultipleRecords);

  const findOne = query => _find(query).then(records => _handleSingleRecord(first(records)));

  const insert = (data = {}) => {
    return _insert(snakeobj(data))
      .then(_handleSingleRecord)
      .catch(_handleInsertError);
  };

  const _handleInsertError = err => {
    throw CantInsertRecordError(err.message);
  };

  const update = (query, data) => _update(query, snakeobj(data)).then(_handleResponse);

  const _update = (query, data) => {
    return _find(query)
      .then(records => records.map(record => _updateRecord(record, dotobj(data))));
  };

  const upsert = (data, query = {}) => _upsert(snakeobj(data), query).then(_handleResponse);

  const _upsert = (data, query) => {
    const indexKeys = _getUniqueIndex(model);
    query.where = Object.assign({}, query.where, pick(data, indexKeys));
    return _upsertRecord(query, data);
  };

  const _upsertRecord = (query, data) => {
    return _find(query)
      .then(records => {
        if (isEmpty(records)) return [_insert(data).catch(_handleUpsertError)];
        return records.map(record => _updateRecord(record, dotobj(data)));
      })
      .then(promises => Promise.all(promises));
  };

  const _handleUpsertError = err => {
    throw CantUpsertRecordError(err.message);
  };

  const _updateRecord = (record, data) => {
    const updated_at = new Date();
    const dataToUpdate = Object.assign({updated_at}, omit(data, [model.getPrimaryKey(), parentPrimaryKey()]));
    return model.isExtended() ? _updateComposeRecord(record, dataToUpdate) : Object.assign(record, dataToUpdate);
  };

  const _updateComposeRecord = (record, data) => {
    const childRecord = _updateChild(record, data);
    const parentRecord = _updateParent(record, data);
    return Object.assign({}, childRecord, parentRecord);
  };

  const _updateChild = (record, data) => {
    const query = { [foreignKey()]: record[foreignKey()] };
    const child = filter(values(store[collectionName]), query)[0];
    const fields = model.getOwnFields(data);
    return Object.assign(child, pick(data, fields));
  };

  const _updateParent = (record, data) => {
    const query = {id: record[foreignKey()]};
    const parent = filter(values(store[parentCollectionName()]), query)[0];
    const fields = parentModel().getOwnFields(data);
    return Object.assign(parent, pick(data, fields));
  };

  const _insert = data => {
    const now = new Date();
    const dataToSave = Object.assign({created_at: now, updated_at: now}, data);
    return _validateRequiredFields(dataToSave, model)
      .then(() => {
        if (!model.isExtended()) return _insertRecord(dataToSave);
        const parent = _insertParent(dataToSave);
        const child = _insertChild(dataToSave, parent);
        return Object.assign({}, parent, child);
      });
  };

  const _validateRequiredFields = (data, _model) => {
    const required = _model.getRequiredFields();
    const invalid = Object.keys(pick(data, required)).length !== required.length;
    if (invalid) return Promise.reject(new Error('missing required fields'));
    return Promise.resolve();
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
    const parentData = pick(data, parentModel().getOwnFields(data));
    _insertOnStore(parentData, parentModel());
    return parentData;
  };

  const _insertOnStore = (record, _model) => {
    const index = uuid();
    const primaryKey = _model.getPrimaryKey();
    const indexName = `${_model.collection}_indexes`;

    if (!store.hasOwnProperty(_model.collection)) _loadCollection(_model);

    store[_model.collection][index] = record;
    _setPrimaryIndexValue({indexName, indexValue: record[primaryKey]}, index);
    _insertUniqueIndex(record, _model, index);
  };

  const _insertUniqueIndex = (record, _model, index) => {
    const indexName = `${_model.collection}_indexes`;
    let indexKey = _getUniqueIndexKeys(_model);
    const indexValue = values(pick(record, indexKey)).join(indexSeparator);

    indexKey = indexKey.join(indexSeparator);
    _setUniqueIndexValue({indexName, indexKey, indexValue}, index);
  };

  const _getUniqueIndexKeys = (_model) => {
    const singleIndexKey = _model.getUniqueSingleIndexes();
    const combinedIndexKeys = _model.getUniqueCombinedIndexes();
    if (!isEmpty(singleIndexKey)) return singleIndexKey;
    return combinedIndexKeys;
  };

  const _setIndexValue = (indexParams, index) => {
    const setIndexValue = indexParams.indexType === 'primary' ? _setPrimaryIndexValue : _setUniqueIndexValue;
    setIndexValue(indexParams, index);
  };

  const _setPrimaryIndexValue = ({indexName, indexValue}, index) => {
    store[indexName].primary[indexValue] = index;
  };

  const _setUniqueIndexValue = ({indexName, indexKey, indexValue}, index) => {
    store[indexName].unique[indexKey][indexValue] = index;
  };

  const _loadCollection = _model => {
    store[_model.collection] = {};
    _loadIndexCollection(_model);
  };

  const _loadIndexCollection = _model => {
    const indexName = `${_model.collection}_indexes`;
    let indexFields = _model.getUniqueSingleIndexes();
    if (isEmpty(indexFields)) {
      indexFields = _model.getUniqueCombinedIndexes();
    }
    store[indexName] = { primary: {}, unique: {}};
    store[indexName].unique[indexFields.join(indexSeparator)] = {};
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
    const query = {[foreignKey()]: record.id};
    const recordToRemove = filter(store[collectionName], query)[0];
    _removeRecord(model, recordToRemove, collectionName);
  };

  const _removeParent = record => {
    const query = {id: record.id};
    const recordToRemove = filter(store[parentCollectionName()], query)[0];
    _removeRecord(parentModel(), recordToRemove, parentCollectionName());
  };

  const _removeRecord = (_model, record, collection = collectionName) => {
    const indexKeys = _getUniqueIndex(_model);
    const uniqueIndex = _getIndex(_model.collection, indexKeys, record);
    delete store[_model.collection][uniqueIndex];
    return record;
  };

  const _getUniqueIndex = (_model) => {
    const uniqueIndex = _getUniqueIndexKeys(_model);
    if (!isEmpty(uniqueIndex)) return uniqueIndex;
    return _model.getPrimaryKey();
  };

  const _getIndex = (collection, indexKey, data) => {
    const indexCollection = `${collection}_indexes`;
    const uniqueIndexKey = indexKey.join(indexSeparator);
    const uniqueIndexValue = values(pick(data, indexKey)).join(indexSeparator);
    return get(store, [indexCollection, 'unique', uniqueIndexKey, uniqueIndexValue]);
  };

  const _handleMultipleRecords = records => records.map(record => camelobj(record));

  const setPrimaryKey = (key) => {
    _setDefaultIndex('primary', [key]);
  };

  const setSingleUnique = (keys) => {
    keys.forEach(key => {
      _setDefaultIndex('unique', [key]);
    });
  };

  const setCombinedUnique = (keys) => {
    if (isEmpty(keys)) return;
    _setDefaultIndex('unique', keys);
  };

  const _setDefaultIndex = (indexType, keys) => {
    const collectionIndexes = `${model.collection}_indexes`;
    const indexKey = keys.join(indexSeparator);
    if (isEmpty(store[collectionName])) return _setEmptyIndexes(indexKey, indexType);

    Object.keys(store[collectionName]).forEach(_loadIndexes(collectionIndexes, keys, indexType));
  };

  const _setEmptyIndexes = (key, type) => {
    const collectionIndexName = `${model.collection}_indexes`;
    if(!store[collectionIndexName]) {
      _loadCollection(model);
    }
    store[collectionIndexName][type][key] = {};
  };

  const _loadIndexes = (collectionIndexes, keys, indexType) => {
    const indexKey = keys.join(indexSeparator);

    if (!store[collectionIndexes]) {
      _loadIndexCollection(model);
    }

    return (index) => {
      const record = store[collectionName][index];
      const indexValue = values(pick(record, keys)).join(indexSeparator);

      if (!store[collectionIndexes][indexType][indexKey]) {
        store[collectionIndexes][indexType][indexKey] = {};
      }
      _setIndexValue({indexName: collectionIndexes, indexType, indexKey, indexValue}, index);
    };
  };

  return {
    find, findOne, count, insert, update, upsert, remove,
    setPrimaryKey, setSingleUnique, setCombinedUnique
  };
};

module.exports = MemoryCrud;
