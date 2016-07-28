const {types, defineModel} = require('lib/model/definition');

const collection = 'persons';
const definition = {
  id: types.PRIMARY_KEY,
  name: types.STRING,
  lastName: types.STRING,
  age: types.INTEGER,
  tracked: types.BOOLEAN,
  job: types.JSON,
  rating: types.DECIMAL,
  createdAt: types.DATE
};

module.exports = engine => {
  const model = defineModel(Object.assign({}, {collection, definition, engine}));
  model.validatesUniquenessOf('rating');
  return model;
};
