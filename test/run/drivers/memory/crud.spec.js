const isArray = require('lodash/isArray');
const snakeobj = require('snakeobj');
const isPlainObject = require('lodash/isPlainObject');

const {memory} = require('lib/engines');
const Crud = require('lib/model/crud');

const personsFixtures = require('test/data/fixtures/persons');
const buildModel = require('test/test-helpers/build-single-table-schema');
const unexpectedData = require('test/test-helpers/unexpected-data');

describe('Memory Crud', () => {
  let crud;

  beforeEach(() => {
    const store = {'persons': personsFixtures.map(person => snakeobj(person))};
    const engine = memory(store);
    const model = buildModel(engine);
    crud = Crud(engine, model);
  });

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

  describe('Insert', () => {
    it('should return promise', () => {
      const actual = crud.insert({name: 'Jon'}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('should return error when trying to insert unkown field', done => {
      crud.insert({unknown: 'Field'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal('BAD_INPUT'))
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
    it('should update single existing record', done => {
      const query = {where: {id: 1}};
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
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('should return error when trying to update with unkown field in query', done => {
      const query = {where: {unknown: 'Field'}};
      const data = {name: 'Jon'};
      crud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('should return error if keyword where is missing', done => {
      const query = {name: 'Jon'};
      const data = {lastName: 'doe'};
      crud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('should update property in json field', done => {
      const query = {where: {id: 1}};
      const data = {'job.companyName': 'new value'};
      const expectUpdate = person => {
        expect(person.job).to.have.property('companyName', 'new value');
        return person;
      };

      crud.update(query, data)
        .then(expectUpdate)
        .then(person => crud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
    });
  });

  describe('Remove', () => {
    it('should remove all records if no query is sent', done => {
      const query = {where: {}};

      crud.remove(query)
        .then(persons => expect(persons.length).to.be.equal(6))
        .then(() => crud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });

    it('should remove correct record with one field', done => {
      const query = {where: {name: 'Jon'}};
      crud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(1);
          const person = persons.pop();
          expect(person.name).to.be.equal('Jon');
          return person;
        })
        .then(person => crud.findOne({where: {id: person.id}}))
        .then(person => expect(person).not.to.exist)
        .then(() => done())
        .catch(done);
    });

    it('should remove correct records with or operator', done => {
      const query = {where: {or: [{name: 'Jon'}, {lastName: 'Arias'}]}};
      crud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(2);
          expect(persons.map(p => p.id).sort().join()).to.be.equal([1, 3].join());
          return persons;
        })
        .then(() => crud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });

    it('should create correct records for single json inner query', done => {
      const query = {where: {'job.title': 'Programmer'}};
      crud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(4);
          expect(persons.map(p => p.id).sort().join()).to.be.equal([2, 4, 5, 6].join());
          return persons;
        })
        .then(() => crud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });
  });
});
