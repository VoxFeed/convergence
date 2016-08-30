const {toPlainObject, pick, snakeCase, camelCase} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const MongoTranspiler = require('./transpiler');
const buildMongoOps = require('./build-mongo-execute');
const {CantInsertRecordError} = require('./../../errors');

const MongoCrud = (engine, model) => {
  const transpiler = MongoTranspiler();
  const {connection} = engine;
  const mongoOps = buildMongoOps(connection);

  const insertOp = mongoOps.insert;
  const findOneOp = mongoOps.findOne;
  const findOp = mongoOps.find;
  const updateOp = mongoOps.update;
  const removeOp = mongoOps.remove;
  const countOp = mongoOps.count;

  const getCollection = () => model.collection;

  const count = query => {
    const mongoQuery = transpiler.count(query);
    return countOp(mongoQuery, getCollection());
  };

  const find = query => {
    const mongoQuery = transpiler.select(query);
    return findOp(mongoQuery, getCollection())
      .then(_respondCamelized);
  };

  const findOne = query => {
    if (model.isExtended()) return _extendedFindOne(query);
    return _findOne(query);
  };

  const _findOne = query => {
    const mongoQuery = transpiler.select(query);
    return findOneOp(mongoQuery, getCollection())
      .then(_respondCamelized);
  };

  const _extendedFindOne = query => {
    const mongoQuery = transpiler.select(query);
    return findOneOp(mongoQuery, getCollection());
  };

  const remove = query => _executeRemove(query).then(_respondCamelized);

  const update = (query, data) => {
    return _executeUpdate(snakeobj(query), snakeobj(data))
       .then(_respondCamelized);
  };

  const insert = (data = {}) => {
    if (model.isExtended()) return _extendedInsert(data);
    return _executeInsert(snakeobj(data), getCollection())
      .then(_respondInsert)
      .catch(_handleInsertError);
  };

  const _extendedInsert = data => {
    return _insertToParent(data)
      .then(() => _insertToChild(data))
      .then(() => data)
      .catch(_handleInsertError);
  };

  const _insertToParent = data => {
    const {foreignKey} = model.getExtendedModel();
    const parentData = pick(data, model.getOwnFields(data), snakeCase(foreignKey), camelCase(foreignKey));
    return _executeInsert(snakeobj(parentData), getCollection())
      .then(inserted => inserted);
  };

  const _insertToChild = data => {
    const extended = model.getExtendedModel().model;
    const childData = pick(data, extended.getOwnFields(data));
    return _executeInsert(snakeobj(childData), extended.collection)
      .then(inserted => inserted);
  };

  const setPrimaryKey = () => {};

  const setSingleUnique = () => {};

  const setCombinedUnique = () => {};

  const _respondCamelized = result => camelobj(result);

  const _handleInsertError = err => {
    throw CantInsertRecordError(err.message);
  };

  const _executeInsert = (data, collection) => {
    const mongoQuery = transpiler.insert(data);
    return insertOp(mongoQuery, collection);
  };

  const _executeRemove = query => {
    const mongoQuery = transpiler.remove(query);
    return removeOp(mongoQuery, getCollection());
  };

  const _executeUpdate = (query, data) => {
    const mongoQuery = transpiler.update(query, data);
    return updateOp(mongoQuery, getCollection());
  };

  const _respondInsert = rows => {
    const result = rows.ops.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  return {
    findOne, find, count, insert, update, remove,
    setPrimaryKey, setSingleUnique, setCombinedUnique
  };
};

module.exports = MongoCrud;
