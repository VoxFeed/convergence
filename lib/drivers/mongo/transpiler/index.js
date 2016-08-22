const MongoTranspiler = () => {
  const {buildQueryConditions, buildCount} = require('./build-conditions')();
  const {buildInsert} = require('./build-insert')();

  const select = (query = {}) => buildQueryConditions(query);

  const insert = query => buildInsert(query);

  const count = query => buildCount(query);

  return {select, insert, count};
};

module.exports = MongoTranspiler;
