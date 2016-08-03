const snakeobj = require('snakeobj');
const isEmpty = require('lodash/isEmpty');

module.exports = model => {
  const tableName = model.collection;
  const {
    buildConditions, buildConditionsAndSorting
  } = require('./build-conditions')(model);

  const select = (query = {}) => {
    if (model.isExtended()) return extendedSelect(query);
    return _select(query);
  };

  const extendedSelect = query => {
    const {where} = snakeobj(query);
    const parentTable = model.getExtendedModel().name;
    const foreignKey = model.getExtendedModel().foreignKey;
    const conds = buildConditions(where);
    return `SELECT * FROM ${tableName} JOIN ${parentTable} ` +
    `ON ${foreignKey}=id` + (isEmpty(conds) ? '' : ` WHERE ${conds}`);
  };

  const _select = query => {
    const {conditions, sorting} = buildConditionsAndSorting(query);
    return `SELECT * FROM ${tableName}` + conditions + sorting;
  };

  return {select, extendedSelect};
};
