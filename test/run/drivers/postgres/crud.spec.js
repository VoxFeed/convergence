const unexpectedData = require('test/test-helpers/unexpected-data');
const {postgres} = require('lib/engines');
const Crud = require('lib/model/crud');
const engine = postgres({database: 'test'});

const {defineModel, types} = require('lib/model/definition');
const model = require('test/test-helpers/build-single-table-schema')(engine);
const loadFixtures = require('test/data/fixtures');
const resetDatabase = require('test/data/fixtures/reset-database');

const BAD_INPUT = 'BAD_INPUT';

describe('Postgres Crud', () => {
  describe('Find One', () => {
    describe('Simple Model', () => {
      let crud;

      before(done => {
        crud = Crud(engine, model);
        resetDatabase(['persons'])
          .then(() => loadFixtures({persons: crud}))
          .then(() => done())
          .catch(done);
      });

      it('should return error if unknown fields are sent', done => {
        crud.findOne({where: {unknown: 'field'}})
          .then(data => unexpectedData(data || {}))
          .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
          .then(() => done());
      });

      it('should not return error if operators are sent', done => {
        crud.findOne({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
          .then(() => done())
          .catch(done);
      });

      it('should return find correct record', done => {
        crud.findOne({where: {name: 'Jon'}})
          .then(person => {
            const expected = 'Jon';
            const actual = person.name;
            expect(actual).to.be.equal(expected);
          })
          .then(() => done())
          .catch(done);
      });

      it('should find no record', done => {
        crud.findOne({where: {name: 'Jon', lastName: 'Nope'}})
          .then(person => expect(person).not.to.exist)
          .then(() => done())
          .catch(done);
      });
    });

    describe('Extended Model', () => {
      let crud;
      beforeEach((done) => {
        const extended = defineModel({
          collection: 'employees',
          engine,
          definition: {
            personId: types.FOREIGN_KEY,
            schedule: types.STRING,
            entryDate: types.DATE,
            ssn: types.STRING
          }
        });
        extended.extend(model, 'personId');

        crud = Crud(engine, extended);
        resetDatabase(['persons', 'employees'])
          .then(() => loadFixtures({fullEmployee: crud}))
          .then(() => done())
          .catch(done);
      });

      it('returns error with unkown field', done => {
        crud.insert({unknown: 'Field'})
          .then(unexpectedData)
          .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
          .then(() => done())
          .catch(done);
      });

      it('should return find correct record', done => {
        crud.findOne({where: {name: 'Jon', ssn: '23534564356'}})
          .then(employee => {
            expect(employee.name).to.be.equal('Jon');
            expect(employee.ssn).to.be.equal('23534564356');
          })
          .then(() => done())
          .catch(done);
      });

      it('should not return error if operators are sent', done => {
        crud.findOne({where: {and: [{name: 'Jon'}, {ssn: '23534564356'}]}})
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Find', () => {
    let crud;

    beforeEach(done => {
      crud = Crud(engine, model);

      resetDatabase(['persons'])
        .then(() => loadFixtures({persons: crud}))
        .then(() => done())
        .catch(done);
    });

    it('should return matching records', done => {
      const id1 = '672ee20a-77a0-4670-ac19-17c73e588774';
      const id3 = '97392189-482b-410f-9581-4f5032b18e96';
      const query = {where: {or: [{id: id1}, {id: id3}]}};
      crud.find(query)
        .then(persons => {
          const actual = [id1, id3].join();
          const expected = persons.map(p => p.id).sort().join();
          expect(actual).to.be.equal(expected);
        })
        .then(() => done())
        .catch(done);
    });

    it('should find no record', done => {
      crud.find({where: {name: 'Jon', lastName: 'Nope'}})
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });

    it('should return error if unknown fields are sent', done => {
      crud.find({where: {unknown: 'field'}})
        .then(data => unexpectedData(data || {}))
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done());
    });

    it('should not return error if operators are sent', done => {
      crud.find({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
        .then(() => done())
        .catch(done);
    });
  });

  describe('Count', () => {
    let crud;

    beforeEach(done => {
      crud = Crud(engine, model);
      resetDatabase(['persons'])
        .then(() => loadFixtures({persons: crud}))
        .then(() => done())
        .catch(done);
    });

    it('should return matching count', done => {
      const query = {where: {or: [
        {id: '672ee20a-77a0-4670-ac19-17c73e588774'},
        {id: '97392189-482b-410f-9581-4f5032b18e96'}
      ]}};
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
        .then(data => unexpectedData(data || {}))
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done());
    });

    it('should not return error if operators are sent', done => {
      crud.count({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
        .then(() => done())
        .catch(done);
    });
  });

  describe('Insert', () => {
    describe('Simple Model', () => {
      let crud;

      beforeEach(done => {
        crud = Crud(engine, model);
        resetDatabase(['persons'])
          .then(() => done());
      });

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
        const id = 'dab84df8-37dc-4e37-b17d-d451e9d68f77';
        crud.insert({id, name: 'Jon'})
          .then(person => {
            const expected = 'Jon';
            const actual = person.name;
            expect(actual).to.be.equal(expected);
            return person;
          })
          .then(person => crud.findOne({where: {id}}))
          .then(person => {
            const expected = 'Jon';
            const actual = person.name;
            expect(actual).to.be.equal(expected);
          })
          .then(() => done())
          .catch(done);
      });
    });

    describe('Extended Model', () => {
      let crud;

      beforeEach((done) => {
        const extended = defineModel({
          collection: 'employees',
          engine,
          definition: {
            personId: types.FOREIGN_KEY,
            schedule: types.STRING,
            entryDate: types.DATE,
            ssn: types.STRING
          }
        });
        extended.extend(model, 'personId');

        crud = Crud(engine, extended);
        resetDatabase(['persons', 'employees'])
          .then(() => loadFixtures({fullEmployee: crud}))
          .then(() => done())
          .catch(done);
      });

      it('returns error with unkown field', done => {
        crud.insert({unknown: 'Field'})
          .then(unexpectedData)
          .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
          .then(() => done())
          .catch(done);
      });

      it('creates records in child and parent models, returns combination', done => {
        const id = 'dab84df8-37dc-4e37-b17d-d451e9d68f77';
        crud.insert({id, name: 'Jon', ssn: '3412312'})
          .then(person => {
            const expected = 'Jon';
            const actual = person.name;
            expect(actual).to.be.equal(expected);
            return person;
          })
          .then(person => {
            return crud.findOne({where: {id}});
          })
          .then(person => {
            const expected = 'Jon';
            const actual = person.name;
            expect(actual).to.be.equal(expected);
          })
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Upsert', () => {
    let crud;

    before(() => {
      model.validatesUniquenessOf('rating');
    });

    beforeEach(done => {
      crud = Crud(engine, model);
      resetDatabase(['persons'])
        .then(() => loadFixtures({persons: crud}))
        .then(() => done())
        .catch(done);
    });

    it('returns promise', () => {
      const data = {name: 'Jon'};
      const actual = crud.upsert(data).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('inserts when no conflict', done => {
      const id = 'dab84df8-37dc-4e37-b17d-d451e9d68f77';
      const data = {
        id,
        name: 'Gus',
        lastName: 'Ortiz',
        rating: 10,
        job: {title: 'Programmer'}
      };
      const expectCorrectPerson = person => {
        expect(person.name).to.be.equal('Gus');
        expect(person.lastName).to.be.equal('Ortiz');
        expect(person.id).to.be.equal(id);
      };
      crud.upsert(data)
        .then(expectCorrectPerson)
        .then(() => model.findOne({where: {id}}))
        .then(expectCorrectPerson)
        .then(() => done())
        .catch(done);
    });

    it('updates record when there is conflict', done => {
      const id = 'dab84df8-37dc-4e37-b17d-d451e9d68f77';
      const id1 = '672ee20a-77a0-4670-ac19-17c73e588774';
      const data = {
        id,
        name: 'Gus',
        lastName: 'Ortiz',
        rating: 1,
        job: {title: 'Programmer'}
      };
      const expectCorrectPerson = person => {
        expect(person.name).to.be.equal('Gus');
        expect(person.lastName).to.be.equal('Ortiz');
      };
      crud.upsert(data)
        .then(expectCorrectPerson)
        .then(() => model.findOne({where: {id: id1}}))
        .then(expectCorrectPerson)
        .then(() => done())
        .catch(done);
    });
  });

  describe('Update', () => {
    describe('Single Model', () => {
      let crud;

      beforeEach(done => {
        crud = Crud(engine, model);
        resetDatabase(['persons'])
          .then(() => loadFixtures({persons: crud}))
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

      it('should update property in json field', done => {
        const query = {where: {id: '672ee20a-77a0-4670-ac19-17c73e588774'}};
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

    describe('Extended Model', () => {
      let crud;

      beforeEach((done) => {
        const extended = defineModel({
          collection: 'employees',
          engine,
          definition: {
            personId: types.FOREIGN_KEY,
            schedule: types.STRING,
            entryDate: types.DATE,
            ssn: types.STRING
          }
        });
        extended.extend(model, 'personId');

        crud = Crud(engine, extended);
        resetDatabase(['persons', 'employees'])
          .then(() => loadFixtures({fullEmployee: crud}))
          .then(() => done())
          .catch(done);
      });

      it('should update both existing records', done => {
        const query = {where: {name: 'Jon'}};
        const data = {lastName: 'Not Doe', ssn: 'new ssn'};
        const expectUpdate = person => {
          expect(person.lastName).to.be.equal('Not Doe');
          expect(person.ssn).to.be.equal('new ssn');
          return person;
        };

        crud.update(query, data)
          .then(expectUpdate)
          .then(person => crud.findOne({where: data}))
          .then(expectUpdate)
          .then(() => done())
          .catch(done);
      });

      it('should update both existing records', done => {
        const query = {where: {or: [{name: 'Luis'}, {lastName: 'Argumedo'}]}};
        const data = {name: 'Taylor', lastName: 'Duncan', ssn: '74170'};
        const expectUpdate = person => {
          expect(person.name).to.be.equal('Taylor');
          expect(person.lastName).to.be.equal('Duncan');
          expect(person.ssn).to.be.equal('74170');
          return person;
        };

        crud.update(query, data)
          .then(expectUpdate)
          .then(person => crud.findOne({where: data}))
          .then(expectUpdate)
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Remove', () => {
    let crud;

    beforeEach(done => {
      crud = Crud(engine, model);
      resetDatabase(['persons'])
        .then(() => loadFixtures({persons: crud}))
        .then(() => done())
        .catch(done);
    });

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
      const id1 = '672ee20a-77a0-4670-ac19-17c73e588774';
      const id3 = '97392189-482b-410f-9581-4f5032b18e96';
      const query = {where: {or: [{name: 'Jon'}, {lastName: 'Arias'}]}};
      crud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(2);
          expect(persons.map(p => p.id).sort().join())
            .to.be.equal([id1, id3].sort().join());
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
          expect(persons.map(p => p.rating).sort().join()).to.be.equal([2, 4, 5, 6].join());
          return persons;
        })
        .then(() => crud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });
  });
});
