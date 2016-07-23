const unexpectedData = require('test/test-helpers/unexpected-data');
const {postgres} = require('lib/engines');
const Crud = require('lib/drivers/postgres/crud');
const engine = postgres({database: 'test'});

const model = require('test/test-helpers/build-single-table-schema')(engine);
const loadFixtures = require('test/data/fixtures');
const resetDatabase = require('test/data/fixtures/reset-database');

const BAD_INPUT = 'BAD_INPUT';

describe('Postgres Crud', () => {
  const crud = Crud(engine, model);

  beforeEach(done => {
    resetDatabase(['persons'])
      .then(() => done())
      .catch(done);
  });

  describe('findOne', () => {
    it('should return promise', () => {
      const actual = crud.findOne({where: {name: 'Jon'}}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('should return error if unknown fields are sent', done => {
      crud.findOne({where: {unknown: 'field'}})
        .then(data => unexpectedData(data || {}))
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done());
    });

    it('should not return error if operators are sent', done => {
      loadFixtures({persons: crud})
        .then(() => crud.findOne({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}}))
        .then(() => done())
        .catch(done);
    });

    it('should return find correct record', done => {
      loadFixtures({persons: crud})
        .then(() => crud.findOne({where: {name: 'Jon'}}))
        .then(person => {
          const expected = 'Jon';
          const actual = person.name;
          expect(actual).to.be.equal(expected);
        })
        .then(() => done())
        .catch(done);
    });

    it('should find no record', done => {
      loadFixtures({persons: crud})
        .then(() => crud.findOne({where: {name: 'Jon', lastName: 'Nope'}}))
        .then(person => expect(person).not.to.exist)
        .then(() => done())
        .catch(done);
    });
  });

  describe('Insert', () => {
    it('should return promise', () => {
      const actual = crud.insert({name: 'Jon'}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('should return error when trying to insert unkown field', done => {
      crud.insert({unknown: 'Field'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
    });

    it('should create record', done => {
      crud.insert({id: 999, name: 'Jon'})
        .then(person => {
          const expected = 'Jon';
          const actual = person.name;
          expect(actual).to.be.equal(expected);
          return person;
        })
        .then(person => crud.findOne({where: {id: person.id}}))
        .then(person => {
          const expected = 'Jon';
          const actual = person.name;
          expect(actual).to.be.equal(expected);
        })
        .then(() => done())
        .catch(done);
    });
  });

  describe('Update', () => {
    beforeEach(done => {
      loadFixtures({persons: crud})
        .then(() => done())
        .catch(done);
    });

    it('should update single existing record', done => {
      const query = {where: {name: 'Jon'}};
      const data = {lastName: 'Not Doe'};
      const expectUpdate = person => {
        const expected = 'Not Doe';
        const actual = person.lastName;
        expect(actual).to.be.equal(expected);
        return person;
      };

      crud.update(query, data)
        .then(expectUpdate)
        .then(person => crud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
    });

    it('should return error when trying to update with unkown field in data', done => {
      const query = {where: {name: 'Jon'}};
      const data = {unknown: 'Field'};
      crud.update(query, data)
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
    });

    it('should return error when trying to update with unkown field in query', done => {
      const query = {where: {unknown: 'Field'}};
      const data = {name: 'Jon'};
      crud.update(query, data)
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
    });

    it('should return error if keyword where is missing', done => {
      const query = {name: 'Jon'};
      const data = {lastName: 'doe'};
      crud.update(query, data)
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
    });
  });
});
