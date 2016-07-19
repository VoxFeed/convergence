const {types, defineSchema} = require('lib/schema/definition');

const definition = {
  name: types.STRING,
  lastName: types.STRING,
  age: types.INTEGER,
  tracked: types.BOOLEAN,
  job: types.JSON,
  createdAt: types.DATE
};

module.exports = driver => defineSchema('single_table', driver, definition);
