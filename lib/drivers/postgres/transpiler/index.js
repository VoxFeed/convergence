const {isEmpty, first, omit} = require('lodash');
const snakeobj = require('snakeobj');
const dotobj = require('dot-object').object;

const buildBasicInsertSQL = require('./build-basic-insert');
const buildUpsert = require('./upsert');
const buildSelect = require('./select');

const ID_REPLACER = '{idPlaceHolder}';

const PostgresTranspiler = model => {
  const buildSetUpdateValues = require('./build-set-update-values')(model);
  const conditionBuilders = require('./build-conditions')(model);
  const {buildQueryConditions, buildConditionsAndSorting} = conditionBuilders;
  const tableName = model.collection;

  const {select, extendedSelect} = buildSelect(model);

  const upsert = (data, query) => _upsert(data, query) || insert(data);

  const _upsert = buildUpsert(model);

  const count = query => {
    const {conditions} = buildConditionsAndSorting(query);
    return `SELECT COUNT(*) FROM ${tableName}` + conditions;
  };

  const insert = data => {
    if (isEmpty(data)) return '';
    if (model.isExtended()) return _extendedInsert(data);
    return buildBasicInsertSQL(model, data) + ' RETURNING *';
  };

  const _extendedInsert = data => {
    return _buildParentInsertSQL(data) + _buildChildInsertSQL(data) + '; ' +
      extendedSelect({where: {id: data.id}});
  };

  const _buildParentInsertSQL = data => {
    const parentModel = model.getExtendedModel().model;
    const parentData = parentModel.getData(snakeobj(data));
    return 'WITH NEW_PARENT_RECORD as ' +
      `(${buildBasicInsertSQL(parentModel, parentData)} RETURNING id) `;
  };

  const _buildChildInsertSQL = data => {
    const childData = model.getData(snakeobj(data));
    const {foreignKey} = model.getExtendedModel();
    const idQuery = '(SELECT id FROM NEW_PARENT_RECORD)';
    childData[foreignKey] = ID_REPLACER;
    return buildBasicInsertSQL(model, childData).replace(ID_REPLACER, idQuery);
  };

  const remove = query => {
    if (model.isExtended()) return _extendedRemove(snakeobj(query));
    return _remove(snakeobj(query));
  };

  const _extendedRemove = query => {
    const {where} = query;
    if (!where) return _extendedRemoveAll();
    const {foreignKey} = model.getExtendedModel();
    const primaryKey = model.getExtendedModel().model.getPrimaryKey();
    const parentTable = model.getExtendedModel().name;
    const subselect = `WITH ids as (${select(query)}) `;

    return 'BEGIN; ' + subselect +
    `DELETE FROM ${tableName} WHERE ${tableName}.${foreignKey} IN ` +
    `(SELECT ${primaryKey} FROM ids);` + subselect +
    `DELETE FROM ${parentTable} WHERE ${parentTable}.${primaryKey} IN ` +
    `(SELECT ${primaryKey} FROM ids); COMMIT;`;
  };

  const _extendedRemoveAll = () => {
    const parentTable = model.getExtendedModel().name;
    return 'BEGIN;' + `DELETE FROM ${tableName};` +
      `DELETE FROM ${parentTable};` + 'COMMIT;';
  };

  const _remove = query => {
    const {conditions} = buildConditionsAndSorting(query);
    return `DELETE FROM ${tableName}` + conditions;
  };

  const update = (query = {}, data) => {
    if (isEmpty(data)) return '';
    const {where = null} = snakeobj(query);
    const sanitizedData = snakeobj(dotobj(omit(data, model.getPrimaryKey())));
    if (model.isExtended()) return _extendedUpdate(where, sanitizedData);
    return _update(where, sanitizedData);
  };

  const _extendedUpdate = (query, data) => {
    const childQuery = {};
    const {foreignKey} = model.getExtendedModel();
    const idQuery = '(SELECT id FROM PARENT_RECORD)';
    childQuery[foreignKey] = ID_REPLACER;
    return _buildParentUpdateSQL(query, data) +
      _buildBasicUpdateSQL(childQuery, model.getData(data)).replace(ID_REPLACER, idQuery) +
      '; ' + extendedSelect({where: data});
  };

  const _buildParentUpdateSQL = (query, data) => {
    const parentModel = model.getExtendedModel().model;
    return 'WITH PARENT_RECORD as ' +
      `(${_buildExtendedUpdateSQL(query, parentModel.getData(data))} RETURNING id) `;
  };

  const _update = (query, data) => {
    return _buildBasicUpdateSQL(query, data) + ' RETURNING *';
  };

  const _buildBasicUpdateSQL = (where, data) => {
    const table = model.getCollectionForField(first(Object.keys(data)));
    return `UPDATE ${table}` +
      buildSetUpdateValues(data) + buildQueryConditions(where);
  };

  const _buildExtendedUpdateSQL = (where, data) => {
    const table = model.getCollectionForField(first(Object.keys(data)));
    const {foreignKey, name} = model.getExtendedModel();
    return `UPDATE ${table}` + buildSetUpdateValues(data) +
      ` FROM ${tableName}` + buildQueryConditions(where) +
      ` AND ${name}.id=${tableName}.${foreignKey}`;
  };

  const AND = ' AND ';
  const OR = ' OR ';

  const OPERATORS = {
    'or': OR,
    'and': AND,
    'gt': '>',
    'gte': '>=',
    'lt': '<',
    'lte': '<='
  };

  const funcs = {select, count, insert, upsert, update, remove};

  return Object.assign({}, funcs, {operators: Object.keys(OPERATORS)});
};

module.exports = PostgresTranspiler;
