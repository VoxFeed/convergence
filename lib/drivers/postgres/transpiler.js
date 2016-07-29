const {first, flatten, omit, pick} = require('lodash');
const {isInteger, isNumber, isEmpty} = require('lodash');
const snakeobj = require('snakeobj');
const isDotNotation = require('./../../util/is-dot-notation');
const dotobj = require('dot-object').object;

const ID_REPLACER = '{idPlaceHolder}';

const PostgresTranspiler = model => {
  const tableName = model.collection;

  const count = query => {
    const {conditions} = _buildConditionsAndSorting(query);
    return `SELECT COUNT(*) FROM ${tableName}` + conditions;
  };

  const insert = data => {
    if (isEmpty(data)) return '';
    if (model.isExtended()) return _extendedInsert(data);
    return _buildBasicInsertSQL(model, data) + ' RETURNING *';
  };

  const _extendedInsert = data => {
    return _buildParentInsertSQL(data) + _buildChildInsertSQL(data) + '; ' +
      _extendedSelect({where: {id: data.id}});
  };

  const _buildParentInsertSQL = data => {
    const parentModel = model.getExtendedModel().model;
    const parentData = _getParentData(snakeobj(data));
    return 'WITH NEW_PARENT_RECORD as ' +
      `(${_buildBasicInsertSQL(parentModel, parentData)} RETURNING id) `;
  };

  const _buildChildInsertSQL = data => {
    const childData = _getChildData(snakeobj(data));
    const {foreignKey} = model.getExtendedModel();
    const idQuery = '(SELECT id FROM NEW_PARENT_RECORD)';
    childData[foreignKey] = ID_REPLACER;
    return _buildBasicInsertSQL(model, childData).replace(ID_REPLACER, idQuery);
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
    const {conditions} = _buildConditionsAndSorting(query);
    return `DELETE FROM ${tableName}` + conditions;
  };

  const select = (query = {}) => {
    if (model.isExtended()) return _extendedSelect(query);
    return _select(query);
  };

  const _extendedSelect = query => {
    const {where} = snakeobj(query);
    const parentTable = model.getExtendedModel().name;
    const foreignKey = model.getExtendedModel().foreignKey;
    const conds = _buildConditions(where);
    return `SELECT * FROM ${tableName} JOIN ${parentTable} ` +
      `ON ${foreignKey}=id` + (isEmpty(conds) ? '' : ` WHERE ${conds}`);
  };

  const _select = query => {
    const {conditions, sorting} = _buildConditionsAndSorting(query);
    return `SELECT * FROM ${tableName}` + conditions + sorting;
  };

  const _getParentData = data => {
    const parentModel = model.getExtendedModel().model;
    const fields = parentModel.getOwnFields(data);
    return fields.reduce(_getSelectedFields(data), {});
  };

  const _getChildData = data => {
    const fields = model.getOwnFields(data);
    return fields.reduce(_getSelectedFields(data), {});
  };

  const _getSelectedFields = data => (selected, field) => {
    selected[field] = data[field];
    return selected;
  };

  const update = (query = {}, data) => {
    if (isEmpty(data)) return '';
    const {where = null} = snakeobj(query);
    const sanitizedData = snakeobj(dotobj(Object.assign({}, data)));
    if (model.isExtended()) return _extendedUpdate(where, sanitizedData);
    return _update(where, sanitizedData);
  };

  const _extendedUpdate = (query, data) => {
    const childQuery = {};
    const {foreignKey} = model.getExtendedModel();
    const idQuery = '(SELECT id FROM PARENT_RECORD)';
    childQuery[foreignKey] = ID_REPLACER;
    return _buildParentUpdateSQL(query, data) +
      _buildBasicUpdateSQL(childQuery, _getChildData(data)).replace(ID_REPLACER, idQuery) +
      '; ' + _extendedSelect({where: data});
  };

  const _buildParentUpdateSQL = (query, data) => {
    return 'WITH PARENT_RECORD as ' +
      `(${_buildExtendedUpdateSQL(query, _getParentData(data))} RETURNING id) `;
  };

  const _update = (query, data) => {
    return _buildBasicUpdateSQL(query, data) + ' RETURNING *';
  };

  const _buildBasicUpdateSQL = (where, data) => {
    const table = model.getCollectionForField(first(Object.keys(data)));
    return `UPDATE ${table}` +
      _buildSetUpdateValues(data) + _buildQueryConditions(where);
  };

  const _buildExtendedUpdateSQL = (where, data) => {
    const table = model.getCollectionForField(first(Object.keys(data)));
    const {foreignKey} = model.getExtendedModel();
    where.id = ID_REPLACER;
    return `UPDATE ${table}` + _buildSetUpdateValues(data) +
      ` FROM ${tableName}` + _buildQueryConditions(where).replace(ID_REPLACER, `${tableName}.${foreignKey}`);
  };

  const upsert = (data) => {
    const sanitizedData = snakeobj(data);
    const uniqueIndexes = model.getUniqueIndexes();
    if (isEmpty(uniqueIndexes)) return insert(data);
    return _buildBasicInsertSQL(model, sanitizedData) +
      _buildConflictCondition(sanitizedData, uniqueIndexes) + ' RETURNING *';
  };

  const _buildBasicInsertSQL = (schema, data) => {
    const sanitizedData = snakeobj(data);
    const fields = Object.keys(sanitizedData);
    const vals = fields.map(field => _buildValue(schema, field, sanitizedData));
    return `INSERT INTO ${schema.collection} (${fields.join(', ')}) VALUES (${vals.join(', ')})`;
  };

  const _buildConflictCondition = (data, uniqueIndexes = []) => {
    if (!uniqueIndexes.length) return '';
    const conds = _buildQueryConditions(pick(data, uniqueIndexes));
    const values = _buildSetUpdateValues(omit(data, 'id'));
    return ` ON CONFLICT (${uniqueIndexes.join(', ')}) DO UPDATE` +
      values + conds;
  };

  const _buildConditionsAndSorting = query => {
    const {where = null, order = null} = snakeobj(query);
    return {
      conditions: _buildQueryConditions(where),
      sorting: _buildOrderConditions(order)
    };
  };

  const _buildQueryConditions = query => {
    const conds = query ? _buildConditions(query) : null;
    return conds ? ` WHERE ${conds}` : '';
  };

  const _buildOrderConditions = query => {
    const conds = query ? query.map(_orderCondition) : null;
    return conds ? ` ORDER BY ${conds.join(', ')}` : '';
  };

  const _orderCondition = order => {
    const field = first(Object.keys(order));
    const value = order[field];
    return `${field} ${value}`;
  };

  const _buildValue = (schema, field, data) => {
    const type = schema.getFieldType(field);
    return generateValueForCondition(type, data[field]);
  };

  const _buildSetUpdateValues = data => {
    return ' SET ' + Object.keys(data).map(_buildUpdateFieldValue(data)).join(', ');
  };

  const _buildUpdateFieldValue = data => field => {
    const type = model.getFieldType(field);
    const value = generateValueForCondition(type, data[field]);
    return `${field}=${value}`;
  };

  const _buildConditions = query => {
    const fieldsOrOps = Object.keys(query);
    return fieldsOrOps.map(_buildCondition(query))
      .filter(cond => !!cond)
      .join(AND);
  };

  const _buildCondition = (query) => {
    return field => {
      if (isSubQuery(query[field])) return _generateSubQuery(field, query[field]);
      if (isDotNotation(field)) return _buildConditionForDotNotation(field, query);
      return _buildConditionForRegularField(field, query);
    };
  };

  const _buildConditionForDotNotation = (field, query) => {
    const jsonFieldName = field.replace(/\.(\w+)/g, '->>\'$1\'');
    const table = model.getCollectionForField(first(field.split('.')));
    const value = `'${query[field]}'`;
    return `${table}.${jsonFieldName}=${value}`;
  };

  const _buildConditionForRegularField = (field, query) => {
    const type = model.getFieldType(field);
    const table = model.getCollectionForField(field);
    const value = generateValueForCondition(type, query[field]);
    return `${table}.${field}=${value}`;
  };

  const isBooleanOperator = op => BOOLEAN_OPERATORS.includes(op);

  const isSubQuery = val => {
    return val && typeof val === 'object' && typeof val.getTime === 'undefined';
  };

  const _generateSubQuery = (field, val, _model) => {
    if (isBooleanOperator(field)) return buildSubqueryWithBooleanOperator(field, val, _model);
    return buildSubqueryWithInternalOperators(field, val, _model);
  };

  const buildSubqueryWithBooleanOperator = (op, fieldValues, _model) => {
    const subquery = fieldValues.map(fv => Object.keys(fv).map(_buildCondition(fv, _model)));
    return flatten(subquery).join(parseOperator(op));
  };

  const buildSubqueryWithInternalOperators = (field, val, _model) => {
    const subquery = Object.keys(val)
      .map(op => buildConditionsWithOperator(field, op, val[op], _model));
    return subquery.join(AND);
  };

  const generateValueForCondition = (type, val) => {
    const parseValue = _valueParserSelector[type];
    return parseValue ? parseValue(val) : '';
  };

  const buildConditionsWithOperator = (field, op, val) => {
    const type = model.getFieldType(field);
    const table = model.getCollectionForField(field);
    const value = generateValueForCondition(type, val);
    const operator = parseOperator(op);
    return `${table}.${field} ${operator} ${value}`;
  };

  const parseOperator = op => OPERATORS[op];

  const _escapeForSql = value => value.replace(/'/g, "''");

  const _parseString = value => {
    if (_isIdPlaceHolder(value)) return value;
    return value ? `'${_escapeForSql(value.toString())}'` : 'null';
  };

  const _parseBoolean = value => value ? 'true' : 'false';

  const _parseInteger = value => {
    if (_isIdPlaceHolder(value)) return value;
    return isInteger(value) ? value : 'null';
  };

  const _parseDecimal = value => isNumber(value) ? value : 'null';

  const _parseJSON = value => `'${JSON.stringify(value)}'`;

  const _parseDate = value => `'${value.toISOString()}'`;

  const _isIdPlaceHolder = val => val === ID_REPLACER;

  const _valueParserSelector = {
    'string': _parseString,
    'text': _parseString,
    'integer': _parseInteger,
    'decimal': _parseDecimal,
    'boolean': _parseBoolean,
    'json': _parseJSON,
    'date': _parseDate,
    'uuid': _parseString
  };

  const AND = ' AND ';
  const OR = ' OR ';
  const BOOLEAN_OPERATORS = ['and', 'or'];
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
