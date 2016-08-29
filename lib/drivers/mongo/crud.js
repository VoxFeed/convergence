const {toPlainObject, pick, snakeCase, camelCase} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const MongoTranspiler = require('./transpiler');
const buildMongoExecute = require('./build-mongo-execute');
const {CantInsertRecordError} = require('./../../errors');

const MongoCrud = (engine, model) => {
  const transpiler = MongoTranspiler();
  const collection = model.collection;
  const {connection} = engine;

  const count = query => {
    const mongoQuery = transpiler.count(query);
    return buildMongoExecute(connection)
           .then(({count}) => count(mongoQuery, collection));
  };

  const find = query => {
    const mongoQuery = transpiler.select(query);
    return buildMongoExecute(connection)
      .then(({find}) => find(mongoQuery, collection))
      .then(_respondCamelized);
  };

  const findOne = query => {
    if (model.isExtended()) return _extendedFindOne(query);
    return _findOne(query);
  };

  const _findOne = query => {
    console.log('collection', collection);
    const mongoQuery = transpiler.select(query);
    return buildMongoExecute(connection)
      .then(({findOne}) => findOne(mongoQuery, collection))
      .then(_respondCamelized);
  };

  const _extendedFindOne = query => {
    const mongoQuery = transpiler.select(query);
    return buildMongoExecute(connection)
      .then(({findOne}) => {
        return {
          findOne,
          data: findOne(mongoQuery, collection)
        };
      })
      .then(({findOne, data}) => {
        const foreignKey = data[model.getExtendedModel().foreignKey];
        return findOne({where: {id: foreignKey}}, model.getExtendedModel().model.collection)
          .then((childData) => {
            const a = Object.assign({}, childData, data);
            return a;
          });
      })
      .then(_respondCamelized);
  };

  const remove = query => _executeRemove(query).then(_respondCamelized);

  const update = (query, data) => {
    return _executeUpdate(snakeobj(query), snakeobj(data))
       .then(_respondCamelized);
  };

  const insert = (data = {}) => {
    if (model.isExtended()) return _extendedInsert(data);
    return _executeInsert(snakeobj(data))
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
    return _executeInsert(snakeobj(parentData), collection)
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
    return buildMongoExecute(connection)
       .then(({insert}) => insert(mongoQuery, collection));
  };

  const _executeRemove = query => {
    const mongoQuery = transpiler.remove(query);
    return buildMongoExecute(connection)
           .then(({remove}) => remove(mongoQuery, collection));
  };

  const _executeUpdate = (query, data) => {
    const mongoQuery = transpiler.update(query, data);
    return buildMongoExecute(connection)
       .then(({update}) => update(mongoQuery, collection));
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