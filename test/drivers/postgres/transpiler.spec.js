const {suite} = require('suitape');

const startDate = '2001-02-11T00:00:00.000Z';
const endDate = '2001-02-13T00:00:00.000Z';

const PostgresTranspiler = require('./../../../lib/drivers/postgres/transpiler');
const {types, defineSchema} = require('./../../../lib/schema/definition');
const schema = defineSchema('single_table', {
  name: types.STRING,
  lastName: types.STRING,
  age: types.INTEGER,
  tracked: types.BOOLEAN,
  job: types.JSON,
  createdAt: types.DATE
});
const transpile = PostgresTranspiler(schema);

suite('Postgres Transpiler', (test) => {
  test('should create correct conditions with one condition', (assert) => {
    const uql = {name: 'Jon'};
    const expected = 'WHERE name=\'Jon\'';
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });

  test('should create correct conditions with two conditions', (assert) => {
    const uql = {name: 'Jon', lastName: 'Doe'};
    const expected = 'WHERE name=\'Jon\' AND last_name=\'Doe\'';
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });

  test('should create correct conditions with three conditions', (assert) => {
    const uql = {name: 'Jon', lastName: 'Doe', age: 23};
    const expected = 'WHERE name=\'Jon\' AND last_name=\'Doe\' AND age=23';
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });

  test('should create correct conditions with a date range condition', (assert) => {
    const uql = {
      createdAt: {
        $gte: new Date(startDate),
        $lt: new Date(endDate)
      }
    };
    const actual = transpile(uql);
    const expected = `WHERE created_at >= \'${startDate}\' AND created_at < '${endDate}'`;
    assert('equal', actual, expected);
  });

  test('should create correct conditions with three regular conditions and a date range condition', (assert) => {
    const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
    const dateRange = {
      createdAt: {
        $gte: new Date(startDate),
        $lt: new Date(endDate)
      }
    };
    const uql = Object.assign({}, regularConds, dateRange);
    const actual = transpile(uql);
    const expected = 'WHERE name=\'Jon\' AND last_name=\'Doe\' AND age=23 AND ' +
     `created_at >= \'${startDate}\' AND created_at < '${endDate}'`;
    assert('equal', actual, expected);
  });

  test('should create correct conditions with $or operator', (assert) => {
    const uql = {$or: [{name: 'Jon'}, {lastName: 'Doe'}]};
    const expected = 'WHERE name=\'Jon\' OR last_name=\'Doe\'';
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });

  test('should create correct conditions with explicit $and operator', (assert) => {
    const uql = {$and: [{name: 'Jon'}, {lastName: 'Doe'}]};
    const expected = 'WHERE name=\'Jon\' AND last_name=\'Doe\'';
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });

  test('should create correct conditions with a single $lt operator', (assert) => {
    const uql = {tracked: true, createdAt: {$lt: new Date(startDate)}};
    const expected = `WHERE tracked=true AND created_at < '${startDate}'`;
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });

  test('should create correct conditions for single json inner query', (assert) => {
    const uql = {'job.title': 'Programmer'};
    const expected = 'WHERE job->>\'title\'=\'Programmer\'';
    const actual = transpile(uql);
    assert('equal', actual, expected);
  });
});
