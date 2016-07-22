const OPERATORS = ['gt', 'gte', 'lt', 'lte'];
const BOOLEAN_OPERATORS = ['and', 'or'];
const {orderBy, isEmpty, toArray, filter, slice} = require('lodash');

const MemoryFilter = (schema, store) => {
  const filterQuery = (query) => {
    const {where = {}, order = {}, limit} = query;
    const filtered = filter(store[schema.tableName], item => applyFilter(item, where));
    const ordered = applyOrder(filtered, order);
    return applyLimit(ordered, limit);
  };

  const applyFilter = (item, query) => {
    const properties = Object.keys(query);
    const fits = properties.reduce((res, prop) => queryMatchesItem(res, prop, item, query), true);
    return fits;
  };

  const applyOrder = (item, order) => {
    if (isEmpty(order)) return item;

    const fields = Object.keys(order);
    const orderDirection = toArray(order);
    return orderBy(item, fields, orderDirection);
  };

  const applyLimit = (item, limit) => {
    return slice(item, 0, limit);
  };

  const queryMatchesItem = (res, fieldOrOp, item, query) => {
    if (hasBooleanOperators(query)) return res && meetsFilterWithBooleanOperators(item, query);
    if (hasOperators(query[fieldOrOp])) return res && meetsFilterCriteria(item[fieldOrOp], query[fieldOrOp]);
    if (isNested(fieldOrOp)) return res && meetsNestedFilterCriteria(fieldOrOp, item, query[fieldOrOp]);
    return res && equals(item[fieldOrOp], query[fieldOrOp]);
  };

  const hasBooleanOperators = criteria => criteriaContainsOperatorsWithin(criteria, BOOLEAN_OPERATORS);

  const hasOperators = criteria => criteriaContainsOperatorsWithin(criteria, OPERATORS);

  const isNested = criteria => criteria.includes('.');

  const criteriaContainsOperatorsWithin = (criteria, operators) => {
    return !!Object.keys(criteria).filter(op => operators.includes(op)).length;
  };

  const meetsFilterCriteria = (val, criteria) => {
    const operators = Object.keys(criteria);
    const meets = operators.reduce((result, op) => {
      return result && meetsCriteria(op, val, criteria[op]);
    }, true);
    return meets;
  };

  const meetsFilterWithBooleanOperators = (item, query) => {
    const operators = Object.keys(query);
    return operators.reduce((res, op) => {
      const applyBooleanOperator = booleanOperatorSelector[op];
      return applyBooleanOperator(item, query[op]);
    }, true);
  };

  const meetsNestedFilterCriteria = (field, item, val) => {
    const nestedFields = getNestedFields(field);
    const inDepthValue = nestedFields.reduce(getDeepestValue, item);
    return equals(inDepthValue, val);
  };

  const meetsCriteria = (op, val, expected) => {
    const compare = operatorCompareSelector[op];
    return compare(val, expected);
  };

  const getNestedFields = (field) => field.split('.');

  const getDeepestValue = (acc, val) => acc = acc[val];

  const equals = (a, b) => a === b;

  const greaterThan = (a, b) => a > b;

  const greaterThanOrEqual = (a, b) => a >= b;

  const lessThan = (a, b) => a < b;

  const lessThanOrEqual = (a, b) => a <= b;

  const applyOrOperator = (item, conditions) => {
    return conditions.reduce((res, condition) => {
      return res || applyFilter(item, condition);
    }, false);
  };

  const applyAndOperator = (item, conditions) => {
    return conditions.reduce((res, condition) => {
      return res && applyFilter(item, condition);
    }, true);
  };

  const operatorCompareSelector = {
    gt: greaterThan,
    gte: greaterThanOrEqual,
    lt: lessThan,
    lte: lessThanOrEqual
  };

  const booleanOperatorSelector = {
    or: applyOrOperator,
    and: applyAndOperator
  };

  return filterQuery;
};

module.exports = MemoryFilter;
