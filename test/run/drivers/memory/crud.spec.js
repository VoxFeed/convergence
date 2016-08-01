const isArray = require('lodash/isArray');
const isPlainObject = require('lodash/isPlainObject');
const snakeobj = require('snakeobj');
const uuid = require('uuid-v4');

const {memory} = require('lib/engines');
const Crud = require('lib/model/crud');
const {types, defineModel} = require('lib/model/definition');

const personsFixtures = require('test/data/fixtures/persons');
const employeesFixtures = require('test/data/fixtures/employees');
const buildPersonModel = require('test/test-helpers/build-single-table-schema');
const buildEmployeeModel = require('test/test-helpers/build-extended-table-schema');
const unexpectedData = require('test/test-helpers/unexpected-data');

describe('Memory Crud', () => {
  let personsCrud;
  let employeesCrud;

  beforeEach(() => {
    const store = {
      'persons': personsFixtures.map(person => snakeobj(person)),
      'employees': employeesFixtures.map(emp => snakeobj(emp))
    };

    const engine = memory(store);
    const personModel = buildPersonModel(engine);
    const employeeModel = buildEmployeeModel(engine, personModel);

    personsCrud = Crud(engine, personModel);
    employeesCrud = Crud(engine, employeeModel);
  });

  describe('Find One', () => {
    it('returns a promise', () => {
      const actual = personsCrud.findOne({where: {name: 'Jon'}}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('returns an error if unknown fields are sent', (done) => {
      personsCrud.findOne({where: {unknown: 'field'}})
        .then(() => done('unexpected data'))
        .catch((error) => {
          expect(error.name).to.be.equal('BAD_INPUT');
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

    it('should return object when fetch a compose object', (done) => {
      const recordExpected = Object.assign({}, personsFixtures[1], employeesFixtures[1]);
      employeesCrud.findOne({where: {'job.title': 'Programmer'}})
        .then(record => {
          expect(record).to.be.deep.equal(recordExpected);
        })
        .then(() => done())
        .catch(done);
    });
  });

  describe('Find', () => {
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
          expect(error.name).to.be.equal('BAD_INPUT');
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

    it('returns an array when model is extended', (done) => {
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
        .catch(err => expect(err.name).to.be.equal('BAD_INPUT'))
        .then(() => done());
    });

    it('should not return error if operators are sent', done => {
      personsCrud.count({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
        .then(() => done())
        .catch(done);
    });
  });

  describe('Insert', () => {
    it('should return promise', () => {
      const actual = personsCrud.insert({name: 'Jon'}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('should return error when trying to insert unkown field', done => {
      personsCrud.insert({unknown: 'Field'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal('BAD_INPUT'))
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

    it('should create record with extended model', done => {
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

  describe('Update', () => {
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
          expect(err.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('should return error when trying to update with unkown field in query', done => {
      const query = {where: {unknown: 'Field'}};
      const data = {name: 'Jon'};
      personsCrud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INPUT');
          done();
        });
    });

    it('should return error if keyword where is missing', done => {
      const query = {name: 'Jon'};
      const data = {lastName: 'doe'};
      personsCrud.update(query, data)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INPUT');
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

      personsCrud.update(query, data)
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

  describe('Upsert', () => {
    it('should update single existing record', done => {
      const person = Object.assign({}, personsFixtures[0]);
      person.lastName = 'Not Doe';
      const expectUpsert = person => {
        const expected = 'Not Doe';
        const actual = person.lastName;
        expect(actual).to.be.equal(expected);
        return person;
      };

      personsCrud.upsert(person)
        .then(expectUpsert)
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(expectUpsert)
        .then(() => done())
        .catch(done);
    });

    it('should return error when trying to upsert with unkown field in data', done => {
      const person = Object.assign({}, personsFixtures[0]);
      person.unknown = 'Field';
      personsCrud.upsert(person)
        .then(() => done('unexpected data'))
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INPUT');
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
          return employeesCrud.upsert(employeeData);
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

    it('should create new id when is not sent', done => {
      const employeeData = {
        name: 'Jane',
        lastName: 'Doe',
        age: 25,
        rating: 7,
        schedule: '09:30 - 18:30',
        entryDate: new Date('2016-07-26T00:00:00.000Z'),
        ssn: '465154654561'
      };
      const query = {where: {rating: 7}};

      employeesCrud.findOne(query)
        .then(employee => {
          expect(employee).to.be.undefined;
          return employeesCrud.upsert(employeeData);
        })
        .then(employee => personsCrud.findOne(query))
        .then(person => {
          expect(person.id).to.be.exist;
          expect(person.name).to.be.equal('Jane');
          expect(person.age).to.be.equal(25);
          return employeesCrud.findOne({where: {personId: person.id}});
        })
        .then(employee => {
          expect(employee.personId).to.be.exist;
          expect(employee.schedule).to.be.equal('09:30 - 18:30');
          expect(employee.ssn).to.be.equal('465154654561');
          done();
        })
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

      employeesCrud.upsert(employee)
        .then(expectUpdate)
        .then(person => personsCrud.findOne({where: {id: person.id}}))
        .then(person => {
          expect(person).to.have.property('lastName', 'Dane');
          return person;
        })
        .then(person => employeesCrud.findOne({where: {id: person.id}}))
        .then(expectUpdate)
        .then(() => done())
        .catch(done);
    });

    it('should upsert by primary Key when unique indexes are not defined', done => {
      const collection = 'new_model';
      const definition = {
        id: types.PRIMARY_KEY,
        name: types.STRING
      };
      const recordId = uuid();
      const newEngine = memory({'new_model': [{id: recordId, name: 'Test'}]});
      const newModel = defineModel({collection, definition, engine: newEngine});
      newModel.setPrimaryKey('id');
      const newModelCrud = Crud(newEngine, newModel);

      const expectUpsert = (record) => {
        expect(record).to.have.property('name', 'Jon');
        return record;
      };

      newModelCrud.upsert({id: recordId, name: 'Jon'})
        .then(expectUpsert)
        .then(record => newModelCrud.findOne({where: {id: record.id}}))
        .then(expectUpsert)
        .then(() => done())
        .catch(done);
    });

    it('should insert when unique index  and primary key are not defined', done => {
      const collection = 'new_model';
      const definition = {
        id: types.PRIMARY_KEY,
        name: types.STRING
      };
      const recordId = uuid();
      const newEngine = memory({'new_model': [{id: recordId, name: 'Test'}]});
      const newModel = defineModel({collection, definition, engine: newEngine});
      const newModelCrud = Crud(newEngine, newModel);

      const expectUpsert = (record) => {
        expect(record).to.have.property('id', recordId);
        return record;
      };

      newModelCrud.upsert({id: recordId, name: 'Jon'})
        .then(expectUpsert)
        .then(record => newModelCrud.find({where: {id: record.id}}))
        .then(records => records.map(expectUpsert))
        .then(() => done())
        .catch(done);
    });
  });

  describe('Remove', () => {
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

    it('should remove correct records for single json inner query', done => {
      const query = {where: {'job.title': 'Programmer'}};
      personsCrud.remove(query)
        .then(persons => {
          expect(persons.length).to.be.equal(4);
          const expectedIds = [
            personsFixtures[1].id,
            personsFixtures[3].id,
            personsFixtures[4].id,
            personsFixtures[5].id].sort();
          expect(persons.map(p => p.id).sort().join()).to.be.equal(expectedIds.join());
          return persons;
        })
        .then(() => personsCrud.find(query))
        .then(persons => expect(persons.length).to.be.equal(0))
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
