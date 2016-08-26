const omit = require('lodash/omit');

const unexpectedData = require('test/test-helpers/unexpected-data');
const {postgres} = require('lib/engines');
const Crud = require('lib/model/crud');
const engine = postgres({database: 'test'});
const driver = engine.name;

const {defineModel, types} = require('lib/model/definition');

const loadFixtures = require('test/data/fixtures');
const resetDatabase = require('test/data/fixtures/reset-database')(driver);
const positionsFixtures = require('test/data/fixtures/positions');

const BAD_INPUT = 'BAD_INPUT';

describe('Postgres Crud', () => {
  let model;

  describe('Find One', () => {
    beforeEach(() => {
      model = require('test/test-helpers/build-single-table-schema')(engine);
    });

    describe('Simple Model', () => {
      let crud;

      beforeEach(done => {
        crud = model;
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

        crud = extended;
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

    describe('Array', () => {
      let positionsModel;

      beforeEach((done) => {
        positionsModel = require('test/test-helpers/build-schema-with-unique-combined-index')(engine);

        resetDatabase(['positions'])
          .then(() => loadFixtures({positions: positionsModel}))
          .then(() => done())
          .catch(done);
      });

      it('should find the correct record', done => {
        positionsModel.findOne({where: {employees: {contains: 'Jon'}}})
          .then(record => {
            expect(record.name).to.be.equal('VoxFeed');
            expect(record.employees.includes('Jon')).to.be.true;
          })
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Find', () => {
    let crud;

    beforeEach(done => {
      model = require('test/test-helpers/build-single-table-schema')(engine);
      crud = model;

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
      model = require('test/test-helpers/build-single-table-schema')(engine);
      crud = model;
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
    beforeEach(() => {
      model = require('test/test-helpers/build-single-table-schema')(engine);
    });
    describe('Simple Model', () => {
      let crud;

      beforeEach(done => {
        crud = model;
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

    describe('Array', () => {
      let positionsModel;

      beforeEach((done) => {
        positionsModel = require('test/test-helpers/build-schema-with-unique-combined-index')(engine);

        resetDatabase(['positions'])
          .then(() => done())
          .catch(done);
      });

      it('should create a record', done => {
        const dataToSave = positionsFixtures[0];
        positionsModel.insert(dataToSave)
          .then(record => {
            expect(record.name).to.be.equal(dataToSave.name);
            expect(record.employees).to.be.deep.equal(dataToSave.employees);
          })
          .then(() => done())
          .catch(done);
      });

      it('should create a record with null on field type array', done => {
        const dataToSave = positionsFixtures[0];
        positionsModel.insert(omit(dataToSave, 'employees'))
          .then(record => {
            expect(record.name).to.be.equal(dataToSave.name);
            expect(record.employees).to.not.exist;
          })
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Upsert', () => {
    describe('Single Model', () => {
      let crud;

      beforeEach(done => {
        model = require('test/test-helpers/build-single-table-schema')(engine);
        crud = model;
        resetDatabase(['persons'])
          .then(() => loadFixtures({persons: crud}))
          .then(() => done())
          .catch(done);
      });

      describe('Single Index', () => {
        it('returns promise', () => {
          const data = {name: 'Jon'};
          const actual = crud.upsert(data, {where: {}}).constructor.name;
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
          crud.upsert(data, {where: {}})
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

          model.upsert(data, {where: {rating: 1}})
            .then(expectCorrectPerson)
            .then(() => model.findOne({where: {id: id1}}))
            .then(expectCorrectPerson)
            .then(() => done())
            .catch(done);
        });

        it('uses primary key if no unique indexes present', done => {
          const noIndexesModel = defineModel({
            collection: 'persons',
            engine,
            definition: {
              id: types.PRIMARY_KEY,
              name: types.STRING,
              lastName: types.STRING
            }
          });
          noIndexesModel.setPrimaryKey('id');
          const id = '672ee20a-77a0-4670-ac19-17c73e588774';
          const expectCorrectPerson = person => {
            expect(person.name).to.be.equal('Gus');
            expect(person.lastName).to.be.equal('Ortiz');
          };
          const {upsert, findOne} = Crud(engine, noIndexesModel);
          upsert({
            id,
            name: 'Gus',
            lastName: 'Ortiz'
          })
          .then(expectCorrectPerson)
          .then(() => findOne({where: {id}}))
          .then(expectCorrectPerson)
          .then(() => done())
          .catch(done);
        });
      });

      describe('Combined Index', () => {
        beforeEach(() => {
          const schema = {
            id: types.UUID,
            name: types.STRING,
            lastName: types.STRING,
            rating: types.INTEGER,
            job: types.JSON,
            age: types.INTEGER,
            tracked: types.BOOLEAN,
            createdAt: types.DATE
          };
          model = defineModel({
            collection: 'persons',
            engine,
            definition: schema
          });

          model.setPrimaryKey('id');
          model.unique({combined: ['lastName', 'rating']});
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
          crud.upsert(data, {where: {}})
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
            lastName: 'Doe',
            rating: 1,
            job: {title: 'Programmer'}
          };
          const expectCorrectPerson = person => {
            expect(person.name).to.be.equal('Gus');
            expect(person.lastName).to.be.equal('Doe');
          };

          crud.upsert(data, {where: {rating: 1, lastName: 'Doe'}})
            .then(expectCorrectPerson)
            .then(() => model.findOne({where: {id: id1}}))
            .then(expectCorrectPerson)
            .then(() => done())
            .catch(done);
        });
      });
    });

    describe('Extended Model', () => {
      beforeEach(done => {
        model = require('test/test-helpers/build-single-table-schema')(engine);
        resetDatabase(['persons'])
          .then(() => loadFixtures({persons: model}))
          .then(() => done())
          .catch(done);
      });

      it('inserts when no conflict in both tables', done => {
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
          expect(person.rating).to.be.equal(10);
          expect(person.job).to.have.property('title', 'Programmer');
          expect(person.id).to.be.equal(id);
        };
        model.upsert(data, {where: {}})
          .then(expectCorrectPerson)
          .then(() => model.findOne({where: {id}}))
          .then(expectCorrectPerson)
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Update', () => {
    describe('Single Model', () => {
      let crud;

      beforeEach(done => {
        model = require('test/test-helpers/build-single-table-schema')(engine);
        crud = model;
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

      it('should update single existing record ignoring id', done => {
        const query = {where: {name: 'Jon'}};
        const data = {id: '2', lastName: 'Not Doe'};
        const expectUpdate = person => {
          expect(person.lastName).to.be.equal('Not Doe');
          expect(person.id).not.to.be.equal('2');
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

      beforeEach(done => {
        model = require('test/test-helpers/build-single-table-schema')(engine);
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

      it('should update correctly with json in data', done => {
        const query = {where: {id: '672ee20a-77a0-4670-ac19-17c73e588774'}};
        const data = {job: {title: 'QA'}, ssn: '74170'};
        const expectUpdate = person => {
          expect(person.name).to.be.equal('Jon');
          expect(person.lastName).to.be.equal('Doe');
          expect(person.ssn).to.be.equal('74170');
          expect(person.job).to.have.property('title', 'QA');
          return person;
        };

        crud.update(query, data)
          .then(expectUpdate)
          .then(person => crud.findOne(query))
          .then(expectUpdate)
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Remove', () => {
    beforeEach(() => {
      model = require('test/test-helpers/build-single-table-schema')(engine);
    });

    describe('Single Model', () => {
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
          .then(() => crud.find(query))
          .then(persons => expect(persons.length).to.be.equal(0))
          .then(() => done())
          .catch(done);
      });

      it('should remove correct record with one field', done => {
        const query = {where: {name: 'Jon'}};
        crud.remove(query)
          .then(person => crud.findOne(query))
          .then(person => expect(person).not.to.exist)
          .then(() => done())
          .catch(done);
      });

      it('should remove correct records with or operator', done => {
        const query = {where: {or: [{name: 'Jon'}, {lastName: 'Arias'}]}};
        crud.remove(query)
          .then(() => crud.find(query))
          .then(persons => expect(persons.length).to.be.equal(0))
          .then(() => done())
          .catch(done);
      });

      it('should create correct records for single json inner query', done => {
        const query = {where: {'job.title': 'Programmer'}};
        crud.remove(query)
          .then(() => crud.find(query))
          .then(persons => expect(persons.length).to.be.equal(0))
          .then(() => done())
          .catch(done);
      });
    });

    describe('Extended Model', () => {
      let crud;

      beforeEach(done => {
        const buildModel = require('test/test-helpers/build-extended-table-schema');
        const extended = buildModel(engine, model);

        crud = Crud(engine, extended);

        resetDatabase(['persons', 'employees'])
          .then(() => loadFixtures({fullEmployee: crud}))
          .then(() => done())
          .catch(done);
      });

      it('removes both records with query in both tables', done => {
        const query = {where: {name: 'Jon', ssn: '23534564356'}};
        crud.find(query)
          .then(employees => expect(employees.length).to.be.equal(1))
          .then(() => crud.remove(query))
          .then(() => crud.find(query))
          .then(employees => expect(employees.length).to.be.equal(0))
          .then(() => done())
          .catch(done);
      });

      it('removes both records with just the id', done => {
        const id = 'f8769847-a272-42fc-a09a-1f27d5b58176';
        const query = {where: {id}};
        crud.find(query)
          .then(employees => expect(employees.length).to.be.equal(1))
          .then(() => crud.remove(query))
          .then(() => crud.find(query))
          .then(employees => expect(employees.length).to.be.equal(0))
          .then(() => done())
          .catch(done);
      });

      it('removes all records with no query', done => {
        const query = {where: {}};
        crud.find(query)
          .then(employees => expect(employees.length).to.be.equal(6))
          .then(() => crud.remove(query))
          .then(() => crud.find(query))
          .then(employees => expect(employees.length).to.be.equal(0))
          .then(() => done())
          .catch(done);
      });
    });
  });
});
