const {clone, flatten} = require('lodash');
const fixtureSelector = {
  persons: require('./persons'),
  employees: require('./employees'),
  fullEmployee: require('./full-employees')
};

const loadFixtures = cruds => {
  const seeds = Object.keys(cruds).map(collection => buildSeed(collection, cruds[collection]));
  return Promise.all(flatten(seeds))
    .catch(err => {
      console.error('Seeding failed', err);
      throw err;
    });
};

const buildSeed = (collection, crud) => {
  const fixtures = selectFixtures(collection);
  return fixtures.map(insertRecord(crud));
};

const selectFixtures = name => fixtureSelector[name];

const insertRecord = crud => data => {
  return crud.insert(clone(data));
};

module.exports = loadFixtures;
