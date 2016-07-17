const test = require('tape');
const clone = require('lodash/cloneDeep');
const get = require('lodash/get');
const first = require('lodash/first');

const MemoryFilter = require('./../../../lib/drivers/memory/filter');
const {types, defineSchema} = require('./../../../lib/schema/definition');

const schema = defineSchema('single_table', {
  name: types.STRING,
  lastName: types.STRING,
  age: types.INTEGER,
  tracked: types.BOOLEAN,
  job: types.JSON,
  createdAt: types.DATE
});
const fixtures = require('./../../data/fixtures/persons');
const store = fixtures.map(clone);
const filter = MemoryFilter(schema, store);

test('should find item with one condition', (t) => {
  const uql = {name: 'Jon'};
  const expected = 1;
  const actual = get(first(filter(uql)), 'id', null);
  t.equal(actual, expected);
  t.end();
});

test('should find item with two conditions', (t) => {
  const uql = {name: 'Jon', lastName: 'Doe'};
  const expected = 1;
  const actual = get(first(filter(uql)), 'id', null);
  t.equal(actual, expected);
  t.end();
});

test('should find with three conditions', (t) => {
  const uql = {name: 'Jon', lastName: 'Doe', age: 23};
  const expected = 1;
  const actual = get(first(filter(uql)), 'id', null);
  t.equal(actual, expected);
  t.end();
});

test('should find with date ranges in one field $gte and $lt', (t) => {
  const startDate = new Date('2015-09-01T00:00:00.000Z');
  const endDate = new Date('2016-01-01T00:00:00.000Z');
  const uql = {createdAt: {$gte: new Date(startDate), $lt: new Date(endDate)}};
  const expected = [3, 4, 5];
  const actual = filter(uql).map(p => p.id).sort();
  t.equal(actual.join(), expected.join());
  t.end();
});

test('should find with date ranges in one field $gt and $lte', (t) => {
  const startDate = new Date('2015-10-01T00:00:00.000Z');
  const endDate = new Date('2015-12-01T00:00:00.000Z');
  const uql = {createdAt: {$gt: new Date(startDate), $lte: new Date(endDate)}};
  const expected = [3, 5];
  const actual = filter(uql).map(p => p.id).sort();
  t.equal(actual.join(), expected.join());
  t.end();
});