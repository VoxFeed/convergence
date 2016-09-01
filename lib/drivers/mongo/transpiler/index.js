const {omit, clone} = require('lodash');
const snakeobj = require('snakeobj');

const MongoTranspiler = model => {
  const {
    buildQueryConditions,
    buildCount,
    buildUpdate,
    buildRemove,
    buildUpsert,
    buildSelectWithFields,
    buildUpdateWithFields
  } = require('./build-conditions')();

  const buildInsert = data => data;

  const select = (query = {}) => {
    if (model.isExtended()) return _extendedSelect(query);
    return buildQueryConditions(prepare(query));
  };

  const prepare = query => clone(snakeobj(query));

  const insert = (query = {}) => buildInsert(query);

  const count = (query = {}) => buildCount(query);

  const update = (query = {}, data = {}) => {
    if (model.isExtended()) return _extendedUpdate(query, data);
    return buildUpdate(query, omit(data, _getPrimaryKey()));
  };

  const remove = (query = {}) => buildRemove(query);

  const upsert = (data = {}, query = {}) => buildUpsert(query, data);

  const _getParentFields = () => model.getSchemaFields();

  const _getExtendedFields = () => model.getExtendedModel().model.getSchemaFields();

  const _getPrimaryKey = () => model.getPrimaryKey();

  const _extendedSelect = query => {
    const parent = buildSelectWithFields(prepare(query), _getParentFields());
    const extended = buildSelectWithFields(prepare(query), _getExtendedFields());
    return {parent, extended};
  };

  const _extendedUpdate = (query, data) => {
    console.log('\noriginal query', query);
    const parent = buildUpdateWithFields(prepare(query), snakeobj(data), _getParentFields());
    const extended = buildUpdateWithFields(prepare(query), snakeobj(data), _getExtendedFields());
    console.log('apa e extendio');
    console.log(parent, extended);
    return {parent, extended};
  };

  return {select, insert, count, update, remove, upsert};
};

module.exports = MongoTranspiler;
