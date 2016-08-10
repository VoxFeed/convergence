const {toPlainObject, isPlainObject} = require('lodash');
const snakeobj = require('snakeobj');
const camelobj = require('camelobj');

const PostgresTranspiler = require('./transpiler');
const executeSql = require('./execute-sql');
const {CantUpsertRecordError, CantInsertRecordError} = require('./../../errors');

const PostgresCrud = (engine, model) => {
  const transpiler = PostgresTranspiler(model);
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
    return executeSql(sql, pool).then(res => res.map(_parseResponse));
  };

  const _parseResponse = data => {
    return Object.keys(data || {}).reduce((result, field) => {
      result[field] = _parseValue(model.getFieldType(field), data[field]);
      return result;
    }, {});
  };

  const insert = (data = {}) => {
    return _executeInsert(snakeobj(data))
      .then(_respondSingle)
      .catch(_handleInsertError);
  };

  const _handleInsertError = err => {
    throw CantInsertRecordError(err.message);
  };

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

  const update = (query, data) => {
    return _executeUpdate(snakeobj(query), snakeobj(data))
      .then(_respondSingle)
      .then(_parseResponse);
  };

  const _executeUpdate = (query, data) => {
    const sql = transpiler.update(query, data);
    return executeSql(sql, pool);
  };

  const upsert = (data, query) => {
    return _executeUpsert(snakeobj(data), snakeobj(query))
      .then(_respondSingle)
      .then(_parseResponse)
      .catch(_handleUpsertError);
  };

  const _executeUpsert = (data, query) => {
    const sql = transpiler.upsert(data, query);
    return executeSql(sql, pool);
  };

  const _handleUpsertError = err => {
    throw CantUpsertRecordError(err.message);
  };

  const _parseValue = (type, val) => {
    const parse = _parserSelector[type];
    return parse ? parse(val) : val;
  };

  const _parseInteger = val => val ? parseInt(val.toString(), 10) : val;

  const _parseDecimal = val => val ? parseFloat(val.toString()) : val;

  const _parseJSON = val => isPlainObject(val) ? val : JSON.parse(val);

  const _parserSelector = {
    'integer': _parseInteger,
    'decimal': _parseDecimal,
    'json': _parseJSON
  };

  const _respondSingle = rows => {
    const result = rows.pop();
    return result ? camelobj(toPlainObject(result)) : result;
  };

  const setPrimaryKey = () => {};

  const setSingleUnique = () => {};

  const setCombinedUnique = () => {};

  return {
    findOne, find, count, insert, update, upsert, remove,
    setPrimaryKey, setSingleUnique, setCombinedUnique
  };
};

module.exports = PostgresCrud;
