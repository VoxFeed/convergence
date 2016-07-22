const {suite} = require('suitape');
const clone = require('lodash/cloneDeep');
const first = require('lodash/first');

const MemoryCRUD = require('lib/drivers/memory/crud');
const fixtures = require('test/data/fixtures/persons');

const store = {'single_table': fixtures.map(clone)};
const driver = {engine: 'memory', store};
const schema = require('test/test-helpers/build-single-table-schema')(driver);
const crud = MemoryCRUD(driver, schema);

suite('Memory Crud', (test) => {
  test('findOne: should return a promise', (assert) => {
    const actual = crud.findOne({where: {name: 'Jon'}}).constructor.name;
    const expected = 'Promise';
    assert('equal', actual, expected);
  });

  test('findOne: should return error if unknown fields are sent', (assert) => {
    return new Promise((resolve, reject) => {
      crud.findOne({where: {unknown: 'field'}})
        .then(record => {
          assert('equal', typeof record, 'undefined');
          resolve();
        })
        .catch(resolve);
    });
  });

  test('findOne: should return a plain object', assert => {
    return new Promise((resolve, reject) => {
      crud.findOne({where: {name: 'Jon'}})
        .then(record => {
          const expected = JSON.stringify(first(fixtures));
          const actual = JSON.stringify(record);
          assert('equal', actual, expected);
        })
        .then(resolve)
        .catch(reject);
    });
  });

  test('findOne: should return first object found', assert => {
    return new Promise((resolve, reject) => {
      crud.findOne({where: {'job.title': 'Programmer'}})
        .then(record => {
          const expected = JSON.stringify(fixtures[1]);
          const actual = JSON.stringify(record);
          assert('equal', actual, expected);
        })
        .then(resolve)
        .catch(reject);
    });
  });
});
