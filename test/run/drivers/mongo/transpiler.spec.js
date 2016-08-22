const {isEqual} = require('lodash');

const MongoTranspiler = require('lib/drivers/mongo/transpiler');
const startDate = 1;
const endDate = 1;

describe('Mongo Transpiler', () => {
  describe('Select', () => {
    describe('Simple Model', () => {
      let transpiler;
      beforeEach(() => {
        transpiler = MongoTranspiler();
      });

      it('should return empty object if there are no query conditions', () => {
        const uql = {};
        const expected = {};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with one condition', () => {
        const uql = {where: {name: 'Jon'}};
        const expected = {name: 'Jon'};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with two conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe'}};
        const expected = {name: 'Jon', lastName: 'Doe'};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with three conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = {name: 123, lastName: null, age: null, rating: null};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with a date range condition', () => {
        const uql = { where: { createdAt: {gte: new Date(startDate), lt: new Date(endDate)} } };
        const actual = transpiler.select(uql).query;
        const expected = {
          createdAt: {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
          }
        };
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct mongo query with three regular conditions and a date range condition', () => {
        const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
        const dateRange = {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate)
          }
        };
        const uql = {where: Object.assign({}, regularConds, dateRange)};
        const expectedConds = {name: 'Jon', lastName: 'Doe', age: 23};
        const expectedDateRange = {
          createdAt: {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
          }
        };
        const actual = transpiler.select(uql).query;
        const expected = Object.assign({}, expectedConds, expectedDateRange);
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct SQL with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$or: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with explicit and operator', () => {
        const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$and: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with a single lt operator', () => {
        const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
        const expected = {tracked: true, createdAt: {$lt: new Date(startDate)}};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = {'job.title': 'Programmer'};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with order and single field to order', () => {
        const uql = {order: {age: 'ASC'}};
        const expected = {query: {}, sort: {age: 1}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with multiple order conditions', () => {
        const uql = {order: {age: 'ASC', lastName: 'DESC'}};
        const expected = {query: {}, sort: {age: 1, lastName: -1}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });
    });
  });

  describe('Insert', () => {
    describe('Simple Model', () => {
      let transpiler;
      beforeEach(() => {
        transpiler = MongoTranspiler();
      });

      it('should create sql with one field', () => {
        const data = {name: 'Jon'};
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create sql with two fields', () => {
        const data = {name: 'Jon', lastName: 'Doe'};
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create sql with three fields', () => {
        const data = {name: 'Jon', lastName: 'Doe', age: 23};
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create sql with all schema fields', () => {
        const data = {
          name: 'Jon',
          lastName: 'Doe',
          age: 23,
          tracked: false,
          job: {title: 'Programmer', company: 'VoxFeed'}
        };
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });
    });

    describe.skip('Extended Model', () => {
      let transpiler;

      beforeEach(() => {
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
        transpiler = PostgresTranspiler(extended);
      });

      it('creates sql with one field in each table', () => {
        const data = {id: '1', name: 'Jon', schedule: '9:00 - 6:00'};
        const expected = '' +
        'WITH NEW_PARENT_RECORD as (' +
          'INSERT INTO persons (id, name) VALUES (\'1\', \'Jon\') RETURNING id) ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
          '(\'9:00 - 6:00\', (SELECT id FROM NEW_PARENT_RECORD)); ' +
        'SELECT * FROM employees JOIN persons ON person_id=id WHERE persons.id=\'1\'';
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('creates sql with fields in just the parent table', () => {
        const data = {id: '1', name: 'Jon', lastName: 'Doe'};
        const expected = '' +
        'WITH NEW_PARENT_RECORD as (' +
          'INSERT INTO persons (id, name, last_name) VALUES (\'1\', \'Jon\', \'Doe\') RETURNING id) ' +
        'INSERT INTO employees (person_id) VALUES ' +
          '((SELECT id FROM NEW_PARENT_RECORD)); ' +
        'SELECT * FROM employees JOIN persons ON person_id=id WHERE persons.id=\'1\'';
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('creates sql with fields in just the child table', () => {
        const data = {id: '1', schedule: '9:00 - 6:00'};
        const expected = '' +
        'WITH NEW_PARENT_RECORD as (' +
          'INSERT INTO persons (id) VALUES (\'1\') RETURNING id) ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
          '(\'9:00 - 6:00\', (SELECT id FROM NEW_PARENT_RECORD)); ' +
        'SELECT * FROM employees JOIN persons ON person_id=id WHERE persons.id=\'1\'';
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should return empty string if no data is sent', () => {
        const data = {};
        const expected = '';
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });
    });

    describe('Count', () => {
      let transpiler;
      beforeEach(() => {
        transpiler = MongoTranspiler();
      });

      it('should return correct mongo query if no where clause is sent', () => {
        const uql = {};
        const expected = Object.assign({}, uql);
        const actual = transpiler.count(uql);
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with one condition', () => {
        const uql = {where: {name: 'Jon'}};
        const expected = {name: 'Jon'};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct mongo query with two conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe'}};
        const expected = {name: 'Jon', lastName: 'Doe'};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct mongo query with four conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = {name: 123, lastName: null, age: null, rating: null};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with a date range condition', () => {
        const uql = {
          where: {
            createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
          }
        };
        const actual = transpiler.count(uql);
        const expected = {
          createdAt: {$gte: new Date(startDate), $lt: new Date(endDate)}
        };
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with regular and date range conditions', () => {
        const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
        const dateRange = {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate)
          }
        };
        const uql = {where: Object.assign({}, regularConds, dateRange)};
        const expectedRegularConds = Object.assign({}, regularConds);
        const expectedDateRange = {
          createdAt: {$gte: new Date(startDate), $lt: new Date(endDate)}
        };
        const expected = Object.assign({}, expectedRegularConds, expectedDateRange);
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$or: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with explicit and operator', () => {
        const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$and: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with a single lt operator', () => {
        const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
        const expected = {tracked: true, createdAt: {$lt: new Date(startDate)}};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = {'job.title': 'Programmer'};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });
    });
  });
});
