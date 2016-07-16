const {snakeCase, toPlainObject, isPlainObject, isArray} = require('lodash');
const isDotNotation = require('./is-dot-notation');
const OPERATORS = ['$or', '$and', '$gt', '$gte', '$lt', '$lte'];

const isOperator = op => OPERATORS.includes(op);
const shouldChange = val => !isOperator(val) && !isDotNotation(val);

const snakeize = (toTransform) => {
  const data = toPlainObject(toTransform);
  return Object.keys(data).reduce((result, key) => {
    const newKey = shouldChange(key) ? snakeCase(key) : key;
    if (isPlainObject(data[key])) {
      result[newKey] = snakeize(data[key]);
    } else if (isArray(data[key])) {
      result[newKey] = data[key].map(snakeize);
    } else {
      result[newKey] = data[key];
    }
    return result;
  }, {});
};
module.exports = snakeize;
