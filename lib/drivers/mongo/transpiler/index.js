const {omit} = require('lodash');

const MongoTranspiler = () => {
  const {
    buildQueryConditions,
    buildCount,
    buildUpdate,
    buildRemove,
    buildUpsert
  } = require('./build-conditions')();

  const buildInsert = data => data;

  const select = (query = {}) => buildQueryConditions(query);

  const insert = (query = {}) => buildInsert(query);

  const count = (query = {}) => buildCount(query);

  const update = (query = {}, data = {}) => buildUpdate(query, omit(data, 'id'));

  const remove = (query = {}) => buildRemove(query);

  const upsert = (data = {}, query = {}) => buildUpsert(query, data);

  return {select, insert, count, update, remove, upsert};
};

module.exports = MongoTranspiler;
