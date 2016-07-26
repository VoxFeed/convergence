const {types, defineModel} = require('lib/model/definition');

const collection = 'employees';
const definition = {
  id: types.INTEGER,
  personId: types.INTEGER,
  schedule: types.STRING,
  entryDate: types.DATE,
  ssn: types.STRING,
  createdAt: types.DATE
};

module.exports = (engine, PersonModel) => {
  const model = defineModel(Object.assign({}, {collection, definition, engine}));
  model.extend(PersonModel, 'personId');
  return model;
};
