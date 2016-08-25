const {toPlainObject, isPlainObject} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const MongoTranspiler = require('./transpiler');
const buildMongoExecute = require('./build-mongo-execute');
const {CantUpsertRecordError, CantInsertRecordError} = require('./../../errors');

const MongoCrud = (engine, model) => {
  const transpiler = MongoTranspiler();
  const collection = model.collection;

  const count = query => {
    return _executeCount(query);
  };

  const _executeCount = query => {
    const mongoQuery = transpiler.count(query);
    return buildMongoExecute(mongoQuery)
           .then(({count}) => count(collection));
  };

  const find = query => _find(query).then(_respondFind);

  const findOne = query => _findOne(query).then(_respondFindOne);

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

  const _respondFindOne = result => camelobj(result);

  const _respondFind = data => camelobj(data);

  const insert = (data = {}) => {
    return _executeInsert(snakeobj(data))
      .then(_respondSingle)
      .catch(_handleInsertError);
  };

  const _handleInsertError = err => {
    throw CantInsertRecordError(err.message);
  };

  const _executeInsert = data => {
    const mongoQuery = transpiler.insert(data);
    return buildMongoExecute(mongoQuery)
             .then(({insert}) => insert(collection));
  };

  const remove = query => _executeRemove(query).then(_respondMultiple);

  const _executeRemove = query => {
    const mongoQuery = transpiler.remove(query);
    return buildMongoExecute(mongoQuery);
  };

  const _respondMultiple = rows => rows.map(row => _respondSingle([row]));

  const update = (query, data) => {
    return _executeUpdate(snakeobj(query), snakeobj(data))
      .then(_respondUpdate);
  };

  const _respondUpdate = data => camelobj(data);

  const _executeUpdate = (query, data) => {
    const mongoQuery = transpiler.update(query, data);
    return buildMongoExecute(mongoQuery)
           .then(({update}) => update(collection));
  };

  const _respondSingle = rows => {
    const result = rows.ops.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  const setPrimaryKey = () => {};

  const setSingleUnique = () => {};

  const setCombinedUnique = () => {};

  return {
    findOne, find, count, insert, update, remove,
    setPrimaryKey, setSingleUnique, setCombinedUnique
  };
};

module.exports = MongoCrud;
