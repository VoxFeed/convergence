const {toPlainObject} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');
const PostgresTranspiler = require('./transpiler');
const executeSql = require('./execute-sql');

const PostgresCrud = (engine, schema) => {
  const transpiler = PostgresTranspiler(schema);
  const {pool} = engine.connection;

  const count = query => {
    return _executeCount(query)
    .then(_respondSingle)
    .then(r => parseInt(r.count, 10));
  };

  const _executeCount = query => {
    const sql = transpiler.count(query);
    return executeSql(sql, pool);
  };

  const find = query => _find(query).then(_respondMultiple);

  const findOne = query => _find(query).then(_respondSingle);

  const _find = query => _executeSelect(query);

  const _executeSelect = query => {
    const sql = transpiler.select(query);
    return executeSql(sql, pool);
  };

  const insert = (data = {}) => _executeInsert(snakeobj(data)).then(_respondSingle);

  const _executeInsert = data => {
    const sql = transpiler.insert(data);
    return executeSql(sql, pool);
  };

  const remove = query => _executeRemove(query).then(_respondMultiple);

  const _executeRemove = query => {
    const sql = transpiler.remove(query);
    return executeSql(sql, pool);
  };

  const _respondMultiple = rows => rows.map(row => _respondSingle([row]));

  const update = (query, data) => _executeUpdate(snakeobj(query), snakeobj(data)).then(_respondSingle);

  const _executeUpdate = (query, data) => {
    const sql = transpiler.update(query, data);
    return executeSql(sql, pool);
  };

  const upsert = (data, where) => {
    return _executeUpsert(snakeobj(data)).then(_respondSingle);
  };

  const _executeUpsert = (query, data) => {
    const sql = transpiler.upsert(query, data);
    return executeSql(sql, pool);
  };

  const _respondSingle = rows => {
    const result = rows.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  return {findOne, find, count, insert, update, upsert, remove};
};

module.exports = PostgresCrud;
