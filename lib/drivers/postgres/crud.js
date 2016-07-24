const {reject, difference, toPlainObject} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const {BadInputError} = require('./../../errors');
const PostgresTranspiler = require('./transpiler');
const executeSql = require('./execute-sql');

const PostgresCrud = (engine, schema) => {
  const {pool} = engine.connection;
  const transpiler = PostgresTranspiler(schema);
  const {operators} = transpiler;

  const findOne = query => _find(query).then(respondSingle);

  const find = query => _find(query).then(respondMultiple);

  const _find = query => {
    return validateQueryWithSchema(snakeobj(query))
      .then(() => executeSelect(query));
  };

  const insert = (data = {}) => {
    const toSave = snakeobj(data);
    return validateFieldsAreInSchema(toSave)
      .then(() => executeInsert(toSave))
      .then(respondSingle);
  };

  const update = (query, data) => {
    const toSave = snakeobj(data);
    return validateQueryWithSchema(snakeobj(query))
      .then(() => validateFieldsAreInSchema(toSave))
      .then(() => executeUpdate(snakeobj(query), toSave))
      .then(respondSingle);
  };

  const validateFieldsAreInSchema = query => {
    const invalid = _getInvalidFields(query);
    if (invalid.length) return Promise.reject(BadInputError(`invalid fields sent: ${invalid}`));
    return Promise.resolve();
  };

  const validateQueryWithSchema = ({where}) => {
    if (!where) {
      return Promise.reject(BadInputError('missing "where" keyword in query'));
    }
    return validateFieldsAreInSchema(where);
  };

  const _getInvalidFields = query => {
    const known = schema.getKnownFields(query);
    const unknown = difference(Object.keys(query), known);
    return discardOperators(unknown);
  };

  const respondMultiple = rows => rows.map(row => respondSingle([row]));

  const respondSingle = rows => {
    const result = rows.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  const discardOperators = fields => reject(fields, field => operators.includes(field));

  const executeSelect = query => {
    const sql = transpiler.select(query);
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

  return {findOne, find, insert, update};
};

module.exports = PostgresCrud;
