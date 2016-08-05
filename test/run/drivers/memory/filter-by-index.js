const pick = require('lodash/pick');
const isPlainObject = require('lodash/isPlainObject');
const uuid = require('uuid-v4');
const snakeobj = require('snakeobj');

const {memory} = require('lib/engines');
const Crud = require('lib/model/crud');
const {types, defineModel} = require('lib/model/definition');

const personsFixtures = require('test/data/fixtures/persons');
const employeesFixtures = require('test/data/fixtures/employees');
const positionsFixtures = require('test/data/fixtures/positions');
const buildPersonModel = require('test/test-helpers/build-single-table-schema');
const buildEmployeeModel = require('test/test-helpers/build-extended-table-schema');
const buildPositionModel = require('test/test-helpers/build-schema-with-unique-combined-index');
const unexpectedData = require('test/test-helpers/unexpected-data');
const FilterByIndex = require('lib/drivers/memory/filter-by-indexes');
const store = {};
const engine = memory(store);
const personModel = buildPersonModel(engine);
const positionModel = buildPositionModel(engine);
const employeeModel = buildEmployeeModel(engine, personModel);

const loadFixtures = require('test/data/fixtures');
const resetDatabase = require('test/data/fixtures/reset-memory');

const BAD_INPUT = 'BAD_INPUT';

describe('Filter By Index', () => {
  let filterByIndex;
  beforeEach(done => {
    const employeesCrud = Crud(engine, employeeModel);
    const positionsCrud = Crud(engine, positionModel);
    resetDatabase({persons: personModel, employees: employeeModel, positions: positionModel}, store)
    .then(() => loadFixtures({fullEmployee: employeesCrud, positions: positionsCrud}))
    .then(() => {
      filterByIndex = FilterByIndex(employeeModel, store);
      return filterByIndex;
    })
    .then(() => done())
    .catch(done);
  });

  it('should filter by primaryKey', () => {
    const query = {personId: employeesFixtures[1].personId};
    const response = filterByIndex(snakeobj(query));
    const expected = Object.assign({}, personsFixtures[1], employeesFixtures[1]);
    expect(response.length).to.be.equal(1);
    expect(response[0]).to.be.deep.equal(snakeobj(expected));
  });

  it('should filter by single unique index', () => {
    const query = {ssn: employeesFixtures[4].ssn};
    const response = filterByIndex(snakeobj(query));
    const expected = Object.assign({}, personsFixtures[4], employeesFixtures[4]);
    expect(response.length).to.be.equal(1);
    expect(response[0]).to.be.deep.equal(snakeobj(expected));
  });

  it('should filter by combined unique index', () => {
    filterByIndex = FilterByIndex(positionModel, store);
    const query = pick(positionsFixtures[3], ['code', 'companyId']);
    const response = filterByIndex(snakeobj(query));
    const expected = Object.assign({}, positionsFixtures[3]);
    expect(response.length).to.be.equal(1);
    expect(response[0]).to.be.deep.equal(snakeobj(expected));
  });

  it('should filter by primary key and operator', () => {
    const query = {
      personId: employeesFixtures[1].personId,
      or: [
        {age: 22},
        {tracked: true}
      ]
    };
    const response = filterByIndex(snakeobj(query));
    const expected = Object.assign({}, personsFixtures[1], employeesFixtures[1]);
    expect(response.length).to.be.equal(1);
    expect(response[0]).to.be.deep.equal(snakeobj(expected));
  });

  it('should filter by primary key and operator', () => {
    const query = {
      and: [
        {age: 22},
        {tracked: true}
      ]
    };
    const response = filterByIndex(snakeobj(query));
    expect(response.length).to.be.equal(6);
  });

  it('should filter by primary key and operator', () => {
    const query = {age: 22, tracked: true};
    const response = filterByIndex(snakeobj(query));
    expect(response.length).to.be.equal(6);
  });
});
