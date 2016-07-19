const camelCase = require('lodash/camelCase');
const toPlainObject = require('lodash/toPlainObject');

module.exports = (toTransform) => {
  const data = toPlainObject(toTransform);
  return Object.keys(data).reduce((result, key) => {
    result[camelCase(key)] = data[key];
    return result;
  }, {});
};
