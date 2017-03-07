const OPERATORS = ['gt', 'gte', 'lt', 'lte', 'contains', 'ne'];
const BOOLEAN_OPERATORS = ['and', 'or'];
const NOT_EQUALS_OPERATOR = 'ne';
const {orderBy, isEmpty, toArray, filter, slice, isPlainObject, flattenDeep, uniq, get} = require('lodash');
const FilterByIndexes = require('./filter-by-indexes');

const MemoryFilter = (model, store) => {
  const filterQuery = (query) => {
    const {where, order, limit, skip} = query;
    let response = filter(_getDataStore(where), item => applyFilter(item, where));
    response = applyOrder(response, order);
    response = applySkip(response, skip);
    response = applyLimit(response, limit);

    return response;
  };

  const _getDataStore = query => {
    const filterByIndexes = FilterByIndexes(model, store);
    return filterByIndexes(query);
  };

  const applyFilter = (item, query = {}, booleanConditions) => {
    const properties = Object.keys(query);
    const fits = properties.reduce((res, prop) => queryMatchesItem(res, prop, item, query, booleanConditions), true);
    return fits;
  };

  const applyOrder = (item, order = {}) => {
    if (isEmpty(order)) return item;

    const fields = Object.keys(order);
    const orderDirection = toArray(order).map(direction => direction.toLowerCase());
    return orderBy(item, fields, orderDirection);
  };

  const applySkip = (item, skip) => {
    return slice(item, skip);
  };

  const applyLimit = (item, limit) => {
    return slice(item, null, limit);
  };

  const queryMatchesItem = (res, fieldOrOp, item, query, booleanConditions) => {
    if (hasBooleanOperators(query)) return res && meetsFilterWithBooleanOperators(item, query);
    if (hasOperators(query[fieldOrOp])) {
      if (hasNotEqualOperator(query[fieldOrOp])) {
        const valuesShouldNotBeEqual = getNotEqualValuesByFieldName(fieldOrOp, query, booleanConditions);
        return res && meetsFilterCriteria(item[fieldOrOp], Object.assign(query[fieldOrOp], { [NOT_EQUALS_OPERATOR]: valuesShouldNotBeEqual }));
      }
      return res && meetsFilterCriteria(item[fieldOrOp], query[fieldOrOp]);
    }
    if (isRegex(query[fieldOrOp])) return res && meetsRegexFilterCriteria(fieldOrOp, item, query[fieldOrOp]);
    if (isNested(fieldOrOp)) return res && meetsNestedFilterCriteria(fieldOrOp, item, query[fieldOrOp]);
    return res && equals(item[fieldOrOp], query[fieldOrOp]);
  };

  const hasBooleanOperators = criteria => criteriaContainsOperatorsWithin(criteria, BOOLEAN_OPERATORS);

  const hasOperators = criteria => criteriaContainsOperatorsWithin(criteria, OPERATORS);

  const hasNotEqualOperator = (criteria) => !!Object.keys(criteria).includes(NOT_EQUALS_OPERATOR);

  const getNotEqualValuesByFieldName = (fieldName, query, conditions = []) => {
    conditions = isEmpty(conditions) ? [query] : conditions;
    const notEqualsValues = conditions.reduce((ids, criteria) => {
      Object.keys(criteria).includes(fieldName)
        && hasNotEqualOperator(criteria[fieldName]) && ids.push(criteria[fieldName][NOT_EQUALS_OPERATOR]);
      return ids;
    }, []);

    return uniq(flattenDeep(notEqualsValues));
  };

  const isNested = criteria => criteria.includes('.');

  const isRegex = value => isPlainObject(value) && value.hasOwnProperty('regex');

  const criteriaContainsOperatorsWithin = (criteria, operators) => {
    return !!Object.keys(criteria || {})
      .filter(op => operators.includes(op)).length;
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

  const meetsRegexFilterCriteria = (field, item, val) => {
    const {regex, options} = val;
    const ignoreCase = options || '';
    const regexp = new RegExp(regex, ignoreCase);
    const value = get(item, field);
    return regexp.exec(value);
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

  const notEquals = (a, b) => !b.includes(a);

  const greaterThan = (a, b) => a > b;

  const greaterThanOrEqual = (a, b) => a >= b;

  const lessThan = (a, b) => a < b;

  const lessThanOrEqual = (a, b) => a <= b;

  const contains = (a, b) => a && a.includes(b);

  const applyOrOperator = (item, conditions) => {
    return conditions.reduce((res, condition) => {
      return res || applyFilter(item, condition, conditions);
    }, false);
  };

  const applyAndOperator = (item, conditions) => {
    return conditions.reduce((res, condition) => {
      return res && applyFilter(item, condition, conditions);
    }, true);
  };

  const operatorCompareSelector = {
    gt: greaterThan,
    gte: greaterThanOrEqual,
    lt: lessThan,
    lte: lessThanOrEqual,
    contains: contains,
    ne: notEquals
  };

  const booleanOperatorSelector = {
    or: applyOrOperator,
    and: applyAndOperator
  };

  return filterQuery;
};

module.exports = MemoryFilter;
