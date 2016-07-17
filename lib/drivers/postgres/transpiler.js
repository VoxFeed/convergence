const {flatten, isInteger, isNumber} = require('lodash');
const snakeize = require('./../../util/snakeize-properties');
const isDotNotation = require('./../../util/is-dot-notation');

const PostgresTranspiler = schema => {
  const transpile = query => {
    const sanitizedQuery = snakeize(query);
    const conds = buildConditions(sanitizedQuery);
    return `WHERE ${conds}`;
  };

  const buildConditions = query => {
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
    return `${jsonFieldName}=${value}`;
  };

  const buildConditionForRegularField = (field, query) => {
    const type = schema.getFieldType(field);
    const value = generateValueForCondition(type, query[field]);
    return `${field}=${value}`;
  };

  const isBooleanOperator = op => BOOLEAN_OPERATORS.includes(op);

  const isSubQuery = val => typeof val === 'object' && typeof val.getTime === 'undefined';

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
    return `${field} ${operator} ${value}`;
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
  const BOOLEAN_OPERATORS = ['$and', '$or'];
  const OPERATORS = {
    '$or': OR,
    '$and': AND,
    '$gt': '>',
    '$gte': '>=',
    '$lt': '<',
    '$lte': '<='
  };

  return transpile;
};

module.exports = PostgresTranspiler;
