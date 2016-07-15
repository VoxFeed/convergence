const test = require('tape');

const transpile = require('./../lib/transpilers/postgres');

const startDate = '2001-02-11T00:00:00.000Z';
const endDate = '2001-02-13T00:00:00.000Z';

test('should create correct conditions with one condition', (t) => {
  const uql = {name: 'Jon'};
  const expected = 'WHERE name=\'Jon\'';
  const actual = transpile(uql);
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with two conditions', (t) => {
  const uql = {name: 'Jon', lastName: 'Doe'};
  const expected = 'WHERE name=\'Jon\' AND lastName=\'Doe\'';
  const actual = transpile(uql);
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with three conditions', (t) => {
  const uql = {name: 'Jon', lastName: 'Doe', age: 23};
  const expected = 'WHERE name=\'Jon\' AND lastName=\'Doe\' AND age=23';
  const actual = transpile(uql);
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with a date range condition', (t) => {
  const uql = {
    createdAt: {
      $gte: new Date(startDate),
      $lt: new Date(endDate)
    }
  };
  const actual = transpile(uql);
  const expected = `WHERE createdAt >= \'${startDate}\' AND createdAt < '${endDate}'`;
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with three regular conditions and a date range condition', (t) => {
  const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
  const dateRange = {
    createdAt: {
      $gte: new Date(startDate),
      $lt: new Date(endDate)
    }
  };
  const uql = Object.assign({}, regularConds, dateRange);
  const actual = transpile(uql);
  const expected = `WHERE name=\'Jon\' AND lastName=\'Doe\' AND age=23 AND createdAt >= \'${startDate}\' AND createdAt < '${endDate}'`;
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with $or operator', (t) => {
  const uql = {$or: [{name: 'Jon'}, {lastName: 'Doe'}]};
  const expected = 'WHERE name=\'Jon\' OR lastName=\'Doe\'';
  const actual = transpile(uql);
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with explicit $and operator', (t) => {
  const uql = {$and: [{name: 'Jon'}, {lastName: 'Doe'}]};
  const expected = 'WHERE name=\'Jon\' AND lastName=\'Doe\'';
  const actual = transpile(uql);
  t.equal(actual, expected);
  t.end();
});

test('should create correct conditions with a single $lt operator', (t) => {
  const uql = {tracked: true, publishedAt: {$lt: new Date(startDate)}};
  const expected = `WHERE tracked=true AND publishedAt < '${startDate}'`;
  const actual = transpile(uql);
  t.equal(actual, expected);
  t.end();
})
