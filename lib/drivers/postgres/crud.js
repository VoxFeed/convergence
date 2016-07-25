const {toPlainObject} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');
const PostgresTranspiler = require('./transpiler');
const executeSql = require('./execute-sql');

const PostgresCrud = (engine, schema) => {
  const transpiler = PostgresTranspiler(schema);
  const {pool} = engine.connection;

  const findOne = query => _find(query).then(respondSingle);

  const find = query => _find(query).then(respondMultiple);

  const _find = query => executeSelect(query);

  const count = query => {
    return executeCount(query)
      .then(respondSingle)
      .then(r => parseInt(r.count, 10));
  };

  const remove = query => executeRemove(query).then(respondMultiple);

  const insert = (data = {}) => executeInsert(snakeobj(data)).then(respondSingle);

  const update = (query, data) => executeUpdate(snakeobj(query), snakeobj(data)).then(respondSingle);

  const respondMultiple = rows => rows.map(row => respondSingle([row]));

  const respondSingle = rows => {
    const result = rows.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  const executeSelect = query => {
    const sql = transpiler.select(query);
    return executeSql(sql, pool);
  };

  const executeCount = query => {
    const sql = transpiler.count(query);
    return executeSql(sql, pool);
  };

  const executeRemove = query => {
    const sql = transpiler.remove(query);
    return executeSql(sql, pool);
  };

  const executeInsert = data => {
    const sql = transpiler.insert(data);
    return executeSql(sql, pool);
  };

  const executeUpdate = (query, data) => {
    const sql = transpiler.update(query, data);
    return executeSql(sql, pool);
  };

  return {findOne, find, count, insert, update, remove};
};

module.exports = PostgresCrud;
