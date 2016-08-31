const {omit} = require('lodash');

const MongoTranspiler = model => {
  const {
    buildQueryConditions,
    buildCount,
    buildUpdate,
    buildRemove,
    buildUpsert,
    buildSelectWithFields
  } = require('./build-conditions')();

  const buildInsert = data => data;

  const select = (query = {}) => {
    if (model.isExtended()) return _extendedSelect(query);
    return buildQueryConditions(query);
  };

  const _extendedSelect = query => {
    const parent = buildSelectWithFields(query, _getParentFields()) || {};
    const extended = buildSelectWithFields(query, _getExtendedFields()) || {};
    console.log('el apa y el extendido');
    console.log({parent, extended});
    return {parent, extended};
  };

  const _getParentFields = () => {
    const fields = model.getSchemaFields();
    return fields;
  };

  const _getExtendedFields = () => {
    const fields = model.getExtendedModel().model.getSchemaFields();
    return fields;
  };

  const insert = (query = {}) => buildInsert(query);

  const count = (query = {}) => buildCount(query);

  // TODO: Fix that bullshit of the id and replace with primary key
  const update = (query = {}, data = {}) => buildUpdate(query, omit(data, 'id'));

  const remove = (query = {}) => buildRemove(query);

  const upsert = (data = {}, query = {}) => buildUpsert(query, data);

  return {select, insert, count, update, remove, upsert};
};

module.exports = MongoTranspiler;
