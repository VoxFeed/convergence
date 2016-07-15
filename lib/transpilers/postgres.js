const {flatten, isBoolean, isDate, isNumber, isString} = require('lodash');

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

const transpile = query => {
  const conds = buildConditions(query);
  return `WHERE ${conds}`;
};

const buildConditions = query => {
  const fieldsOrOps = Object.keys(query);
  return fieldsOrOps.map(buildCondition(query)).join(AND);
};

const buildCondition = query => {
  return field => {
    if (isSubQuery(query[field])) return generateSubQuery(field, query[field]);
    const value = generateValueForCondition(query[field]);
    return `${field}=${value}`;
  };
};

const isOperator = op => Object.keys(OPERATORS).includes(op);

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

const generateValueForCondition = val => {
  if (isString(val)) return stringValue(val);
  if (isNumber(val)) return numberValue(val);
  if (isDate(val)) return dateValue(val);
  if (isBoolean(val)) return booleanValue(val);
};

const buildConditionsWithOperator = (field, op, val) => {
  const value = generateValueForCondition(val);
  const operator = parseOperator(op);
  return `${field} ${operator} ${value}`;
};

const parseOperator = op => OPERATORS[op];

const stringValue = val => `'${val}'`;

const numberValue = val => keepAsIs(val);

const dateValue = val => stringValue(val.toISOString());

const booleanValue = val => keepAsIs(val);

const keepAsIs = val => val;

module.exports = transpile;
