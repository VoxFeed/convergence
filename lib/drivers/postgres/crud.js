const {reject, difference} = require('lodash');
const snakeobj = require('snakeobj');
const {BadInputError} = require('./../../errors');
const PostgresTranspiler = require('./transpiler');
const executeSql = require('./execute-sql');

const PostgresCrud = (driver, schema) => {
  const {pool} = driver.connection;
  const transpiler = PostgresTranspiler(schema);
  const {operators} = transpiler;

  const findOne = query => {
    const {where = {}} = snakeobj(query);
    return _validateFieldsAreInSchema(where)
      .then(() => _executeSelect(query));
  };

  const insert = (data = {}) => {
    const toSave = snakeobj(data);
    return _validateFieldsAreInSchema(toSave)
      .then(() => _executeInsert(toSave));
  };

  const update = (query, data) => {
    const {where = {}} = snakeobj(query);
    const toSave = snakeobj(data);
    return _validateFieldsAreInSchema(where)
      .then(() => _validateFieldsAreInSchema(toSave))
      .then(() => _executeUpdate(where, toSave));
  };

  const _validateFieldsAreInSchema = query => {
    const invalid = _getInvalidFields(query);
    if (invalid.length) return Promise.reject(BadInputError(`invalid fields sent: ${invalid}`));
    return Promise.resolve();
  };

  const _getInvalidFields = query => {
    const known = schema.getKnownFields(query);
    const unknown = difference(Object.keys(query), known);
    return _discardOperators(unknown);
  };

  const _discardOperators = fields => reject(fields, field => operators.includes(field));

  const _executeSelect = query => {
    const sql = transpiler.select(query);
    return executeSql(sql, pool);
  };

  const _executeInsert = data => {
    const sql = transpiler.insert(data);
    return executeSql(sql, pool);
  };

  const _executeUpdate = (query, data) => {
    const sql = transpiler.update(query, data);
    return executeSql(sql, pool);
  };

  return {findOne, insert, update};
};

module.exports = PostgresCrud;
