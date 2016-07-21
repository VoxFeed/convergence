const {suite} = require('suitape');

const startDate = '2001-02-11T00:00:00.000Z';
const endDate = '2001-02-13T00:00:00.000Z';

const PostgresTranspiler = require('lib/drivers/postgres/transpiler');
const driver = {engine: 'postgres', connection: {pool: {}}};
const schema = require('test/test-helpers/build-single-table-schema')(driver);

const {select, insert} = PostgresTranspiler(schema);

suite('Postgres Transpiler: Select', test => {
  test('should return correct sql if no where clause is sent', assert => {
    const uql = {};
    const expected = 'SELECT * FROM single_table';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with one condition', assert => {
    const uql = {where: {name: 'Jon'}};
    const expected = 'SELECT * FROM single_table WHERE name=\'Jon\'';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with two conditions', assert => {
    const uql = {where: {name: 'Jon', lastName: 'Doe'}};
    const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\'';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with three conditions', (assert) => {
    const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23}};
    const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\' AND age=23';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with a date range condition', (assert) => {
    const uql = {
      where: {
        createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
      }
    };
    const actual = select(uql);
    const expected = `SELECT * FROM single_table WHERE created_at >= \'${startDate}\' AND created_at < '${endDate}'`;
    assert('equal', actual, expected);
  });

  test('should create correct SQL with three regular conditions and a date range condition', (assert) => {
    const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
    const dateRange = {
      createdAt: {
        gte: new Date(startDate),
        lt: new Date(endDate)
      }
    };
    const uql = {where: Object.assign({}, regularConds, dateRange)};
    const actual = select(uql);
    const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\' AND age=23 AND ' +
     `created_at >= \'${startDate}\' AND created_at < '${endDate}'`;
    assert('equal', actual, expected);
  });

  test('should create correct SQL with or operator', (assert) => {
    const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
    const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' OR last_name=\'Doe\'';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with explicit and operator', (assert) => {
    const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
    const expected = 'SELECT * FROM single_table WHERE name=\'Jon\' AND last_name=\'Doe\'';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with a single lt operator', (assert) => {
    const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
    const expected = `SELECT * FROM single_table WHERE tracked=true AND created_at < '${startDate}'`;
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL for single json inner query', (assert) => {
    const uql = {where: {'job.title': 'Programmer'}};
    const expected = 'SELECT * FROM single_table WHERE job->>\'title\'=\'Programmer\'';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with order and single field to order', assert => {
    const uql = {order: [{age: 'ASC'}]};
    const expected = 'SELECT * FROM single_table ORDER BY age ASC';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with multiple order conditions', assert => {
    const uql = {order: [{age: 'ASC'}, {lastName: 'DESC'}]};
    const expected = 'SELECT * FROM single_table ORDER BY age ASC, last_name DESC';
    const actual = select(uql);
    assert('equal', actual, expected);
  });

  test('should create correct SQL with where conditions and multiple order conditions', assert => {
    const uql = {where: {'job.title': 'Programmer'}, order: [{age: 'ASC'}, {lastName: 'DESC'}]};
    const expected = 'SELECT * FROM single_table WHERE job->>\'title\'=\'Programmer\' ' +
     'ORDER BY age ASC, last_name DESC';
    const actual = select(uql);
    assert('equal', actual, expected);
  });
});

suite('Postgres Transpiler: Insert', (test) => {
  test('should create sql with one field', (assert) => {
    const data = {name: 'Jon'};
    const expected = 'INSERT INTO single_table (name) VALUES (\'Jon\')';
    const actual = insert(data);
    assert('equal', actual, expected);
  });

  test('should create sql with two fields', (assert) => {
    const data = {name: 'Jon', lastName: 'Doe'};
    const expected = 'INSERT INTO single_table (name, last_name) VALUES (\'Jon\', \'Doe\')';
    const actual = insert(data);
    assert('equal', actual, expected);
  });

  test('should create sql with three fields', (assert) => {
    const data = {name: 'Jon', lastName: 'Doe', age: 23};
    const expected = 'INSERT INTO single_table (name, last_name, age) VALUES (\'Jon\', \'Doe\', 23)';
    const actual = insert(data);
    assert('equal', actual, expected);
  });

  test('should create sql with all schema fields', (assert) => {
    const data = {
      name: 'Jon',
      lastName: 'Doe',
      age: 23,
      tracked: false,
      job: {title: 'Programmer', company: 'VoxFeed'}
    };
    const expected = 'INSERT INTO single_table (name, last_name, age, tracked, job) ' +
      'VALUES (\'Jon\', \'Doe\', 23, false, \'{"title":"Programmer","company":"VoxFeed"}\')';
    const actual = insert(data);
    assert('equal', actual, expected);
  });
});
