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
    const uql = {name: 'Jon'};
    const expected = 1;
    const actual = get(first(filter(uql)), 'id', null);
    assert('equal', actual, expected);
  });

  test('should find item with two conditions', (assert) => {
    const uql = {name: 'Jon', lastName: 'Doe'};
    const expected = 1;
    const actual = get(first(filter(uql)), 'id', null);
    assert('equal', actual, expected);
  });

  test('should find with three conditions', (assert) => {
    const uql = {name: 'Jon', lastName: 'Doe', age: 23};
    const expected = 1;
    const actual = get(first(filter(uql)), 'id', null);
    assert('equal', actual, expected);
  });

  test('should find with date ranges in one field gte and lt', (assert) => {
    const startDate = new Date('2015-09-01T00:00:00.000Z');
    const endDate = new Date('2016-01-01T00:00:00.000Z');
    const uql = {createdAt: {gte: new Date(startDate), lt: new Date(endDate)}};
    const expected = [3, 4, 5, 6];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find with date ranges in one field gt and lte', (assert) => {
    const startDate = new Date('2015-10-01T00:00:00.000Z');
    const endDate = new Date('2015-12-01T00:00:00.000Z');
    const uql = {createdAt: {gt: new Date(startDate), lte: new Date(endDate)}};
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
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find records with or operator', (assert) => {
    const uql = {or: [{name: 'Gibran'}, {lastName: 'Argumedo'}]};
    const expected = [3, 4];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find no records with or operator and impossible conditions', (assert) => {
    const uql = {or: [{name: 'Leafar'}, {lastName: 'Huichops'}]};
    const expected = [];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find records with and operator', (assert) => {
    const uql = {and: [{name: 'Gibran'}, {lastName: 'Arias'}]};
    const expected = [3];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find no records with and operator and impossible conditions', (assert) => {
    const uql = {and: [{name: 'Gibran'}, {lastName: 'Argumedo'}]};
    const expected = [];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find records with implicit and operator and a lt operator in a single field', (assert) => {
    const uql = {tracked: true, createdAt: {lt: new Date('2016-02-18T00:00:00.000Z')}};
    const expected = [2, 3, 4];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find value in a nested attribute', (assert) => {
    const uql = {'job.title': 'Programmer'};
    const expected = [2, 4, 5, 6];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });

  test('should find value in a nested attribute', (assert) => {
    const uql = {'job.companyName': 'VoxFeed'};
    const expected = [1, 2, 3, 4, 5];
    const actual = filter(uql).map(p => p.id).sort();
    assert('equal', actual.join(), expected.join());
  });
});
