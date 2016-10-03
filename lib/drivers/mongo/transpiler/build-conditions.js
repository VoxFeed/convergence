const {isEmpty, isPlainObject: isObject, reduce, isUndefined} = require('lodash');

const OPERATORS = {
  'or': '$or',
  'and': '$and',
  'gte': '$gte',
  'gt': '$gt',
  'lt': '$lt',
  'lte': '$lte',
  'regex': '$regex'
};

module.exports = () => {
  const buildQueryConditions = query => {
    if (isEmpty(query)) return {query: {}, sort: {}};
    return composeConditions(Object.assign({}, query));
  };

  const composeConditions = query => {
    const transpiledWhere = replaceOperators(query.where);
    const transpiledOrder = replaceValues(query.order);
    const result = {
      query: transpiledWhere ? transpiledWhere : {},
      sort: transpiledOrder ? transpiledOrder : {}
    };
    return result;
  };

  const replaceOperators = cond => {
    return reduce(cond, replaceOperator, cond);
  };

  const replaceOperator = (acc, value, key) => {
    if (isRegex(value)) return generateRegexQuery(acc, value, key);
    if (isObject(value)) replaceOperators(value);
    return swapOperators(acc, value, key);
  };

  const swapOperators = (acc, value, key) => {
    if (OPERATORS[key]) swapOperator(acc, value, key);
    return acc;
  };

  const swapOperator = (acc, value, key) => {
    delete acc[key];
    Object.assign(acc, {[OPERATORS[key]]: value});
  };

  const isRegex = value => isObject(value) && value.hasOwnProperty('regex');

  const generateRegexQuery = (acc, val, key) => {
    const {regex, options} = val;
    const value = {$regex: `^${regex}`};
    if (!isUndefined(options)) {
      value['$options'] = options;
    }

    return {[key]: value};
  };

  const replaceValues = cond => {
    if (!isObject(cond)) return cond;
    return reduce(cond, replaceOrderValues, cond);
  };

  const replaceOrderValues = (acc, value, key) => {
    if (value === 'ASC') acc[key] = 1;
    else if (value === 'DESC') acc[key] = -1;
    return acc;
  };

  const buildCount = query => {
    if (isEmpty(query)) return {};
    return replaceOperators(query.where);
  };

  return {buildQueryConditions, buildCount};
};
