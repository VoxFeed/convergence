const {isEmpty, isPlainObject: isObject, reduce, clone} = require('lodash');

const OPERATORS = {
  'or': '$or',
  'and': '$and',
  'gte': '$gte',
  'gt': '$gt',
  'lt': '$lt',
  'lte': '$lte'
};

const OPERATOR_KEYS = Object.keys(OPERATORS);

module.exports = model => {
  const buildQueryConditions = query => {
    if (isEmpty(query)) return {query: {}, sort: {}};
    return composeQueryAndOrder(Object.assign({}, query));
  };

  const composeQueryAndOrder = query => {
    const transpiledWhere = replaceOperators(query.where);
    const transpiledOrder = replaceValues(query.order);
    return {
      query: transpiledWhere ? transpiledWhere : {},
      sort: transpiledOrder ? transpiledOrder : {}
    };
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

  const buildCount = query => {
    if (isEmpty(query)) return query;
    return replaceOperators(Object.assign({}, query.where));
  };

  const buildUpdate = (query, data) => {
    if (isEmpty(data)) return {};
    return composeQueryAndUpdate(Object.assign({}, query), Object.assign(data));
  };

  const composeQueryAndUpdate = ({where}, data) => {
    const transpiledWhere = replaceOperators(where);
    const transpiledUpdate = {$set: data};
    return {
      query: transpiledWhere ? transpiledWhere : {},
      update: transpiledUpdate ? transpiledUpdate : {},
      options: {multi: true}
    };
  };

  const buildRemove = query => {
    if (isEmpty(query)) return query;
    return replaceOperators(query.where);
  };

  const buildUpsert = (query, data) => {
    if (isEmpty(data)) return {};
    return composeQueryAndUpsert(Object.assign({}, query), Object.assign({}, data));
  };

  const composeQueryAndUpsert = ({where}, data) => {
    const transpiledWhere = replaceOperators(where);
    const transpiledUpdate = {$set: data};
    return {
      query: transpiledWhere ? transpiledWhere : {},
      update: transpiledUpdate ? transpiledUpdate : {},
      options: {upsert: true}
    };
  };

  const buildSelectWithFields = (query, fields) => {
    const transpiled = buildQueryConditions(clone(query));
    console.log(transpiled);
    transpiled.query = pickFields(clone(transpiled.query), fields.concat(OPERATOR_KEYS));
    console.log(transpiled);
    return transpiled;
  };

  const pickFields = (query, validFields) => {
    return Object.keys(query).reduce((acum, field) => {
      return pickField(acum, query, field, validFields.concat(OPERATOR_KEYS));
    }, {});
  };

  const pickField = (res, query, field, validFields) => {
    if (validFields.includes(field)) return processValid(res, query, field, validFields);
    return res;
  };

  const processValid = (res, query, field, validFields) => {
    let mapped;
    if (Array.isArray(query[field])) {
      mapped = query[field].map(f => pickFields(f, validFields)).filter(obj => !isEmpty(obj));
    }
    return Object.assign({}, res, {[field]: mapped || query[field]});
  };

  return {
    buildQueryConditions, buildCount, buildUpdate,
    buildRemove, buildUpsert, buildSelectWithFields
  };
};
