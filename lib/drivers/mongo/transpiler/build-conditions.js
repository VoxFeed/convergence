const {isEmpty, isPlainObject: isObject, reduce} = require('lodash');

const OPERATORS = {
  'or': '$or',
  'and': '$and',
  'gte': '$gte',
  'gt': '$gt',
  'lt': '$lt',
  'lte': '$lte'
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

  const replaceValues = cond => {
    if (!isObject(cond)) return cond;
    return reduce(cond, replaceOrderValues, cond);
  };

  const replaceOrderValues = (acc, value, key) => {
    if (value === 'ASC') acc[key] = 1;
    else if (value === 'DESC') acc[key] = -1;
    return acc;
  };

  return { buildQueryConditions };
};
