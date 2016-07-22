const {suite} = require('suitape');
const clone = require('lodash/cloneDeep');
const get = require('lodash/get');
const first = require('lodash/first');

const MemoryFilter = require('lib/drivers/memory/filter');
const fixtures = require('test/data/fixtures/persons');
const store = {'single_table': fixtures.map(clone)};
const driver = {'engine': 'memory', store};
const schema = require('test/test-helpers/build-single-table-schema')(driver);
const filter = MemoryFilter(schema, store);

suite('Memory Filter', (test) => {
  test('should find item with one condition', (assert) => {
    const uql = {where: {name: 'Jon'}};
    const expected = 1;
    const actual = get(first(filter(uql)), 'id', null);
    assert('equal', actual, expected);
  });

  test('should find item with two conditions', (assert) => {
    const uql = {where: {name: 'Jon', lastName: 'Doe'}};
    const expected = 1;
    const actual = get(first(filter(uql)), 'id', null);
    assert('equal', actual, expected);
  });

  test('should find with three conditions', (assert) => {
    const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23}};
    const expected = 1;
    const actual = get(first(filter(uql)), 'id', null);
    assert('equal', actual, expected);
  });

  test('should find with date ranges in one field gte and lt', (assert) => {
    const startDate = new Date('2015-09-01T00:00:00.000Z');
    const endDate = new Date('2016-01-01T00:00:00.000Z');
    const uql = {where: {createdAt: {gte: new Date(startDate), lt: new Date(endDate)}}};
    const expected = [3, 4, 5, 6];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find with date ranges in one field gt and lte', (assert) => {
    const startDate = new Date('2015-10-01T00:00:00.000Z');
    const endDate = new Date('2015-12-01T00:00:00.000Z');
    const uql = {where: {createdAt: {gt: new Date(startDate), lte: new Date(endDate)}}};
    const expected = [3, 5, 6];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should create correct conditions with three regular conditions and a date range condition', (assert) => {
    const startDate = new Date('2015-12-01T00:00:00.000Z');
    const endDate = new Date('2016-01-18T00:00:00.000Z');
    const regularConds = {name: 'Jon'};
    const dateRange = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    const uql = Object.assign({}, regularConds, dateRange);
    const expected = [1];
    const actual = filter({where: uql}).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find records with or operator', (assert) => {
    const uql = {where: {or: [{name: 'Gibran'}, {lastName: 'Argumedo'}]}};
    const expected = [3, 4];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find no records with or operator and impossible conditions', (assert) => {
    const uql = {where: {or: [{name: 'Leafar'}, {lastName: 'Huichops'}]}};
    const expected = [];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find records with and operator', (assert) => {
    const uql = {where: {and: [{name: 'Gibran'}, {lastName: 'Arias'}]}};
    const expected = [3];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find no records with and operator and impossible conditions', (assert) => {
    const uql = {where: {and: [{name: 'Gibran'}, {lastName: 'Argumedo'}]}};
    const expected = [];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find records with implicit and operator and a lt operator in a single field', (assert) => {
    const uql = {where: {tracked: true, createdAt: {lt: new Date('2016-02-18T00:00:00.000Z')}}};
    const expected = [2, 3, 4];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find value in a nested attribute', (assert) => {
    const uql = {where: {'job.title': 'Programmer'}};
    const expected = [2, 4, 5, 6];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find value in a nested attribute', (assert) => {
    const uql = {where: {'job.companyName': 'VoxFeed'}};
    const expected = [1, 2, 3, 4, 5];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should order by field ascendent', (assert) => {
    const uql = {order: {'name': 'asc'}};
    const expected = [6, 2, 3, 5, 1, 4];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should order by field descendent', (assert) => {
    const uql = {order: {'name': 'desc'}};
    const expected = [4, 1, 5, 3, 2, 6];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should order by two fields ascendent', (assert) => {
    const uql = {order: {'job.title': 'asc', name: 'asc'}};
    const expected = [1, 6, 2, 5, 4, 3];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should order by two fields descendent', (assert) => {
    const uql = {order: {'job.title': 'desc', name: 'desc'}};
    const expected = [3, 4, 5, 2, 6, 1];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should order by one field ascendent and one descendent', (assert) => {
    const uql = {order: {'job.title': 'asc', name: 'desc'}};
    const expected = [1, 4, 5, 2, 6, 3];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should order by one field descendent and one ascendent', (assert) => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}};
    const expected = [3, 6, 2, 5, 4, 1];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should order by one field descendent and one ascendent', (assert) => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}};
    const expected = [3, 6, 2, 5, 4, 1];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should find value in a nested attribute and order by a field', (assert) => {
    const uql = {where: {'job.title': 'Programmer'}, order: {name: 'asc'}};
    const expected = [6, 2, 5, 4];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should limit the result to a limit of n', (assert) => {
    const uql = {limit: 3};
    const expected = [1, 2, 3];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should limit the result to a limit of n', (assert) => {
    const uql = {limit: 5};
    const expected = [1, 2, 3, 4, 5];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should not limit the result when limit is greater than total records', (assert) => {
    const uql = {limit: 10};
    const expected = [1, 2, 3, 4, 5, 6];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should return empty when limit is less or equal than zero', (assert) => {
    const uql = {limit: 0};
    const expected = [];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should return records with a query, order and limit', (assert) => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}, limit: 2};
    const expected = [3, 6];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should skip the result to a skip of n', (assert) => {
    const uql = {skip: 3};
    const expected = [4, 5, 6];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should skip the result to a skip of n', (assert) => {
    const uql = {skip: 4};
    const expected = [5, 6];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should return empty when skip is greater than total records', (assert) => {
    const uql = {skip: 10};
    const expected = [];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should not skip the result when skip is less or equal than zero', (assert) => {
    const uql = {skip: 0};
    const expected = [1, 2, 3, 4, 5, 6];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });

  test('should return records with a query, order and skip, and skip', (assert) => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}, skip: 2, limit: 2};
    const expected = [2, 5];
    const actual = filter(uql).map(p => p.id);
    assert('equal', actual.join(), expected.join());
  });
});
