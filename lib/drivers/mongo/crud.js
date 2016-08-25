const {toPlainObject} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const MongoTranspiler = require('./transpiler');
const buildMongoExecute = require('./build-mongo-execute');
const {CantInsertRecordError} = require('./../../errors');

const MongoCrud = (engine, model) => {
  const transpiler = MongoTranspiler();
  const collection = model.collection;

  const count = query => {
    return _executeCount(query);
  };

  const find = query => _find(query).then(_respondCamelized);

  const findOne = query => _findOne(query).then(_respondCamelized);

  const remove = query => _executeRemove(query).then(_respondCamelized);

  const update = (query, data) => {
    return _executeUpdate(snakeobj(query), snakeobj(data))
       .then(_respondCamelized);
  };

  const insert = (data = {}) => {
    return _executeInsert(snakeobj(data))
      .then(_respondInsert)
      .catch(_handleInsertError);
  };

  const setPrimaryKey = () => {};

  const setSingleUnique = () => {};

  const setCombinedUnique = () => {};

  const _executeCount = query => {
    const mongoQuery = transpiler.count(query);
    return buildMongoExecute(mongoQuery)
           .then(({count}) => count(collection));
  };

  const _find = query => {
    const mongoQuery = transpiler.select(query);
    return buildMongoExecute(mongoQuery)
          .then(({find}) => find(collection));
  };

  const _findOne = query => {
    const mongoQuery = transpiler.select(query);
    return buildMongoExecute(mongoQuery)
          .then(({findOne}) => findOne(collection));
  };

  const _respondCamelized = result => camelobj(result);

  const _handleInsertError = err => {
    throw CantInsertRecordError(err.message);
  };

  const _executeInsert = data => {
    const mongoQuery = transpiler.insert(data);
    return buildMongoExecute(mongoQuery)
       .then(({insert}) => insert(collection));
  };

  const _executeRemove = query => {
    const mongoQuery = transpiler.remove(query);
    return buildMongoExecute(mongoQuery)
           .then(({remove}) => remove(collection));
  };

  const _executeUpdate = (query, data) => {
    const mongoQuery = transpiler.update(query, data);
    return buildMongoExecute(mongoQuery)
       .then(({update}) => update(collection));
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
