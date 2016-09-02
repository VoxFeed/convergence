const {toPlainObject, pick, clone, snakeCase} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const MongoTranspiler = require('./transpiler');
const buildMongoOps = require('./build-mongo-operations');
const {CantInsertRecordError} = require('./../../errors');

const MongoCrud = (engine, model) => {
  const transpiler = MongoTranspiler(model);
  const {connection} = engine;
  const mongoOps = buildMongoOps(connection);

  const insertOp = mongoOps.insert;
  const findOneOp = mongoOps.findOne;
  const findOp = mongoOps.find;
  const findExtendedOp = mongoOps.findExtended;
  const updateOp = mongoOps.update;
  const upsertOp = mongoOps.upsert;
  const removeOp = mongoOps.remove;
  const removeExtendedOp = mongoOps.removeExtended;
  const countOp = mongoOps.count;

  const count = query => {
    const mongoQuery = transpiler.count(query);
    return countOp(mongoQuery, _getCollection());
  };

  const find = query => {
    if (model.isExtended()) return _extendedFind(query);
    return _find(query);
  };

  const findOne = query => {
    if (model.isExtended()) return _extendedFindOne(query);
    return _findOne(query);
  };

  const remove = query => {
    if (model.isExtended()) return _extendedRemove(query);
    return _executeRemove(query)
      .then(_respondCamelized);
  };

  const update = (query, data) => {
    if (model.isExtended()) return _extendedUpdate(snakeobj(query), snakeobj(data));
    return _executeUpdate(snakeobj(query), snakeobj(data))
       .then(_respondCamelized);
  };

  const upsert = (data, query) => {
    return _executeUpsert(snakeobj(query), snakeobj(data))
      .then(_respondCamelized);
  };

  const insert = (data = {}) => {
    if (model.isExtended()) return _extendedInsert(snakeobj(data));
    return _executeInsert(snakeobj(data), _getCollection())
      .then(_respondInsert)
      .catch(_handleInsertError);
  };

  const _find = query => {
    const mongoQuery = transpiler.select(query);
    return findOp(mongoQuery, _getCollection())
      .then(_respondCamelized);
  };

  const _extendedFind = query => {
    const {extended, parent} = transpiler.select(query);
    const extendedCol = _getExtendedCollection();
    const parentCol = _getCollection();
    // Cancer
    return findExtendedOp(extended, parent, extendedCol, parentCol, _extendQueryFromData)
      .then(_respondMultipleCamelized);
  };

  const _extendQueryFromData = (query, data) => {
    const primaryKey = _getPrimaryKey();
    const foreignKey = _getForeignKey();
    const foreignKeyValue = data[primaryKey];
    const queryExtender = {[foreignKey]: foreignKeyValue};
    return Object.assign({}, query, queryExtender);
  };

  const _findOne = query => {
    const mongoQuery = transpiler.select(query);
    return findOneOp(mongoQuery, _getCollection())
      .then(_respondCamelized);
  };

  const _extendedFindOne = query => {
    const {parent, extended} = transpiler.select(query);
    return findOneOp(extended, _getExtendedCollection())
      .then(_findOneParent(parent))
      .then(_respondCamelized);
  };

  const _findOneParent = parentQuery => data => {
    const primaryKey = _getPrimaryKey();
    const foreignKeyValue = data[primaryKey];
    const query = _setForeignKeyToQuery(clone(parentQuery), foreignKeyValue);
    return findOneOp(query, _getCollection())
      .then(childData => Object.assign({}, childData, data));
  };

  const _extendedRemove = query => {
    const {parent, extended} = transpiler.select(query);
    return removeExtendedOp(extended, _getExtendedCollection())
      .then(_removeParent(parent))
      .then(_respondCamelized);
  };

  const _removeParent = parentQuery => data => {
    const primaryKey = _getPrimaryKey();
    const foreignKeyValue = data[primaryKey];
    const query = _setForeignKeyToQuery(clone(parentQuery), foreignKeyValue);
    return removeExtendedOp(query, _getCollection())
      .then(childData => Object.assign({}, childData, data));
  };

  const _extendedUpdate = (query, data) => {
    const {parent, extended} = transpiler.update(query, data);
    return updateOp(extended, _getExtendedCollection())
      .then(_updateParent(parent))
      .then(_respondCamelized);
  };

  const _updateParent = parentQuery => parentData => {
    const primaryKey = _getPrimaryKey();
    const foreignKeyValue = parentData[primaryKey];
    const query = _setForeignKeyToQuery(clone(parentQuery), foreignKeyValue);
    return updateOp(query, _getCollection())
      .then(childData => Object.assign({}, childData, parentData));
  };

  const _extendedInsert = data => {
    return _insertToParent(data)
      .then(() => _insertToChild(data))
      .then(() => data)
      .catch(_handleInsertError);
  };

  const _insertToParent = data => {
    const {foreignKey} = model.getExtendedModel();
    const parentData = pick(data, model.getOwnFields(data), foreignKey);
    return _executeInsert(parentData, _getCollection())
      .then(inserted => inserted);
  };

  const _insertToChild = data => {
    const extendedModel = model.getExtendedModel().model;
    const childData = pick(data, extendedModel.getOwnFields(data));
    return _executeInsert(snakeobj(childData), extendedModel.collection)
      .then(inserted => inserted);
  };

  const _executeInsert = (data, collection) => {
    const mongoQuery = transpiler.insert(data);
    return insertOp(mongoQuery, collection);
  };

  const _executeRemove = query => {
    const mongoQuery = transpiler.remove(snakeobj(query));
    return removeOp(mongoQuery, _getCollection());
  };

  const _executeUpdate = (query, data) => {
    const mongoQuery = transpiler.update(query, data);
    return updateOp(mongoQuery, _getCollection());
  };

  const _executeUpsert = (query, data) => {
    const mongoQuery = transpiler.upsert(data, query);
    return upsertOp(mongoQuery, _getCollection());
  };

  const _respondInsert = rows => {
    const result = rows.ops.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  const _respondMultipleCamelized = records => {
    return records.map(_respondCamelized);
  };

  const _getCollection = () => model.collection;

  const _respondCamelized = result => camelobj(result);

  const _handleInsertError = err => {
    throw CantInsertRecordError(err);
  };

  const setPrimaryKey = () => {};

  const setSingleUnique = () => {};

  const setCombinedUnique = () => {};

  const _getPrimaryKey = () => snakeCase(model.getExtendedModel().model.getPrimaryKey());

  const _getForeignKey = () => model.getExtendedModel().foreignKey;

  const _setForeignKeyToQuery = (query, fk) => {
    query.query = Object.assign(query.query, {[_getForeignKey()]: fk});
    return query;
  };

  const _getExtendedCollection = () => {
    return model.getExtendedModel().model.collection;
  };

  return {
    findOne, find, count, insert, update, remove,
    setPrimaryKey, setSingleUnique, setCombinedUnique, upsert
  };
};

module.exports = MongoCrud;
