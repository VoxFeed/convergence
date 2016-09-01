const {omit, clone} = require('lodash');
const snakeobj = require('snakeobj');

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
    return buildQueryConditions(prepare(query));
  };

  const _extendedSelect = query => {
    const parent = buildSelectWithFields(prepare(query), _getParentFields());
    const extended = buildSelectWithFields(prepare(query), _getExtendedFields());
    return {parent, extended};
  };

  const prepare = query => clone(snakeobj(query));

  const _getParentFields = () => {
    const fields = model.getSchemaFields();
    return fields;
  };

  const _getExtendedFields = () => {
    const fields = model.getExtendedModel().model.getSchemaFields();
    return fields;
  };

  const _getPrimaryKey = () => model.getPrimaryKey();

  const insert = (query = {}) => buildInsert(query);

  const count = (query = {}) => buildCount(query);

  const update = (query = {}, data = {}) => {
    if (model.isExtended()) return _extendedUpdate(query, data);
    return buildUpdate(query, omit(data, _getPrimaryKey()));
  };

  const _extendedUpdate = (query, data) => {
    const parent = buildSelectWithFields(prepare(query), _getParentFields());
    const extended = buildSelectWithFields(prepare(query), _getExtendedFields());
    return {parent, extended};
  };

  const remove = (query = {}) => buildRemove(query);

  const upsert = (data = {}, query = {}) => buildUpsert(query, data);

  return {select, insert, count, update, remove, upsert};
};

module.exports = MongoTranspiler;
