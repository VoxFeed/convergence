const snakeobj = require('snakeobj');
const omit = require('lodash/omit');

const buildBasicInsertSQL = require('./build-basic-insert');

const buildUpsertTranspiler = model => {
  const {buildQueryConditions} = require('./build-conditions')(model);
  const buildSetUpdateValues = require('./build-set-update-values')(model);

  const upsert = (data, query) => {
    const sanitizedData = snakeobj(data);
    const {where} = snakeobj(query || {});
    if (model.isExtended()) return _upsertExtendedModel(sanitizedData, where);
    return _upsertSingleModel(sanitizedData, where);
  };

  const _upsertExtendedModel = (data, where) => {
    const parentModel = model.getExtendedModel().model;
    console.log('_upsertExtendedModel', data);
    return _buildUpsertSQL(parentModel, data, where) +
      _buildUpsertSQL(model, data, where);
  };

  const _buildUpsertSQL = (_model, data, where) => {
    const pickedData = _model.getData(data);

    if (_hasSingleIndexes(_model)) {
      return _upsertWithSingleIndexes(_model, pickedData, where);
    }
    if (_hasCombinedIndexes(_model)) {
      return _upsertWithCombinedIndexes(_model, pickedData, where);
    }
    return buildBasicInsertSQL(_model, pickedData) +
      _buildConflictCondition(_model, pickedData, where, [_model.getPrimaryKey()]) +
      '; ';
  };

  const _upsertSingleModel = (data, where) => {
    if (_hasSingleIndexes(model)) return _upsertWithSingleIndexes(model, data, where);
    if (_hasCombinedIndexes(model)) return _upsertWithCombinedIndexes(model, data, where);
    if (!model.getPrimaryKey()) return;

    return buildBasicInsertSQL(model, data) +
      _buildConflictCondition(model, data, where, [model.getPrimaryKey()]) + ' RETURNING *';
  };

  const _hasSingleIndexes = _model => _model.getUniqueSingleIndexes().length > 0;

  const _hasCombinedIndexes = _model => _model.getUniqueCombinedIndexes().length > 0;

  const _upsertWithSingleIndexes = (_model, data, where) => {
    const indexes = _model.getUniqueSingleIndexes();
    return buildBasicInsertSQL(_model, data) +
      _buildConflictCondition(_model, data, where, indexes) + ' RETURNING *';
  };

  const _upsertWithCombinedIndexes = (_model, data, where) => {
    const indexes = _model.getUniqueCombinedIndexes();
    return buildBasicInsertSQL(_model, data) +
      _buildConflictCondition(_model, data, where, indexes) + ' RETURNING *';
  };

  const _buildConflictCondition = (_model, data, where, indexes = []) => {
    const primaryKey = _model.getPrimaryKey();
    const sanitizedData = omit(data, primaryKey);
    if (indexes.length) return _buildConflictWithIndexes(_model, sanitizedData, where, indexes);
    return _buildConflictWithIndexes(sanitizedData, where, [primaryKey]);
  };

  const _buildConflictWithIndexes = (_model, data, where, indexes) => {
    const primaryKey = _model.getPrimaryKey();
    const conds = buildQueryConditions(_model.getData(where));
    const values = buildSetUpdateValues(omit(data, primaryKey));

    return ` ON CONFLICT (${indexes.join(', ')}) DO UPDATE` + values + conds;
  };

  return upsert;
};

module.exports = buildUpsertTranspiler;
