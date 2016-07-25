const clone = require('lodash/cloneDeep');
const {memory} = require('lib/engines');
const Crud = require('lib/drivers/memory/crud');
const personsFixtures = require('test/data/fixtures/persons');
const store = {'persons': personsFixtures.map(clone)};
const engine = memory(store);
const model = require('test/test-helpers/build-single-table-schema')(engine);
const isPlainObject = require('lodash/isPlainObject');
const isArray = require('lodash/isArray');

describe('Memory Crud', () => {
  const crud = Crud(engine, model);

  describe('Find One', () => {
    it('returns a promise', () => {
      const actual = crud.findOne({where: {name: 'Jon'}}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('returns an error if unknown fields are sent', (done) => {
      crud.findOne({where: {unknown: 'field'}})
        .then(() => done('unexpected data'))
        .catch((error) => {
          expect(error.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('should return a plain object', (done) => {
      crud.findOne({where: {name: 'Jon'}})
        .then(record => {
          expect(isPlainObject(record)).to.be.true;
        })
        .then(() => done())
        .catch(done);
    });

    it('should return first object found', (done) => {
      crud.findOne({where: {'job.title': 'Programmer'}})
        .then(record => {
          expect(record).to.be.deep.equal(personsFixtures[1]);
        })
        .then(() => done())
        .catch(done);
    });
  });

  describe('Find', () => {
    it('returns the correct records', (done) => {
      const query = {where: {or: [{id: 1}, {id: 2}]}};
      crud.find(query)
        .then((persons) => {
          const ids = persons.map(person => person.id);
          expect(ids).to.be.deep.equal(ids);
          done();
        })
        .catch(done);
    });

    it('returns an empty array when not found records', (done) => {
      const query = {where: {name: 'Jon', lastName: 'Snow'}};
      crud.find(query)
        .then((response) => expect(response).to.be.empty)
        .then(() => done())
        .catch(done);
    });

    it('throws an error when unknown fields are sent', (done) => {
      crud.find({where: {unknown: 'field'}})
        .then(() => done('unexpected data'))
        .catch((error) => {
          expect(error.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('returns an array when filter has operators', (done) => {
      const query = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      crud.find(query)
        .then((response) => {
          expect(isArray(response)).to.be.true;
          expect(response).to.not.be.empty;
          done();
        })
        .catch(done);
    });
  });

  describe('Count', () => {
    it('should return matching count', (done) => {
      const query = {where: {or: [{id: 1}, {id: 3}]}};
      crud.count(query)
        .then(count => expect(count).to.be.equal(2))
        .then(() => done())
        .catch(done);
    });

    it('should return 0', done => {
      crud.count({where: {name: 'Jon', lastName: 'Nope'}})
        .then(count => expect(count).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });

    it('should return error if unknown fields are sent', done => {
      crud.count({where: {unknown: 'field'}})
        .then(() => done('unexpected data'))
        .catch(err => expect(err.name).to.be.equal('BAD_INPUT'))
        .then(() => done());
    });

    it('should not return error if operators are sent', done => {
      crud.count({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
        .then(() => done())
        .catch(done);
    });
  });
});
