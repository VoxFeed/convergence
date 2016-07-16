const snakeCase = require('lodash/snakeCase');
const toPlainObject = require('lodash/toPlainObject');
const isPlainObject = require('lodash/isPlainObject');
const isArray = require('lodash/isArray');
const OPERATORS = ['$or', '$and', '$gt', '$gte', '$lt', '$lte'];

const isOperator = op => OPERATORS.includes(op);

const snakeize = (toTransform) => {
  const data = toPlainObject(toTransform);
  return Object.keys(data).reduce((result, key) => {
    const newKey = isOperator(key) ? key : snakeCase(key);
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
