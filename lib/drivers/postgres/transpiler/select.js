module.exports = model => {
  const tableName = model.collection;
  const {buildConditionsAndSorting} = require('./build-conditions')(model);

  const select = (query = {}) => {
    if (model.isExtended()) return extendedSelect(query);
    return _select(query);
  };

  const extendedSelect = query => {
    const parentTable = model.getExtendedModel().name;
    const foreignKey = model.getExtendedModel().foreignKey;
    const {conditions, sorting} = buildConditionsAndSorting(query);

    return `SELECT * FROM ${tableName} JOIN ${parentTable} ` +
    `ON ${foreignKey} = id` + conditions + sorting + _limit(query) + _offset(query);
  };

  const _select = query => {
    const {conditions, sorting} = buildConditionsAndSorting(query);
    return `SELECT * FROM ${tableName}` + conditions + sorting +
      _limit(query) + _offset(query);
  };

  const _limit = ({limit}) => limit ? ` LIMIT ${limit}` : '';

  const _offset = ({skip}) => skip ? ` OFFSET ${skip}` : '';

  return {select, extendedSelect};
};
