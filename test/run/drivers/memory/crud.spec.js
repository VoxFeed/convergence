const {isArray, isPlainObject, pick, omit} = require('lodash');
const uuid = require('uuid-v4');

const {memory} = require('lib/engines');
const Crud = require('lib/model/crud');
const {types, defineModel} = require('lib/model/definition');

const personsFixtures = require('test/data/fixtures/persons');
const employeesFixtures = require('test/data/fixtures/employees');
const buildPersonModel = require('test/test-helpers/build-single-table-schema');
const buildEmployeeModel = require('test/test-helpers/build-extended-table-schema');
const unexpectedData = require('test/test-helpers/unexpected-data');

const store = {};
const engine = memory(store);
const personModel = buildPersonModel(engine);
const employeeModel = buildEmployeeModel(engine, personModel);

const loadFixtures = require('test/data/fixtures');
const resetDatabase = require('test/data/fixtures/reset-memory');

const BAD_INPUT = 'BAD_INPUT';
const CANT_INSERT_RECORD = 'CANT_INSERT_RECORD';
const CANT_UPSERT_RECORD = 'CANT_UPSERT_RECORD';

describe('Memory Crud', () => {
  let personsCrud;
  let employeesCrud;

  describe('Find One', () => {
    describe('Simple Model', () => {
      beforeEach(done => {
        personsCrud = Crud(engine, personModel);
        resetDatabase({persons: personModel}, store)
        .then(() => loadFixtures({persons: personsCrud}))
        .then(() => done())
        .catch(done);
      });

      it('returns a promise', () => {
        const actual = personsCrud.findOne({where: {name: 'Jon'}}).constructor.name;
        const expected = 'Promise';
        expect(actual).to.be.equal(expected);
      });

      it('should find by primary key', done => {
        personsCrud.findOne({where: {'id': personsFixtures[2].id}})
          .then(record => {
            expect(record).to.be.deep.equal(personsFixtures[2]);
          })
          .then(() => done())
          .catch(done);
      });

      it('returns an error if unknown fields are sent', (done) => {
        personsCrud.findOne({where: {unknown: 'field'}})
          .then(() => done('unexpected data'))
          .catch((error) => {
            expect(error.name).to.be.equal(BAD_INPUT);
            done();
          });
      });

      it('should return a plain object', (done) => {
        personsCrud.findOne({where: {name: 'Jon'}})
          .then(record => {
            expect(isPlainObject(record)).to.be.true;
          })
          .then(() => done())
          .catch(done);
      });

      it('should return first object found', (done) => {
        personsCrud.findOne({where: {'job.title': 'Programmer'}})
          .then(record => {
            expect(record).to.be.deep.equal(personsFixtures[1]);
          })
          .then(() => done())
          .catch(done);
      });
    });

    describe('Extended Model', () => {
      beforeEach(done => {
        employeesCrud = Crud(engine, employeeModel);
        resetDatabase({persons: personModel, employees: employeeModel}, store)
          .then(() => loadFixtures({fullEmployee: employeesCrud}))
          .then(() => done())
          .catch(done);
      });

      it('should find by primary key', done => {
        employeesCrud.findOne({where: {personId: employeesFixtures[2].personId}})
          .then(record => {
            expect(record).to.be.deep.equal(Object.assign({}, personsFixtures[2], employeesFixtures[2]));
          })
          .then(() => done())
          .catch(done);
      });

      it('should return object when fetch a compose object', (done) => {
        const recordExpected = Object.assign({}, personsFixtures[1], employeesFixtures[1]);
        employeesCrud.findOne({where: {'job.title': 'Programmer'}})
          .then(record => {
            expect(record).to.be.deep.equal(recordExpected);
          })
          .then(() => done())
          .catch(done);
      });

      it('should find by unique index key', (done) => {
        const recordExpected = Object.assign({}, personsFixtures[1], employeesFixtures[1]);
        employeesCrud.findOne({where: {ssn: employeesFixtures[1].ssn}})
          .then(record => {
            expect(record).to.be.deep.equal(recordExpected);
          })
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Find', () => {
    describe('Simple Model', () => {
      beforeEach(done => {
        personsCrud = Crud(engine, personModel);
        resetDatabase({persons: personModel}, store)
        .then(() => loadFixtures({persons: personsCrud}))
        .then(() => done())
        .catch(done);
      });

      it('returns the correct records', (done) => {
        const query = {
          where: { or: [
            {id: personsFixtures[0].id},
            {id: personsFixtures[2].id}
          ]}
        };
        personsCrud.find(query)
          .then((persons) => {
            const ids = persons.map(person => person.id);
            expect(ids).to.be.deep.equal(ids);
            done();
          })
          .catch(done);
      });

      it('returns an empty array when not found records', (done) => {
        const query = {where: {name: 'Jon', lastName: 'Snow'}};
        personsCrud.find(query)
          .then((response) => expect(response).to.be.empty)
          .then(() => done())
          .catch(done);
      });

      it('throws an error when unknown fields are sent', (done) => {
        personsCrud.find({where: {unknown: 'field'}})
          .then(() => done('unexpected data'))
          .catch((error) => {
            expect(error.name).to.be.equal(BAD_INPUT);
            done();
          });
      });

      it('returns an array when filter has operators', (done) => {
        const query = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        personsCrud.find(query)
          .then((response) => {
            expect(isArray(response)).to.be.true;
            expect(response).to.not.be.empty;
            done();
          })
          .catch(done);
      });

      it('should find value with regex with insensitive case', (done) => {
        const uql = {where: {'job.title': {regex: 'gram', options: 'i'}}};
        const expected = [2, 4, 5, 6];
        personsCrud.find(uql)
          .then(data => {
            const actual = data.map(p => p.rating);
            expect(actual).to.be.deep.equal(expected);
            done();
          })
          .catch(done);
      });

      it('should find value with regex with sensitive case', (done) => {
        const uql = {where: {'job.title': {regex: 'gRam'}}};
        personsCrud.find(uql)
          .then(data => {
            expect(data).to.be.empty;
            done();
          })
          .catch(done);
      });

      it('should find value with regex with sensitive case at the start', (done) => {
        const uql = {where: {'job.title': {regex: 'Progr'}}};
        const expected = [2, 4, 5, 6];
        personsCrud.find(uql)
          .then(data => {
            const actual = data.map(p => p.rating);
            expect(actual).to.be.deep.equal(expected);
            done();
          })
          .catch(done);
      });
    });

    describe('Extended Model', () => {
      beforeEach(done => {
        employeesCrud = Crud(engine, employeeModel);
        resetDatabase({persons: personModel, employees: employeeModel}, store)
          .then(() => loadFixtures({fullEmployee: employeesCrud}))
          .then(() => done())
          .catch(done);
      });

      it('should return an array', (done) => {
        const query = {where: {'job.title': 'Programmer'}};
        employeesCrud.find(query)
          .then((response) => {
            expect(response.length).to.be.equal(4);
            response.forEach(item => {
              expect(response.id).to.be.equal(response.personId);
            });
            done();
          })
          .catch(done);
      });
    });

    describe('Array', () => {
      let positionsModel;
      let positionsCrud;

      beforeEach((done) => {
        positionsModel = require('test/test-helpers/build-schema-with-unique-combined-index')(engine);
        positionsCrud = Crud(engine, positionsModel);

        resetDatabase({positions: positionsModel}, store)
          .then(() => loadFixtures({positions: positionsCrud}))
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

  describe('Count', () => {
    it('should return matching count', (done) => {
      const query = {where: {'job.title': 'Programmer'}};
      personsCrud.count(query)
        .then(count => expect(count).to.be.equal(4))
        .then(() => done())
        .catch(done);
    });

    it('should return 0', done => {
      personsCrud.count({where: {name: 'Jon', lastName: 'Nope'}})
        .then(count => expect(count).to.be.equal(0))
        .then(() => done())
        .catch(done);
    });

    it('should return error if unknown fields are sent', done => {
      personsCrud.count({where: {unknown: 'field'}})
        .then(() => done('unexpected data'))
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done());
    });

    it('should not return error if operators are sent', done => {
      personsCrud.count({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
        .then(() => done())
        .catch(done);
    });
  });

  describe('Insert', () => {
    describe('Simple', () => {
      beforeEach(done => {
        personsCrud = Crud(engine, personModel);
        resetDatabase({persons: personModel}, store)
        .then(() => done())
        .catch(done);
      });

      it('should return promise', () => {
        const actual = personsCrud.insert({name: 'Jon'}).constructor.name;
        const expected = 'Promise';
        expect(actual).to.be.equal(expected);
      });

      it('should return error when trying to insert unkown field', done => {
        personsCrud.insert({unknown: 'Field'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
      });

      it('should create record', done => {
        personsCrud.insert({id: uuid(), name: 'Jon'})
        .then(person => {
          const expected = 'Jon';
          const actual = person.name;
          expect(actual).to.be.equal(expected);
          return person;
        })
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(person => {
          const expected = 'Jon';
          const actual = person.name;
          expect(actual).to.be.equal(expected);
        })
        .then(() => done())
        .catch(done);
      });

      it('should returns error when primary key already exists', done => {
        personsCrud.insert(personsFixtures[0])
        .then(() => personsCrud.insert(omit(personsFixtures[0], 'rating')))
        .then(unexpectedData)
        .catch(error => expect(error.name).to.be.equal(CANT_INSERT_RECORD))
        .then(() => done())
        .catch(done);
      });

      it('should returns error when uniqueIndex already exists', done => {
        personsCrud.insert(personsFixtures[0])
        .then(() => personsCrud.insert(omit(personsFixtures[0], 'id')))
        .then(unexpectedData)
        .catch(error => expect(error.name).to.be.equal(CANT_INSERT_RECORD))
        .then(() => done())
        .catch(done);
      });
    });

    describe('Extended', () => {
      beforeEach(done => {
        employeesCrud = Crud(engine, employeeModel);
        resetDatabase({persons: personModel, employees: employeeModel}, store)
          .then(() => done())
          .catch(done);
      });

      it('should create record', done => {
        const data = {
          id: uuid(),
          name: 'Jane',
          lastName: 'Doe',
          age: 25,
          schedule: '09:30 - 18:30',
          entryDate: new Date('2016-07-26T00:00:00.000Z'),
          ssn: '465154654561'
        };

        employeesCrud.insert(data)
        .then(person => {
          const expected = 'Jane';
          const actual = person.name;
          expect(actual).to.be.equal(expected);
          return person;
        })
        .then(employee => personsCrud.findOne({where: {id: employee.id}}))
        .then(person => {
          expect(person.name).to.be.equal('Jane');
          expect(person.ssn).to.not.exist;
          return employeesCrud.findOne({where: {id: person.id}});
        })
        .then(employee => {
          expect(employee.name).to.be.equal('Jane');
          expect(employee.ssn).to.be.equal('465154654561');
          expect(employee.id).to.be.equal(employee.personId);
        })
        .then(() => done())
        .catch(done);
      });
    });
  });

  describe('Update', () => {
    describe('Simple', () => {
      beforeEach(done => {
        personsCrud = Crud(engine, personModel);
        resetDatabase({persons: personModel}, store)
        .then(() => loadFixtures({persons: personsCrud}))
        .then(() => done())
        .catch(done);
      });

      it('should update single existing record', done => {
        const query = {where: {id: personsFixtures[0].id}};
        const data = {lastName: 'Not Doe'};
        const expectUpdate = person => {
          const expected = 'Not Doe';
          const actual = person.lastName;
          expect(actual).to.be.equal(expected);
          return person;
        };

        personsCrud.update(query, data)
        .then(expectUpdate)
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
      });

      it('should update multiple records', done => {
        const query = {where: {'job.title': 'Programmer'}};
        const data = {job: {companyName: 'new value', title: 'Programmer'}};
        const expectUpdate = persons => {
          return persons.map(person => {
            expect(person.job).to.have.property('companyName', 'new value');
            return person;
          });
        };

        personsCrud.update(query, data)
        .then(expectUpdate)
        .then(persons => personsCrud.find(query))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
      });

      it('should return error when trying to update with unkown field in data', done => {
        const query = {where: {name: 'Jon'}};
        const data = {unknown: 'Field'};
        personsCrud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal(BAD_INPUT);
          done();
        });
      });

      it('should return error when trying to update with unkown field in query', done => {
        const query = {where: {unknown: 'Field'}};
        const data = {name: 'Jon'};
        personsCrud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal(BAD_INPUT);
          done();
        });
      });
    });

    describe('Extended Model', () => {
      beforeEach(done => {
        employeesCrud = Crud(engine, employeeModel);
        resetDatabase({persons: personModel, employees: employeeModel}, store)
          .then(() => loadFixtures({fullEmployee: employeesCrud}))
          .then(() => done())
          .catch(done);
      });

      it('should return error if keyword where is missing', done => {
        const query = {name: 'Jon'};
        const data = {lastName: 'doe'};
        employeesCrud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal(BAD_INPUT);
          done();
        });
      });

      it('should update property in json field', done => {
        const query = {where: {id: personsFixtures[0].id}};
        const data = {'job.companyName': 'new value'};
        const expectUpdate = person => {
          expect(person.job).to.have.property('companyName', 'new value');
          return person;
        };

        employeesCrud.update(query, data)
        .then(expectUpdate)
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
      });

      it('should update extended model', done => {
        const query = {where: {id: personsFixtures[0].id}};
        const data = {'job.companyName': 'new value'};
        const expectUpdate = person => {
          expect(person.job).to.have.property('companyName', 'new value');
          return person;
        };

        employeesCrud.update(query, data)
        .then(expectUpdate)
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(person => employeesCrud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
      });
    });
  });

  describe('Upsert', () => {
    describe('Simple', () => {
      beforeEach(done => {
        personsCrud = Crud(engine, personModel);
        resetDatabase({persons: personModel}, store)
        .then(() => loadFixtures({persons: personsCrud}))
        .then(() => done())
        .catch(done);
      });

      it('should update single existing record', done => {
        const person = Object.assign({}, personsFixtures[0]);
        person.lastName = 'Not Doe';
        const expectUpsert = person => {
          const expected = 'Not Doe';
          const actual = person.lastName;
          expect(actual).to.be.equal(expected);
          return person;
        };

        personsCrud.upsert(person, {where: pick(person, 'rating')})
          .then(expectUpsert)
          .then(person => personsCrud.findOne({where: {id: person.id}}))
          .then(expectUpsert)
          .then(() => done())
          .catch(done);
      });

      it('should create new id when is not sent', done => {
        const personData = {
          name: 'Jane',
          lastName: 'Doe',
          age: 25,
          rating: 7
        };
        const query = {where: {rating: 7}};

        personsCrud.findOne(query)
          .then(person => {
            expect(person).to.be.undefined;
            return personsCrud.upsert(personData, {where: pick(personData, 'rating')});
          })
          .then(person => personsCrud.findOne(query))
          .then(person => {
            expect(person.id).to.be.exist;
            expect(person.name).to.be.equal('Jane');
            expect(person.age).to.be.equal(25);
            done();
          })
          .catch(done);
      });

      it('should returns error when primary key already exists', done => {
        personsCrud.upsert(omit(personsFixtures[0], 'rating'), {where: {rating: 100}})
        .then(unexpectedData)
        .catch(error => expect(error.name).to.be.equal(CANT_UPSERT_RECORD))
        .then(() => done())
        .catch(done);
      });

      it('should returns error when uniqueIndex already exists', done => {
        personsCrud.upsert(omit(personsFixtures[0], 'id'), {where: {id: 100}})
        .then(unexpectedData)
        .catch(error => expect(error.name).to.be.equal(CANT_UPSERT_RECORD))
        .then(() => done())
        .catch(done);
      });

      it('should upsert correctly when the same record is sent several times', done => {
        const personData = {
          id: uuid(),
          name: 'Jane',
          lastName: 'Doe',
          age: 25,
          rating: 7
        };
        const query = {where: {rating: 7}};
        const promises = [1, 2, 3, 4].map(a => personsCrud.upsert(personData, query));
        Promise.all(promises)
          .then(() => personsCrud.find(query))
          .then(result => {
            expect(result.length).to.be.equal(1);

            Object.keys(personData).forEach(key => {
              expect(result[0][key]).to.be.equal(personData[key]);
            });
            done();
          })
          .catch(err => {
            console.log('ERROR', err);
            done(err);
          });
      });
    });

    describe('Extended Model', () => {
      beforeEach(done => {
        employeesCrud = Crud(engine, employeeModel);
        resetDatabase({persons: personModel, employees: employeeModel}, store)
          .then(() => loadFixtures({fullEmployee: employeesCrud}))
          .then(() => done())
          .catch(done);
      });

      it('should upsert extended model', done => {
        const employee = Object.assign({}, employeesFixtures[0]);
        employee.schedule = '10:00 - 14:00';
        employee.lastName = 'Dane';
        const expectUpdate = employee => {
          expect(employee).to.have.property('schedule', '10:00 - 14:00');
          expect(employee).to.have.property('lastName', 'Dane');
          return employee;
        };

        employeesCrud.upsert(employee, {where: pick(employee, 'ssn')})
          .then(expectUpdate)
          .then(employee => employeesCrud.findOne({where: {personId: employee.id}}))
          .then(employee => {
            expect(employee).to.have.property('lastName', 'Dane');
            return employee;
          })
          .then(person => employeesCrud.findOne({where: {id: person.id}}))
          .then(expectUpdate)
          .then(() => done())
          .catch(done);
      });

      it('should return error when trying to upsert with unkown field in data', done => {
        const employee = Object.assign({}, personsFixtures[0], employeesFixtures[0]);
        employee.unknown = 'Field';
        employeesCrud.upsert(employee)
          .then(() => done('unexpected data'))
          .catch(err => {
            expect(err.name).to.be.equal(BAD_INPUT);
            done();
          });
      });

      it('should insert record when it does not exists', done => {
        const personId = uuid();
        const employeeData = {
          id: personId,
          name: 'Jane',
          personId: personId,
          lastName: 'Doe',
          age: 25,
          schedule: '09:30 - 18:30',
          entryDate: new Date('2016-07-26T00:00:00.000Z'),
          ssn: '465154654561'
        };
        const query = {where: {id: personId}};

        employeesCrud.findOne(query)
          .then(employee => {
            expect(employee).to.be.undefined;
            return employeesCrud.upsert(employeeData, {where: pick(employeeData, 'ssn')});
          })
          .then(employee => personsCrud.findOne(query))
          .then(person => {
            expect(person.id).to.be.equal(personId);
            expect(person.name).to.be.equal('Jane');
            expect(person.age).to.be.equal(25);
            return employeesCrud.findOne({where: {personId: person.id}});
          })
          .then(employee => {
            expect(employee.personId).to.be.equal(personId);
            expect(employee.schedule).to.be.equal('09:30 - 18:30');
            expect(employee.ssn).to.be.equal('465154654561');
            done();
          })
          .catch(done);
      });
    });

    it('should return error when unique index and primary key are not defined', done => {
      const collection = 'new_model';
      const definition = {
        id: types.PRIMARY_KEY,
        name: types.STRING
      };
      const recordId = uuid();
      const newEngine = memory({});
      const newModel = defineModel({collection, definition, engine: newEngine});
      const newModelCrud = Crud(newEngine, newModel);

      newModelCrud.upsert({id: recordId, name: 'Jon'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal('BAD_INDEXES_FOR_UPSERT'))
        .then(() => done())
        .catch(done);
    });

    describe('Combined Unique Index', () => {
      let newModelCrud;
      const collection = 'new_model';
      const definition = {
        id: types.PRIMARY_KEY,
        name: types.STRING,
        code: types.STRING,
        sex: types.STRING
      };

      const fixtures = [
        {id: uuid(), name: 'Jon', code: '111', sex: 'm'},
        {id: uuid(), name: 'Jane', code: '111', sex: 'f'},
        {id: uuid(), name: 'Dough', code: '333', sex: 'm'},
        {id: uuid(), name: 'Mary', code: '333', sex: 'f'},
        {id: uuid(), name: 'Bob', code: '444', sex: 'm'}
      ];

      const loadFixtures = (crud) => {
        const promises = fixtures.map(item => crud.insert(item));
        return Promise.all(promises);
      };

      beforeEach(done => {
        const newEngine = memory({});
        const newModel = defineModel({collection, definition, engine: newEngine});
        newModel.unique({combined: ['code', 'sex']});
        newModel.setPrimaryKey('id');
        newModelCrud = Crud(newEngine, newModel);
        loadFixtures(newModelCrud).then(() => done());
      });

      it('should upsert correct record', done => {
        const data = Object.assign({}, fixtures[1]);
        data.name = 'Fulano';
        const expectedData = (newModel) => {
          expect(newModel.id).to.be.equal(data.id);
          expect(newModel.name).to.be.equal('Fulano');
          expect(newModel.code).to.be.equal('111');
          expect(newModel.sex).to.be.equal('f');
          return newModel;
        };
        newModelCrud.upsert(data, {where: pick(data, ['code', 'sex'])})
          .then(expectedData)
          .then(newModel => newModelCrud.findOne({where: {id: data.id}}))
          .then(expectedData)
          .then(newModel => newModelCrud.find({where: {code: '111'}}))
          .then(() => done())
          .catch(done);
      });

      it('should insert correct record', done => {
        const data = {name: 'Alex', code: '444', sex: 'f'};

        newModelCrud.count({where: {}})
          .then(count => {
            expect(count).to.be.equal(5);
            return count;
          })
          .then(() => newModelCrud.upsert(data, {where: pick(data, ['code', 'sex'])}))
          .then(newModel => {
            expect(newModel.name).to.be.equal('Alex');
            expect(newModel.code).to.be.equal('444');
            expect(newModel.sex).to.be.equal('f');
            return newModelCrud.count({where: {}});
          })
          .then(newModel => newModelCrud.count({where: {}}))
          .then(count => {
            expect(count).to.be.equal(6);
            return count;
          })
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Primary Key Index', () => {
    let newModelCrud;
    const collection = 'new_model';
    const definition = {
      id: types.PRIMARY_KEY,
      name: types.STRING,
      code: types.STRING,
      sex: types.STRING
    };

    const fixtures = [
      {id: uuid(), name: 'Jon', code: '111', sex: 'm'},
      {id: uuid(), name: 'Jane', code: '111', sex: 'f'},
      {id: uuid(), name: 'Dough', code: '333', sex: 'm'},
      {id: uuid(), name: 'Mary', code: '333', sex: 'f'},
      {id: uuid(), name: 'Bob', code: '444', sex: 'm'}
    ];

    const loadFixtures = (crud) => {
      const promises = fixtures.map(item => crud.insert(item));
      return Promise.all(promises);
    };

    beforeEach(done => {
      const newEngine = memory({});
      const newModel = defineModel({collection, definition, engine: newEngine});
      newModel.setPrimaryKey('id');
      newModelCrud = Crud(newEngine, newModel);
      loadFixtures(newModelCrud).then(() => done());
    });

    it('should upsert correct record', done => {
      const data = Object.assign({}, fixtures[1]);
      data.name = 'Fulano';
      const expectedData = (newModel) => {
        expect(newModel.id).to.be.equal(data.id);
        expect(newModel.name).to.be.equal('Fulano');
        expect(newModel.code).to.be.equal('111');
        expect(newModel.sex).to.be.equal('f');
        return newModel;
      };
      newModelCrud.upsert(data, {where: pick(data, 'id')})
        .then(expectedData)
        .then(newModel => newModelCrud.findOne({where: {id: data.id}}))
        .then(expectedData)
        .then(newModel => newModelCrud.find({where: {code: '111'}}))
        .then(() => done())
        .catch(done);
    });

    it('should insert correct record', done => {
      const data = {name: 'Alex', code: '444', sex: 'f'};

      newModelCrud.count({where: {}})
        .then(count => {
          expect(count).to.be.equal(5);
          return count;
        })
        .then(() => newModelCrud.upsert(data, {where: {id: 1}}))
        .then(newModel => {
          expect(newModel.name).to.be.equal('Alex');
          expect(newModel.code).to.be.equal('444');
          expect(newModel.sex).to.be.equal('f');
          return newModelCrud.count({where: {}});
        })
        .then(newModel => newModelCrud.count({where: {}}))
        .then(count => {
          expect(count).to.be.equal(6);
          return count;
        })
        .then(() => done())
        .catch(done);
    });
  });

  describe('Remove', () => {
    describe('Simple Model', () => {
      beforeEach(done => {
        personsCrud = Crud(engine, personModel);
        resetDatabase({persons: personModel}, store)
        .then(() => loadFixtures({persons: personsCrud}))
        .then(() => done())
        .catch(done);
      });

      it('should remove all records if no query is sent', done => {
        const query = {where: {}};

        personsCrud.remove(query)
        .then(persons => expect(persons.length).to.be.equal(6))
        .then(() => personsCrud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
      });

      it('should remove correct record with one field', done => {
        const query = {where: {name: 'Jon'}};
        personsCrud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(1);
          const person = persons.pop();
          expect(person.name).to.be.equal('Jon');
          return person;
        })
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(person => expect(person).not.to.exist)
        .then(() => done())
        .catch(done);
      });

      it('should remove correct records with or operator', done => {
        const query = {where: {or: [{name: 'Jon'}, {lastName: 'Arias'}]}};
        personsCrud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(2);
          const expectedIds = [personsFixtures[0].id, personsFixtures[2].id].sort();
          expect(persons.map(p => p.id).sort().join()).to.be.equal(expectedIds.join());
          return persons;
        })
        .then(() => personsCrud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
      });
    });

    describe('Extended Model', () => {
      beforeEach(done => {
        employeesCrud = Crud(engine, employeeModel);
        resetDatabase({persons: personModel, employees: employeeModel}, store)
          .then(() => loadFixtures({fullEmployee: employeesCrud}))
          .then(() => done())
          .catch(done);
      });

      it('should remove correct records for single json inner query', done => {
        const query = {where: {'job.title': 'Programmer'}};
        employeesCrud.remove(query)
        .then(employees => {
          expect(employees.length).to.be.equal(4);
          const expectedIds = [
            employeesFixtures[1].personsId,
            employeesFixtures[3].personsId,
            employeesFixtures[4].personsId,
            employeesFixtures[5].personsId
          ].sort();
          expect(employees.map(e => e.personsId).sort().join()).to.be.equal(expectedIds.join());
          return employees;
        })
        .then(() => employeesCrud.find(query))
        .then(employees => expect(employees.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
      });

      it('should remoe both records for extended model', done => {
        const query = {where: {id: personsFixtures[0].id}};
        employeesCrud.remove(query)
        .then(employees => {
          expect(employees.length).to.be.equal(1);
          expect(employees[0].id).to.be.equal(personsFixtures[0].id);
        })
        .then(() => personsCrud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
        .then(() => employeesCrud.find(query))
        .then(employees => expect(employees.length).to.be.equal(0))
        .then(() => done())
        .catch(done);
      });
    });
  });
});
