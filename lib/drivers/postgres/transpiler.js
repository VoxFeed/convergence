const {first, flatten, isInteger, isNumber, omit} = require('lodash');
const snakeobj = require('snakeobj');
const isDotNotation = require('./../../util/is-dot-notation');
const dotobj = require('dot-object').object;

const PostgresTranspiler = schema => {
  const tableName = schema.collection;

  const count = query => {
    const {conditions} = _buildConditionsAndSorting(query);
    return `SELECT COUNT(*) FROM ${tableName}` + conditions;
  };

  const insert = data => _buildBasicInsertSQL(data) + ' RETURNING *';

  const remove = query => {
    const {conditions} = _buildConditionsAndSorting(query);
    return `DELETE FROM ${tableName}` + conditions + ' RETURNING *';
  };

  const select = (query = {}) => {
    const {conditions, sorting} = _buildConditionsAndSorting(query);
    return `SELECT * FROM ${tableName}` + conditions + sorting;
  };

  const update = (query = {}, data) => {
    if (!data) return '';
    const {where = null} = query;
    const sanitizedData = snakeobj(dotobj(Object.assign({}, data)));
    const conds = _buildQueryConditions(where);
    const setVals = _buildSetUpdateValues(sanitizedData);
    return `UPDATE ${tableName}` + setVals + conds + ' RETURNING *';
  };

  const upsert = (query, data) => {
    return _buildBasicInsertSQL(data) +
      _buildConflictCondition(query, data, schema.getUniqueIndexes()) +
      ' RETURNING *';
  };

  const _buildBasicInsertSQL = data => {
    const sanitizedData = snakeobj(data);
    const fields = Object.keys(sanitizedData);
    const vals = fields.map(field => _buildValue(field, sanitizedData));
    return `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${vals.join(', ')})`;
  };

  const _buildConflictCondition = ({where}, data, uniqueIndexes = []) => {
    if (!uniqueIndexes.length) return ' ON CONFLICT DO NOTHING';
    const conds = _buildQueryConditions(snakeobj(where));
    const values = _buildSetUpdateValues(omit(snakeobj(data), 'id'));
    return ` ON CONFLICT (${uniqueIndexes.join(', ')}) DO UPDATE` +
      values + conds;
  };

  const _buildConditionsAndSorting = query => {
    const {where = null, order = null} = snakeobj(query);
    return {
      conditions: _buildQueryConditions(where),
      sorting: _buildOrderConditions(order)
    };
  };

  const _buildQueryConditions = query => {
    const conds = query ? _buildConditions(query) : null;
    return conds ? ` WHERE ${conds}` : '';
  };

  const _buildOrderConditions = query => {
    const conds = query ? query.map(_orderCondition) : null;
    return conds ? ` ORDER BY ${conds.join(', ')}` : '';
  };

  const _orderCondition = order => {
    const field = first(Object.keys(order));
    const value = order[field];
    return `${field} ${value}`;
  };

  const _buildValue = (field, data) => {
    const type = schema.getFieldType(field);
    return generateValueForCondition(type, data[field]);
  };

  const _buildSetUpdateValues = data => {
    return ' SET ' + Object.keys(data).map(_buildUpdateFieldValue(data)).join(', ');
  };

  const _buildUpdateFieldValue = data => field => {
    const type = schema.getFieldType(field);
    const value = generateValueForCondition(type, data[field]);
    return `${field}=${value}`;
  };

  const _buildConditions = query => {
    const fieldsOrOps = Object.keys(query);
    return fieldsOrOps.map(buildCondition(query)).join(AND);
  };

  const buildCondition = query => {
    return field => {
      if (isSubQuery(query[field])) return generateSubQuery(field, query[field]);
      if (isDotNotation(field)) return buildConditionForDotNotation(field, query);
      return buildConditionForRegularField(field, query);
    };
  };

  const buildConditionForDotNotation = (field, query) => {
    const jsonFieldName = field.replace(/\.(\w+)/g, '->>\'$1\'');
    const value = `'${query[field]}'`;
    return `${tableName}.${jsonFieldName}=${value}`;
  };

  const buildConditionForRegularField = (field, query) => {
    const type = schema.getFieldType(field);
    const value = generateValueForCondition(type, query[field]);
    return `${tableName}.${field}=${value}`;
  };

  const isBooleanOperator = op => BOOLEAN_OPERATORS.includes(op);

  const isSubQuery = val => {
    return val && typeof val === 'object' && typeof val.getTime === 'undefined';
  };

  const generateSubQuery = (field, val) => {
    if (isBooleanOperator(field)) return buildSubqueryWithBooleanOperator(field, val);
    return buildSubqueryWithInternalOperators(field, val);
  };

  const buildSubqueryWithBooleanOperator = (op, fieldValues) => {
    const subquery = fieldValues.map(fv => Object.keys(fv).map(buildCondition(fv)));
    return flatten(subquery).join(parseOperator(op));
  };

  const buildSubqueryWithInternalOperators = (field, val) => {
    const subquery = Object.keys(val)
      .map(op => buildConditionsWithOperator(field, op, val[op]));
    return subquery.join(AND);
  };

  const generateValueForCondition = (type, val) => {
    const parseValue = _valueParserSelector[type];
    return parseValue(val);
  };

  const buildConditionsWithOperator = (field, op, val) => {
    const type = schema.getFieldType(field);
    const value = generateValueForCondition(type, val);
    const operator = parseOperator(op);
    return `${tableName}.${field} ${operator} ${value}`;
  };

  const parseOperator = op => OPERATORS[op];

  const _escapeForSql = value => value.replace(/'/g, "''");
  const _parseString = value => value ? `'${_escapeForSql(value.toString())}'` : 'null';
  const _parseBoolean = value => value ? 'true' : 'false';
  const _parseInteger = value => isInteger(value) ? value : 'null';
  const _parseDecimal = value => isNumber(value) ? value : 'null';
  const _parseJSON = value => `'${JSON.stringify(value)}'`;
  const _parseDate = value => `'${value.toISOString()}'`;

  const _valueParserSelector = {
    'string': _parseString,
    'text': _parseString,
    'integer': _parseInteger,
    'decimal': _parseDecimal,
    'boolean': _parseBoolean,
    'json': _parseJSON,
    'date': _parseDate
  };

  const AND = ' AND ';
  const OR = ' OR ';
  const BOOLEAN_OPERATORS = ['and', 'or'];
  const OPERATORS = {
    'or': OR,
    'and': AND,
    'gt': '>',
    'gte': '>=',
    'lt': '<',
    'lte': '<='
  };

  const funcs = {select, count, insert, upsert, update, remove};

  return Object.assign({}, funcs, {operators: Object.keys(OPERATORS)});
};

module.exports = PostgresTranspiler;
