const startDate = '2001-02-11T00:00:00.000Z';
const endDate = '2001-02-13T00:00:00.000Z';

const {types, defineModel} = require('lib/model/definition');
const PostgresTranspiler = require('lib/drivers/postgres/transpiler');
const engine = {name: 'postgres', connection: {pool: {}}};

describe('Postgres Transpiler', () => {
  let model;
  let positionsModel;

  beforeEach(() => {
    model = require('test/test-helpers/build-single-table-schema')(engine);
    positionsModel = require('test/test-helpers/build-schema-with-unique-combined-index')(engine);
  });

  describe('Select', () => {
    describe('Simple Model', () => {
      let transpiler;
      let positionTranspiler;

      beforeEach(() => {
        transpiler = PostgresTranspiler(model);
        positionTranspiler = PostgresTranspiler(positionsModel);
      });

      it('should return correct sql if no where clause is sent', () => {
        const uql = {};
        const expected = 'SELECT * FROM persons';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with one condition', () => {
        const uql = {where: {name: 'Jon'}};
        const expected = 'SELECT * FROM persons WHERE persons.name = \'Jon\'';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with one condition with null value', () => {
        const uql = {where: {name: null}};
        const expected = 'SELECT * FROM persons WHERE persons.name IS NULL';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with two conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe'}};
        const expected = 'SELECT * FROM persons WHERE ' +
          'persons.name = \'Jon\' AND persons.last_name = \'Doe\'';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with three conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = 'SELECT * FROM persons WHERE persons.name = \'Jon\' AND ' +
          'persons.last_name = \'Doe\' AND persons.age = 23 AND persons.rating = 5.2';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with a contains operator', () => {
        const uql = {where: {employees: {contains: 'Karla'}}};
        const expected = 'SELECT * FROM positions WHERE \'Karla\' = ANY (positions.employees)';
        const actual = positionTranspiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = 'SELECT * FROM persons WHERE persons.name = \'123\' AND ' +
          'persons.last_name IS NULL AND persons.age IS NULL AND persons.rating IS NULL';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with a date range condition', () => {
        const uql = {
          where: {
            createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
          }
        };
        const actual = transpiler.select(uql);
        const expected = 'SELECT * FROM persons WHERE ' +
          `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with three regular conditions and a date range condition', () => {
        const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
        const dateRange = {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate)
          }
        };
        const uql = {where: Object.assign({}, regularConds, dateRange)};
        const actual = transpiler.select(uql);
        const expected = 'SELECT * FROM persons WHERE persons.name = \'Jon\' AND ' +
          'persons.last_name = \'Doe\' AND persons.age = 23 AND ' +
          `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = 'SELECT * FROM persons WHERE (persons.name = \'Jon\' ' +
          'OR persons.last_name = \'Doe\')';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with explicit and operator', () => {
        const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = 'SELECT * FROM persons WHERE (persons.name = \'Jon\' ' +
          'AND persons.last_name = \'Doe\')';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with regex and insensitive case', () => {
        const uql = {where: {'job.title': {regex: 'gram', options: 'i'}}};
        const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\' ILIKE \'%gram%\'';
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should find value with regex with sensitive case', () => {
        const uql = {where: {'job.title': {regex: 'gRam'}}};
        const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\' LIKE \'%gRam%\'';
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should find value with regex with sensitive case at the start', () => {
        const uql = {where: {'job.title': {regex: 'Progr'}}};
        const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\' LIKE \'%Progr%\'';
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct SQL with a single lt operator', () => {
        const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
        const expected = 'SELECT * FROM persons WHERE persons.tracked = true AND ' +
          `persons.created_at < '${startDate}'`;
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = 'SELECT * FROM persons WHERE ' +
          'persons.job->>\'title\' = \'Programmer\'';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL for single json inner query and null value', () => {
        const uql = {where: {'job.title': null}};
        const expected = 'SELECT * FROM persons WHERE ' +
          'persons.job->>\'title\' IS NULL';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with order and single field to order', () => {
        const uql = {order: {age: 'ASC'}};
        const expected = 'SELECT * FROM persons ORDER BY persons.age ASC';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with multiple order conditions', () => {
        const uql = {order: {age: 'ASC', lastName: 'DESC'}};
        const expected = 'SELECT * FROM persons ORDER BY persons.age ASC, persons.last_name DESC';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with where conditions and multiple order conditions', () => {
        const uql = {where: {'job.title': 'Programmer'}, order: {age: 'ASC', lastName: 'DESC'}};
        const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\' = \'Programmer\' ' +
         'ORDER BY persons.age ASC, persons.last_name DESC';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with limit', () => {
        const uql = {limit: 100};
        const expected = 'SELECT * FROM persons LIMIT 100';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with where conditions and limit', () => {
        const uql = {where: {'job.title': 'Programmer'}, limit: 100};
        const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\' = \'Programmer\' ' +
         'LIMIT 100';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with offset', () => {
        const uql = {skip: 3};
        const expected = 'SELECT * FROM persons OFFSET 3';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with limit and offset', () => {
        const uql = {limit: 1, skip: 3};
        const expected = 'SELECT * FROM persons LIMIT 1 OFFSET 3';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with where conditions, limit and offset', () => {
        const uql = {where: {'job.title': 'Programmer'}, limit: 100, skip: 6};
        const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\' = \'Programmer\' ' +
         'LIMIT 100 OFFSET 6';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });
    });

    describe('Extended Model', () => {
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
        const query = {where: {name: 'Jon', ssn: null}};
        const expected = '' +
          'SELECT * FROM employees JOIN persons ON person_id = id ' +
          'WHERE persons.name = \'Jon\' AND employees.ssn IS NULL';
        const actual = transpiler.select(query);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with one field in one table', () => {
        const query = {where: {id: '1'}};
        const expected = '' +
          'SELECT * FROM employees JOIN persons ON person_id = id ' +
          'WHERE persons.id = \'1\'';
        const actual = transpiler.select(query);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with explicit operator', () => {
        const query = {where: {or: [{name: 'Jon'}, {ssn: '23534564356'}]}};
        const expected = '' +
          'SELECT * FROM employees JOIN persons ON person_id = id ' +
          'WHERE (persons.name = \'Jon\' OR employees.ssn = \'23534564356\')';
        const actual = transpiler.select(query);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with explicit operator and null value', () => {
        const query = {where: {or: [{name: null}, {ssn: '23534564356'}]}};
        const expected = '' +
          'SELECT * FROM employees JOIN persons ON person_id = id ' +
          'WHERE (persons.name IS NULL OR employees.ssn = \'23534564356\')';
        const actual = transpiler.select(query);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with where conditions and multiple order conditions', () => {
        const uql = {where: {'job.title': 'Programmer'}, order: {age: 'ASC', lastName: 'DESC'}};
        const expected = 'SELECT * FROM employees JOIN persons ON person_id = id ' +
          'WHERE persons.job->>\'title\' = \'Programmer\' ' +
          'ORDER BY persons.age ASC, persons.last_name DESC';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with where conditions and limit', () => {
        const uql = {where: {'job.title': 'Programmer'}, limit: 100};
        const expected = 'SELECT * FROM employees JOIN persons ON person_id = id ' +
          'WHERE persons.job->>\'title\' = \'Programmer\' ' +
          'LIMIT 100';
        const actual = transpiler.select(uql);
        expect(actual).to.be.equal(expected);
      });
    });
  });

  describe('Count', () => {
    let transpiler;
    beforeEach(() => {
      transpiler = PostgresTranspiler(model);
    });

    it('should return correct SQL if no where clause is sent', () => {
      const uql = {};
      const expected = 'SELECT COUNT(*) FROM persons';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with one condition', () => {
      const uql = {where: {name: 'Jon'}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name = \'Jon\'';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with two conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe'}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name = \'Jon\' ' +
        'AND persons.last_name = \'Doe\'';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with four conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name = \'Jon\' AND ' +
        'persons.last_name = \'Doe\' AND persons.age = 23 AND persons.rating = 5.2';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with bad values', () => {
      const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name = \'123\' AND ' +
        'persons.last_name IS NULL AND persons.age IS NULL AND persons.rating IS NULL';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a date range condition', () => {
      const uql = {
        where: {
          createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
        }
      };
      const actual = transpiler.count(uql);
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a null date', () => {
      const uql = {
        where: {
          createdAt: null
        }
      };
      const actual = transpiler.count(uql);
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        'persons.created_at IS NULL';
      expect(actual).to.be.equal(expected);
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
      const actual = transpiler.count(uql);
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name = \'Jon\' AND ' +
        'persons.last_name = \'Doe\' AND persons.age = 23 AND ' +
        `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with or operator', () => {
      const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE (persons.name = \'Jon\' ' +
        'OR persons.last_name = \'Doe\')';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with explicit and operator', () => {
      const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        '(persons.name = \'Jon\' AND persons.last_name = \'Doe\')';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a single lt operator', () => {
      const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        `persons.tracked = true AND persons.created_at < '${startDate}'`;
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL for single json inner query', () => {
      const uql = {where: {'job.title': 'Programmer'}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        'persons.job->>\'title\' = \'Programmer\'';
      const actual = transpiler.count(uql);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Insert', () => {
    describe('Simple Model', () => {
      let transpiler;

      beforeEach(() => {
        transpiler = PostgresTranspiler(model);
      });

      it('should create sql with one field', () => {
        const data = {name: 'Jon'};
        const expected = 'INSERT INTO persons (name) VALUES (\'Jon\') RETURNING *';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('should create sql with two fields', () => {
        const data = {name: 'Jon', lastName: 'Doe'};
        const expected = 'INSERT INTO persons (name, last_name) VALUES (\'Jon\', \'Doe\') RETURNING *';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('should create sql with three fields', () => {
        const data = {name: 'Jon', lastName: 'Doe', age: 23};
        const expected = 'INSERT INTO persons (name, last_name, age) VALUES (\'Jon\', \'Doe\', 23) RETURNING *';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('should create sql with all schema fields', () => {
        const data = {
          name: 'Jon',
          lastName: 'Doe',
          age: 23,
          tracked: false,
          job: {title: 'Programmer', company: 'VoxFeed'}
        };
        const expected = 'INSERT INTO persons (name, last_name, age, tracked, job) ' +
          'VALUES (\'Jon\', \'Doe\', 23, false, \'{"title":"Programmer","company":"VoxFeed"}\') RETURNING *';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('should create sql with undefined and empty values', () => {
        const data = {
          name: '',
          lastName: null,
          age: null,
          tracked: false,
          job: {title: 'Programmer', company: 'VoxFeed'}
        };
        const expected = 'INSERT INTO persons (name, last_name, age, tracked, job) ' +
          'VALUES (\'\', null, null, false, \'{"title":"Programmer","company":"VoxFeed"}\') RETURNING *';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });
    });

    describe('Extended Model', () => {
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
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\'';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with fields in just the parent table', () => {
        const data = {id: '1', name: 'Jon', lastName: 'Doe'};
        const expected = '' +
        'WITH NEW_PARENT_RECORD as (' +
          'INSERT INTO persons (id, name, last_name) VALUES (\'1\', \'Jon\', \'Doe\') RETURNING id) ' +
        'INSERT INTO employees (person_id) VALUES ' +
          '((SELECT id FROM NEW_PARENT_RECORD)); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\'';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with fields in just the child table', () => {
        const data = {id: '1', schedule: '9:00 - 6:00'};
        const expected = '' +
        'WITH NEW_PARENT_RECORD as (' +
          'INSERT INTO persons (id) VALUES (\'1\') RETURNING id) ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
          '(\'9:00 - 6:00\', (SELECT id FROM NEW_PARENT_RECORD)); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\'';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });

      it('should return empty string if no data is sent', () => {
        const data = {};
        const expected = '';
        const actual = transpiler.insert(data);
        expect(actual).to.be.equal(expected);
      });
    });
  });

  describe('Upsert', () => {
    describe('Single Model', () => {
      const {defineModel, types} = require('lib/model/definition');
      let model;

      beforeEach(() => {
        model = defineModel({
          collection: 'persons',
          definition: {
            id: types.UUID,
            name: types.STRING,
            lastName: types.STRING,
            age: types.INTEGER,
            job: types.JSON
          },
          engine
        });
      });

      describe('Single Unique Index', () => {
        it('creates upsert sql with no unique indexes', () => {
          const {upsert} = PostgresTranspiler(model);
          const data = {name: 'Jon'};
          const expected = 'INSERT INTO persons (name) VALUES (\'Jon\') RETURNING *';
          const actual = upsert(data);
          expect(actual).to.be.equal(expected);
        });

        it('creates upsert sql with one unique index', () => {
          model.unique({single: ['age']});
          const {upsert} = PostgresTranspiler(model);
          const data = {name: 'Jon', age: 25};
          const expected = 'INSERT INTO persons (name, age) ' +
            'VALUES (\'Jon\', 25) ON CONFLICT (age) DO UPDATE ' +
            'SET name = \'Jon\', age = 25 WHERE persons.age = 25 ' +
            'RETURNING *';
          const actual = upsert(data, {where: {age: 25}});
          expect(actual).to.be.equal(expected);
        });

        it('ignores primary key from update set values', () => {
          model.setPrimaryKey('id');
          model.unique({single: ['age']});
          const {upsert} = PostgresTranspiler(model);
          const data = {id: '1', name: 'Jon', age: 25};
          const expected = 'INSERT INTO persons (id, name, age) ' +
            'VALUES (\'1\', \'Jon\', 25) ON CONFLICT (age) DO UPDATE ' +
            'SET name = \'Jon\', age = 25 WHERE persons.age = 25 ' +
            'RETURNING *';
          const actual = upsert(data, {where: {age: 25}});
          expect(actual).to.be.equal(expected);
        });

        it('creates upsert query with multiple unique indexes and json property', () => {
          model.unique({single: ['last_name', 'age']});
          const {upsert} = PostgresTranspiler(model);
          const data = {name: 'Jon', last_name: 'Doe', age: 25};
          const expected = 'INSERT INTO persons (name, last_name, age) ' +
            'VALUES (\'Jon\', \'Doe\', 25) ON CONFLICT (last_name, age) DO UPDATE ' +
            'SET name = \'Jon\', last_name = \'Doe\', age = 25 ' +
            'WHERE persons.last_name = \'Doe\' RETURNING *';
          const actual = upsert(data, {where: {lastName: 'Doe'}});
          expect(actual).to.be.equal(expected);
        });

        it('creates upsert query with no unique indexes using primary key instead', () => {
          model.setPrimaryKey('id');
          const {upsert} = PostgresTranspiler(model);
          const data = {id: '1', name: 'Jon'};
          const expected = 'INSERT INTO persons (id, name) ' +
            'VALUES (\'1\', \'Jon\') ON CONFLICT (id) DO UPDATE ' +
            'SET name = \'Jon\' WHERE persons.id = \'1\' RETURNING *';
          const actual = upsert(data, {where: {id: '1'}});
          expect(actual).to.be.equal(expected);
        });
      });

      describe('Combined Unique Indexes', () => {
        it('creates upsert sql with one combined index', () => {
          model.unique({combined: ['age', 'last_name']});
          const {upsert} = PostgresTranspiler(model);
          const data = {name: 'Jon', age: 25};
          const expected = 'INSERT INTO persons (name, age) ' +
            'VALUES (\'Jon\', 25) ON CONFLICT (age, last_name) DO UPDATE ' +
            'SET name = \'Jon\', age = 25 WHERE persons.last_name = \'Doe\' ' +
            'RETURNING *';
          const actual = upsert(data, {where: {lastName: 'Doe'}});
          expect(actual).to.be.equal(expected);
        });
      });
    });

    describe('Extended Model', () => {
      let transpiler;
      let base;
      let extended;

      beforeEach(() => {
        base = defineModel({
          collection: 'persons',
          engine,
          definition: {
            id: types.PRIMARY_KEY,
            name: types.STRING,
            rating: types.INTEGER
          }
        });
        base.setPrimaryKey('id');
        extended = defineModel({
          collection: 'employees',
          engine,
          definition: {
            personId: types.FOREIGN_KEY,
            schedule: types.STRING,
            entryDate: types.DATE,
            ssn: types.STRING
          }
        });
        extended.setPrimaryKey('personId');
        extended.extend(base, 'personId');
        transpiler = PostgresTranspiler(extended);
      });

      it('creates sql with one field and primary key in each table making the relation', () => {
        const data = {id: '1', name: 'Jon', schedule: '9:00 - 6:00', personId: '1'};
        const expected = '' +
        'INSERT INTO persons (id, name) VALUES (\'1\', \'Jon\') ' +
        'ON CONFLICT (id) DO UPDATE SET name = \'Jon\' WHERE persons.id = \'1\'; ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
        '(\'9:00 - 6:00\', \'1\') ON CONFLICT (person_id) DO UPDATE SET schedule = \'9:00 - 6:00\' ' +
        'WHERE employees.person_id = \'1\'; ' +
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\' AND employees.person_id = \'1\'';
        const actual = transpiler.upsert(data, {where: {id: '1', personId: '1'}});
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with one field and single index in each table making the relation', () => {
        base.unique({single: ['rating']});
        const data = {id: '1', name: 'Jon', rating: 1, schedule: '9:00 - 6:00', personId: '1'};
        const query = {where: {id: '1', personId: '1'}};
        const expected = '' +
        'INSERT INTO persons (id, name, rating) VALUES (\'1\', \'Jon\', 1) ' +
        'ON CONFLICT (rating) DO UPDATE SET name = \'Jon\', rating = 1 WHERE persons.id = \'1\'; ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
        '(\'9:00 - 6:00\', \'1\') ON CONFLICT (person_id) DO UPDATE SET schedule = \'9:00 - 6:00\' ' +
        'WHERE employees.person_id = \'1\'; ' +
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\' AND employees.person_id = \'1\'';
        const actual = transpiler.upsert(data, query);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with one field and single index on child table in each table making the relation', () => {
        extended.unique({single: ['schedule']});
        const data = {id: '1', name: 'Jon', rating: 1, schedule: '9:00 - 6:00', personId: '1'};
        const query = {where: {id: '1', personId: '1'}};
        const expected = '' +
        'INSERT INTO persons (id, name, rating) VALUES (\'1\', \'Jon\', 1) ' +
        'ON CONFLICT (id) DO UPDATE SET name = \'Jon\', rating = 1 WHERE persons.id = \'1\'; ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
        '(\'9:00 - 6:00\', \'1\') ON CONFLICT (schedule) DO UPDATE SET schedule = \'9:00 - 6:00\' ' +
        'WHERE employees.person_id = \'1\'; ' +
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\' AND employees.person_id = \'1\'';
        const actual = transpiler.upsert(data, query);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with one field and combined index on base and single index on child table, making the relation', () => {
        base.unique({combined: ['name', 'rating']});
        extended.unique({single: ['schedule']});
        const data = {id: '1', name: 'Jon', rating: 1, schedule: '9:00 - 6:00', personId: '1'};
        const query = {where: {id: '1', personId: '1'}};
        const expected = '' +
        'INSERT INTO persons (id, name, rating) VALUES (\'1\', \'Jon\', 1) ' +
        'ON CONFLICT (name, rating) DO UPDATE SET name = \'Jon\', rating = 1 WHERE persons.id = \'1\'; ' +
        'INSERT INTO employees (schedule, person_id) VALUES ' +
        '(\'9:00 - 6:00\', \'1\') ON CONFLICT (schedule) DO UPDATE SET schedule = \'9:00 - 6:00\' ' +
        'WHERE employees.person_id = \'1\'; ' +
        'SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\' AND employees.person_id = \'1\'';
        const actual = transpiler.upsert(data, query);
        expect(actual).to.be.equal(expected);
      });
    });
  });

  describe('Update', () => {
    describe('Simple Model', () => {
      let transpiler;

      beforeEach(() => {
        transpiler = PostgresTranspiler(model);
      });

      it('should create update SQL with one field', () => {
        const data = {name: 'Jon'};
        const query = {where: {'job.title': 'Programmer'}};
        const expected = 'UPDATE persons SET name = \'Jon\' ' +
          'WHERE persons.job->>\'title\' = \'Programmer\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('ignores primary key from set values', () => {
        const data = {id: '1', name: 'Jon'};
        const query = {where: {'job.title': 'Programmer'}};
        const expected = 'UPDATE persons SET name = \'Jon\' ' +
          'WHERE persons.job->>\'title\' = \'Programmer\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('should create update SQL with one field and no conditions', () => {
        const data = {name: 'Jon'};
        const query = {};
        const expected = 'UPDATE persons SET name = \'Jon\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('should create update SQL with one field and unexistent conditions', () => {
        const data = {name: 'Jon'};
        let query;
        const expected = 'UPDATE persons SET name = \'Jon\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('should return empty string if no data is sent', () => {
        const query = {where: {name: 'Jon'}};
        const expected = '';
        const actual = transpiler.update(query);
        expect(actual).to.be.equal(expected);
      });

      it('should create update SQL with one full json field', () => {
        const data = {'job': {title: 'Programmer', companyName: 'VoxFeed'}};
        const query = {where: {name: 'Jon'}};
        const expected = '' +
          'UPDATE persons SET job = \'{"title":"Programmer","company_name":"VoxFeed"}\' ' +
          'WHERE persons.name = \'Jon\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('should create update SQL with one atribute in json field', () => {
        const data = {'job.title': 'Programmer'};
        const query = {where: {name: 'Jon'}};
        const expected = '' +
          'UPDATE persons SET job = \'{"title":"Programmer"}\' ' +
          'WHERE persons.name = \'Jon\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('should create update SQL with two atributes in json field', () => {
        const data = {'job.title': 'Programmer', 'job.companyName': 'VoxFeed'};
        const query = {where: {name: 'Jon'}};
        const expected = '' +
          'UPDATE persons SET job = \'{"title":"Programmer","company_name":"VoxFeed"}\' ' +
          'WHERE persons.name = \'Jon\' RETURNING *';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });
    });

    describe('Extended Model', () => {
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

      it('returns empty string id no data is sent', () => {
        const query = {where: {name: 'Luis', last_name: 'Argumedo'}};
        const expected = '';
        const actual = transpiler.update(query);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with values in both tables and complex query in both tables', () => {
        const query = {where: {name: 'Luis', ssn: '124124'}};
        const data = {name: 'Jon', lastName: 'Doe', ssn: '123123'};
        const expected = '' +
        'WITH PARENT_RECORD as (' +
          'UPDATE persons SET name = \'Jon\', last_name = \'Doe\' FROM employees ' +
          'WHERE persons.name = \'Luis\' AND employees.ssn = \'124124\' ' +
          'AND persons.id = employees.person_id RETURNING id) ' +
        'UPDATE employees SET ssn = \'123123\' WHERE employees.person_id = ' +
          '(SELECT id FROM PARENT_RECORD); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.name = \'Jon\' AND employees.ssn = \'123123\'';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with values just primary key in where in both tables', () => {
        const query = {where: {id: 1}};
        const data = {name: 'Jon', lastName: 'Doe', ssn: '123123'};
        const expected = '' +
        'WITH PARENT_RECORD as (' +
          'UPDATE persons SET name = \'Jon\', last_name = \'Doe\' FROM employees ' +
          'WHERE persons.id = \'1\' AND persons.id = employees.person_id RETURNING id) ' +
        'UPDATE employees SET ssn = \'123123\' WHERE employees.person_id = ' +
          '(SELECT id FROM PARENT_RECORD); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.id = \'1\'';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with values in both tables and query in single table', () => {
        const query = {where: {name: 'Luis', last_name: 'Argumedo'}};
        const data = {name: 'Jon', lastName: 'Doe', ssn: '123123'};
        const expected = '' +
        'WITH PARENT_RECORD as (' +
          'UPDATE persons SET name = \'Jon\', last_name = \'Doe\' FROM employees ' +
          'WHERE persons.name = \'Luis\' AND persons.last_name = \'Argumedo\' ' +
          'AND persons.id = employees.person_id RETURNING id) ' +
        'UPDATE employees SET ssn = \'123123\' WHERE employees.person_id = ' +
          '(SELECT id FROM PARENT_RECORD); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.name = \'Jon\' AND persons.last_name = \'Doe\'';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with values in both tables and json query', () => {
        const query = {where: {id: 1}};
        const data = {name: 'Jon', job: {title: 'QA'}, ssn: '123123'};
        const expected = '' +
        'WITH PARENT_RECORD as (' +
          'UPDATE persons SET name = \'Jon\', job = \'{"title":"QA"}\' FROM employees ' +
          'WHERE persons.id = \'1\' AND persons.id = employees.person_id RETURNING id) ' +
        'UPDATE employees SET ssn = \'123123\' WHERE employees.person_id = ' +
          '(SELECT id FROM PARENT_RECORD); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.id = \'1\'';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });

      it('creates sql with values in both tables and query in single table with or', () => {
        const query = {where: {or: [{name: 'Luis'}, {lastName: 'Argumedo'}]}};
        const data = {name: 'Jon', lastName: 'Doe', ssn: '123123'};
        const expected = '' +
        'WITH PARENT_RECORD as (' +
          'UPDATE persons SET name = \'Jon\', last_name = \'Doe\' FROM employees ' +
          'WHERE (persons.name = \'Luis\' OR persons.last_name = \'Argumedo\') ' +
          'AND persons.id = employees.person_id RETURNING id) ' +
        'UPDATE employees SET ssn = \'123123\' WHERE employees.person_id = ' +
          '(SELECT id FROM PARENT_RECORD); ' +
        'SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE (persons.name = \'Jon\' OR persons.last_name = \'Doe\')';
        const actual = transpiler.update(query, data);
        expect(actual).to.be.equal(expected);
      });
    });
  });

  describe('Remove', () => {
    describe('Single Model', () => {
      let transpiler;

      beforeEach(() => {
        transpiler = PostgresTranspiler(model);
      });

      it('should return correct sql if no where clause is sent', () => {
        const uql = {};
        const expected = 'DELETE FROM persons';
        const actual = transpiler.remove(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with one field', () => {
        const query = {where: {name: 'Jon'}};
        const expected = 'DELETE FROM persons WHERE persons.name = \'Jon\'';
        const actual = transpiler.remove(query);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with many conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = 'DELETE FROM persons WHERE persons.name = \'Jon\' AND ' +
          'persons.last_name = \'Doe\' AND persons.age = 23 AND persons.rating = 5.2';
        const actual = transpiler.remove(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = 'DELETE FROM persons WHERE persons.name = \'123\' AND ' +
          'persons.last_name IS NULL AND persons.age IS NULL AND persons.rating IS NULL';
        const actual = transpiler.remove(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = 'DELETE FROM persons WHERE (persons.name = \'Jon\' OR ' +
         'persons.last_name = \'Doe\')';
        const actual = transpiler.remove(uql);
        expect(actual).to.be.equal(expected);
      });

      it('should create correct SQL for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = 'DELETE FROM persons WHERE ' +
          'persons.job->>\'title\' = \'Programmer\'';
        const actual = transpiler.remove(uql);
        expect(actual).to.be.equal(expected);
      });
    });

    describe('Extended Model', () => {
      let transpiler;

      beforeEach(() => {
        const buildModel = require('test/test-helpers/build-extended-table-schema');
        const extended = buildModel(engine, model);
        transpiler = PostgresTranspiler(extended);
      });

      it('should return correct sql if no where clause is sent', () => {
        const query = {};
        const expected = '' +
        'BEGIN;' +
        'DELETE FROM employees;' +
        'DELETE FROM persons;' +
        'COMMIT;';
        const actual = transpiler.remove(query);
        expect(actual).to.be.equal(expected);
      });

      it('returns correct sql when query has only primary key', () => {
        const query = {where: {id: '1'}};
        const expected = '' +
        'BEGIN; ' +
        'WITH ids as (SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\') ' +
        'DELETE FROM employees WHERE employees.person_id IN (SELECT id FROM ids);' +
        'WITH ids as (SELECT * FROM employees JOIN persons ON person_id = id WHERE persons.id = \'1\') ' +
        'DELETE FROM persons WHERE persons.id IN (SELECT id FROM ids); ' +
        'COMMIT;';
        const actual = transpiler.remove(query);
        expect(actual).to.be.equal(expected);
      });

      it('returns correct sql when query has only query in parent table', () => {
        const query = {where: {name: 'Jon', last_name: 'Doe'}};
        const expected = '' +
        'BEGIN; ' +
        'WITH ids as (SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.name = \'Jon\' AND persons.last_name = \'Doe\') ' +
        'DELETE FROM employees WHERE employees.person_id IN (SELECT id FROM ids);' +
        'WITH ids as (SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.name = \'Jon\' AND persons.last_name = \'Doe\') ' +
        'DELETE FROM persons WHERE persons.id IN (SELECT id FROM ids); ' +
        'COMMIT;';
        const actual = transpiler.remove(query);
        expect(actual).to.be.equal(expected);
      });

      it('returns correct sql when query has only query in both tables', () => {
        const query = {where: {name: 'Jon', ssn: '123'}};
        const expected = '' +
        'BEGIN; ' +
        'WITH ids as (SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.name = \'Jon\' AND employees.ssn = \'123\') ' +
        'DELETE FROM employees WHERE employees.person_id IN (SELECT id FROM ids);' +
        'WITH ids as (SELECT * FROM employees JOIN persons ON person_id = id ' +
        'WHERE persons.name = \'Jon\' AND employees.ssn = \'123\') ' +
        'DELETE FROM persons WHERE persons.id IN (SELECT id FROM ids); ' +
        'COMMIT;';
        const actual = transpiler.remove(query);
        expect(actual).to.be.equal(expected);
      });
    });
  });
});
