const MongoTranspiler = () => {
  const {buildQueryConditions, buildCount, buildUpdate, buildRemove} = require('./build-conditions')();
  const buildInsert = data => data;

  const select = (query = {}) => buildQueryConditions(query);

  const insert = (query = {}) => buildInsert(query);

  const count = (query = {}) => buildCount(query);

  const update = (query = {}, data) => buildUpdate(query, data);

  const remove = (query = {}) => buildRemove(query);

  return {select, insert, count, update, remove};
};

module.exports = MongoTranspiler;
