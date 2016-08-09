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
    `ON ${foreignKey}=id` + conditions + sorting;
  };

  const _select = query => {
    const {conditions, sorting} = buildConditionsAndSorting(query);
    return `SELECT * FROM ${tableName}` + conditions + sorting;
  };

  return {select, extendedSelect};
};
