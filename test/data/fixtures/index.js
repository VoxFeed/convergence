const {clone, flatten} = require('lodash');
const resetDatabase = require('./reset-database');
const fixtureSelector = {
  persons: require('./persons')
};

const loadFixtures = cruds => {
  const collections = Object.keys(cruds);
  return resetDatabase(collections)
    .then(() => seedValues(cruds));
};

const seedValues = cruds => {
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

const insertRecord = crud => data => crud.insert(clone(data));

module.exports = loadFixtures;
