const MongoTranspiler = () => {
  const {buildQueryConditions} = require('./build-conditions')();
  const select = (query = {}) => buildQueryConditions(query);

  return {select};
};

module.exports = MongoTranspiler;
