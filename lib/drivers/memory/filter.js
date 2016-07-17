const OPERATORS = ['$gt', '$gte', '$lt', '$lte'];
const BOOLEAN_OPERATORS = ['$and', '$or'];

const MemoryFilter = (schema, store) => {
  const filter = query => store[schema.tableName].filter(item => applyFilter(item, query));

  const applyFilter = (item, query) => {
    const properties = Object.keys(query);
    const fits = properties.reduce((res, prop) => queryMatchesItem(res, prop, item, query), true);
    return fits;
  };

  const queryMatchesItem = (res, fieldOrOp, item, query) => {
    if (hasBooleanOperators(query)) return res && meetsFilterWithBooleanOperators(item, query);
    if (hasOperators(query[fieldOrOp])) return res && meetsFilterCriteria(item[fieldOrOp], query[fieldOrOp]);
    return res && equals(item[fieldOrOp], query[fieldOrOp]);
  };

  const hasBooleanOperators = criteria => criteriaContainsOperatorsWithin(criteria, BOOLEAN_OPERATORS);

  const hasOperators = criteria => criteriaContainsOperatorsWithin(criteria, OPERATORS);

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

  const meetsCriteria = (op, val, expected) => {
    const compare = operatorCompareSelector[op];
    return compare(val, expected);
  };

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
    '$gt': greaterThan,
    '$gte': greaterThanOrEqual,
    '$lt': lessThan,
    '$lte': lessThanOrEqual
  };

  const booleanOperatorSelector = {
    '$or': applyOrOperator,
    '$and': applyAndOperator
  };

  return filter;
};

module.exports = MemoryFilter;
