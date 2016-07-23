const {types, defineModel} = require('lib/model/definition');

const collection = 'single_table';
const definition = {
  name: types.STRING,
  lastName: types.STRING,
  age: types.INTEGER,
  tracked: types.BOOLEAN,
  job: types.JSON,
  createdAt: types.DATE
};

module.exports = engine => defineModel(Object.assign({}, {collection, definition, engine}));
