const {types, defineModel} = require('lib/model/definition');

const collection = 'positions';
const definition = {
  id: types.PRIMARY_KEY,
  name: types.STRING,
  code: types.STRING,
  companyId: types.FOREIGN_KEY,
  employees: types.ARRAY,
  active: types.BOOLEAN
};

module.exports = engine => {
  const model = defineModel(Object.assign({}, {collection, definition, engine}));
  model.unique({combined: ['code', 'companyId']});
  model.setPrimaryKey('id');
  return model;
};
