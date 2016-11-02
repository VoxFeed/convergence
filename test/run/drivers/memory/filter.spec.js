const clone = require('lodash/cloneDeep');
const get = require('lodash/get');
const first = require('lodash/first');

const MemoryFilter = require('lib/drivers/memory/filter');
const personsFixtures = require('test/data/fixtures/persons');
const positionsFixtures = require('test/data/fixtures/positions');

const store = {persons: personsFixtures.map(clone), positions: positionsFixtures.map(clone)};
const {memory} = require('lib/engines');
const engine = memory(store);

const schema = require('test/test-helpers/build-single-table-schema')(engine);
const positionsModel = require('test/test-helpers/build-schema-with-unique-combined-index')(engine);

const filter = MemoryFilter(schema, store);
const positionsFilter = MemoryFilter(positionsModel, store);

describe('Memory Filter', () => {
  it('should find item with one condition', () => {
    const uql = {where: {name: 'Jon'}};
    const expected = 1;
    const actual = get(first(filter(uql)), 'rating', null);
    expect(actual).to.be.equal(expected);
  });

  it('should find item with two conditions', () => {
    const uql = {where: {name: 'Jon', lastName: 'Doe'}};
    const expected = 1;
    const actual = get(first(filter(uql)), 'rating', null);
    expect(actual).to.be.equal(expected);
  });

  it('should find with three conditions', () => {
    const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23}};
    const expected = 1;
    const actual = get(first(filter(uql)), 'rating', null);
    expect(actual).to.be.equal(expected);
  });

  it('should find with a contains operator', () => {
    const uql = {where: {employees: {contains: 'Karla'}}};
    const record = positionsFilter(uql)[0];
    expect(record.name).to.be.equal('iTexico');
    expect(record.employees).to.be.deep.equal(['Karla', 'Hayde']);
    expect(record.code).to.be.equal('2222');
  });

  it('should find with date ranges in one field gte and lt', () => {
    const startDate = new Date('2015-09-01T00:00:00.000Z');
    const endDate = new Date('2016-01-01T00:00:00.000Z');
    const uql = {where: {createdAt: {gte: new Date(startDate), lt: new Date(endDate)}}};
    const expected = [3, 4, 5, 6].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find with date ranges in one field gt and lte', () => {
    const startDate = new Date('2015-10-01T00:00:00.000Z');
    const endDate = new Date('2015-12-01T00:00:00.000Z');
    const uql = {where: {createdAt: {gt: new Date(startDate), lte: new Date(endDate)}}};
    const expected = [3, 5, 6].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should create correct conditions with three regular conditions and a date range condition', () => {
    const startDate = new Date('2015-10-01T00:00:00.000Z');
    const endDate = new Date('2016-01-18T00:00:00.000Z');
    const regularConds = {name: 'Jesus Agustin'};
    const dateRange = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    const uql = Object.assign({}, regularConds, dateRange);
    const expected = [5].join();
    const actual = filter({where: uql}).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should create correct conditions with a null date', () => {
    const regularConds = {name: 'Jon', createdAt: null};
    const uql = Object.assign({}, regularConds);
    const expected = [1].join();
    const actual = filter({where: uql}).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find records with or operator', () => {
    const uql = {where: {or: [{name: 'Gibran'}, {lastName: 'Argumedo'}]}};
    const expected = [3, 4].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find no records with or operator and impossible conditions', () => {
    const uql = {where: {or: [{name: 'Leafar'}, {lastName: 'Huichops'}]}};
    const expected = [].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find records with and operator', () => {
    const uql = {where: {and: [{name: 'Gibran'}, {lastName: 'Arias'}]}};
    const expected = [3].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find no records with and operator and impossible conditions', () => {
    const uql = {where: {and: [{name: 'Gibran'}, {lastName: 'Argumedo'}]}};
    const expected = [].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find records with implicit and operator and a lt operator in a single field', () => {
    const uql = {where: {tracked: true, createdAt: {lt: new Date('2016-02-18T00:00:00.000Z')}}};
    const expected = [2, 3, 4].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find value in a nested attribute', () => {
    const uql = {where: {'job.title': 'Programmer'}};
    const expected = [2, 4, 5, 6].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should find value in a nested attribute', () => {
    const uql = {where: {'job.companyName': 'VoxFeed'}};
    const expected = [1, 2, 3, 4, 5].join();
    const actual = filter(uql).map(p => p.rating).sort().join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by field ascendent', () => {
    const uql = {order: {'name': 'asc'}};
    const expected = [6, 2, 3, 5, 1, 4].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by field descendent', () => {
    const uql = {order: {'name': 'desc'}};
    const expected = [4, 1, 5, 3, 2, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by field descendent with uppercase', () => {
    const uql = {order: {'name': 'DESC'}};
    const expected = [4, 1, 5, 3, 2, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by two fields ascendent', () => {
    const uql = {order: {'job.title': 'asc', name: 'asc'}};
    const expected = [1, 6, 2, 5, 4, 3].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by two fields descendent', () => {
    const uql = {order: {'job.title': 'desc', name: 'desc'}};
    const expected = [3, 4, 5, 2, 6, 1].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by one field ascendent and one descendent', () => {
    const uql = {order: {'job.title': 'asc', name: 'desc'}};
    const expected = [1, 4, 5, 2, 6, 3].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by one field descendent and one ascendent', () => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}};
    const expected = [3, 6, 2, 5, 4, 1].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should order by one field descendent and one ascendent', () => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}};
    const expected = [3, 6, 2, 5, 4, 1].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should find value in a nested attribute and order by a field', () => {
    const uql = {where: {'job.title': 'Programmer'}, order: {name: 'asc'}};
    const expected = [6, 2, 5, 4].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should find value with regex with insensitive case', () => {
    const uql = {where: {'job.title': {regex: 'gram', options: 'i'}}};
    const expected = [2, 4, 5, 6];
    const actual = filter(uql).map(p => p.rating);
    expect(actual).to.be.deep.equal(expected);
  });

  it('should find value with regex with sensitive case', () => {
    const uql = {where: {'job.title': {regex: 'gRam'}}};
    const expected = [];
    const actual = filter(uql).map(p => p.rating);
    expect(actual).to.be.deep.equal(expected);
  });

  it('should find value with regex with sensitive case at the start', () => {
    const uql = {where: {'job.title': {regex: 'Progr'}}};
    const expected = [2, 4, 5, 6];
    const actual = filter(uql).map(p => p.rating);
    expect(actual).to.be.deep.equal(expected);
  });

  it('should limit the result to a limit of n', () => {
    const uql = {limit: 3};
    const expected = [1, 2, 3].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should limit the result to a limit of n', () => {
    const uql = {limit: 5};
    const expected = [1, 2, 3, 4, 5].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should not limit the result when limit is greater than total records', () => {
    const uql = {limit: 10};
    const expected = [1, 2, 3, 4, 5, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should return empty when limit is less or equal than zero', () => {
    const uql = {limit: 0};
    const expected = [].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should return records with a query, order and limit', () => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}, limit: 2};
    const expected = [3, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should skip the result to a skip of n', () => {
    const uql = {skip: 3};
    const expected = [4, 5, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should skip the result to a skip of n', () => {
    const uql = {skip: 4};
    const expected = [5, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should return empty when skip is greater than total records', () => {
    const uql = {skip: 10};
    const expected = [].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should not skip the result when skip is less or equal than zero', () => {
    const uql = {skip: 0};
    const expected = [1, 2, 3, 4, 5, 6].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });

  it('should return records with a query, order and skip, and skip', () => {
    const uql = {order: {'job.title': 'desc', name: 'asc'}, skip: 2, limit: 2};
    const expected = [2, 5].join();
    const actual = filter(uql).map(p => p.rating).join();
    expect(actual).to.be.equal(expected);
  });
});
