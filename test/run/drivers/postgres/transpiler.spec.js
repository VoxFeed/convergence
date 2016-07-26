const startDate = '2001-02-11T00:00:00.000Z';
const endDate = '2001-02-13T00:00:00.000Z';

const PostgresTranspiler = require('lib/drivers/postgres/transpiler');
const engine = {name: 'postgres', connection: {pool: {}}};
const schema = require('test/test-helpers/build-single-table-schema')(engine);

const {select, count, insert, update, remove} = PostgresTranspiler(schema);

describe('Postgres Transpiler', () => {
  describe('Select', () => {
    it('should return correct sql if no where clause is sent', () => {
      const uql = {};
      const expected = 'SELECT * FROM persons';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with one condition', () => {
      const uql = {where: {name: 'Jon'}};
      const expected = 'SELECT * FROM persons WHERE persons.name=\'Jon\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with two conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe'}};
      const expected = 'SELECT * FROM persons WHERE ' +
        'persons.name=\'Jon\' AND persons.last_name=\'Doe\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with three conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
      const expected = 'SELECT * FROM persons WHERE persons.name=\'Jon\' AND ' +
        'persons.last_name=\'Doe\' AND persons.age=23 AND persons.rating=5.2';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with bad values', () => {
      const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
      const expected = 'SELECT * FROM persons WHERE persons.name=\'123\' AND ' +
        'persons.last_name=null AND persons.age=null AND persons.rating=null';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a date range condition', () => {
      const uql = {
        where: {
          createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
        }
      };
      const actual = select(uql);
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
      const actual = select(uql);
      const expected = 'SELECT * FROM persons WHERE persons.name=\'Jon\' AND ' +
        'persons.last_name=\'Doe\' AND persons.age=23 AND ' +
       `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with or operator', () => {
      const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT * FROM persons WHERE persons.name=\'Jon\' ' +
        'OR persons.last_name=\'Doe\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with explicit and operator', () => {
      const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT * FROM persons WHERE persons.name=\'Jon\' ' +
        'AND persons.last_name=\'Doe\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a single lt operator', () => {
      const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
      const expected = 'SELECT * FROM persons WHERE persons.tracked=true AND ' +
        `persons.created_at < '${startDate}'`;
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL for single json inner query', () => {
      const uql = {where: {'job.title': 'Programmer'}};
      const expected = 'SELECT * FROM persons WHERE ' +
        'persons.job->>\'title\'=\'Programmer\'';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with order and single field to order', () => {
      const uql = {order: [{age: 'ASC'}]};
      const expected = 'SELECT * FROM persons ORDER BY age ASC';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with multiple order conditions', () => {
      const uql = {order: [{age: 'ASC'}, {lastName: 'DESC'}]};
      const expected = 'SELECT * FROM persons ORDER BY age ASC, last_name DESC';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with where conditions and multiple order conditions', () => {
      const uql = {where: {'job.title': 'Programmer'}, order: [{age: 'ASC'}, {lastName: 'DESC'}]};
      const expected = 'SELECT * FROM persons WHERE persons.job->>\'title\'=\'Programmer\' ' +
       'ORDER BY age ASC, last_name DESC';
      const actual = select(uql);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Count', () => {
    it('should return correct SQL if no where clause is sent', () => {
      const uql = {};
      const expected = 'SELECT COUNT(*) FROM persons';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with one condition', () => {
      const uql = {where: {name: 'Jon'}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name=\'Jon\'';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with two conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe'}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name=\'Jon\' ' +
        'AND persons.last_name=\'Doe\'';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with four conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name=\'Jon\' AND ' +
        'persons.last_name=\'Doe\' AND persons.age=23 AND persons.rating=5.2';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with bad values', () => {
      const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name=\'123\' AND ' +
        'persons.last_name=null AND persons.age=null AND persons.rating=null';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a date range condition', () => {
      const uql = {
        where: {
          createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
        }
      };
      const actual = count(uql);
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
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
      const actual = count(uql);
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name=\'Jon\' AND ' +
        'persons.last_name=\'Doe\' AND persons.age=23 AND ' +
        `persons.created_at >= \'${startDate}\' AND persons.created_at < '${endDate}'`;
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with or operator', () => {
      const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE persons.name=\'Jon\' ' +
        'OR persons.last_name=\'Doe\'';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with explicit and operator', () => {
      const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        'persons.name=\'Jon\' AND persons.last_name=\'Doe\'';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with a single lt operator', () => {
      const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        `persons.tracked=true AND persons.created_at < '${startDate}'`;
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL for single json inner query', () => {
      const uql = {where: {'job.title': 'Programmer'}};
      const expected = 'SELECT COUNT(*) FROM persons WHERE ' +
        'persons.job->>\'title\'=\'Programmer\'';
      const actual = count(uql);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Insert', () => {
    it('should create sql with one field', () => {
      const data = {name: 'Jon'};
      const expected = 'INSERT INTO persons (name) VALUES (\'Jon\') RETURNING *';
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });

    it('should create sql with two fields', () => {
      const data = {name: 'Jon', lastName: 'Doe'};
      const expected = 'INSERT INTO persons (name, last_name) VALUES (\'Jon\', \'Doe\') RETURNING *';
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });

    it('should create sql with three fields', () => {
      const data = {name: 'Jon', lastName: 'Doe', age: 23};
      const expected = 'INSERT INTO persons (name, last_name, age) VALUES (\'Jon\', \'Doe\', 23) RETURNING *';
      const actual = insert(data);
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
      const actual = insert(data);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Upsert', () => {
    const {defineModel, types} = require('lib/model/definition');
    let model;

    beforeEach(() => {
      model = defineModel({
        collection: 'persons',
        definition: {
          name: types.STRING,
          lastName: types.STRING,
          age: types.INTEGER,
          job: types.JSON
        },
        engine
      });
    });

    it('creates upsert sql with no unqiue indexes', () => {
      const {upsert} = PostgresTranspiler(model);
      const data = {name: 'Jon'};
      const query = {where: {name: 'Jon'}};
      const expected = 'INSERT INTO persons (name) VALUES (\'Jon\') ' +
      'ON CONFLICT DO NOTHING RETURNING *';
      const actual = upsert(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('creates upsert sql with one unique index', () => {
      model.validatesUniquenessOf('age');
      const {upsert} = PostgresTranspiler(model);
      const data = {name: 'Jon', lastName: 'Doe'};
      const query = {where: {name: 'Jon'}};
      const expected = 'INSERT INTO persons (name, last_name) ' +
        'VALUES (\'Jon\', \'Doe\') ON CONFLICT (age) DO UPDATE ' +
        'SET name=\'Jon\', last_name=\'Doe\' WHERE persons.name=\'Jon\' ' +
        'RETURNING *';
      const actual = upsert(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('creates upsert query with multiple unique indexes and json property', () => {
      model.validatesUniquenessOf('last_name', 'age');
      const {upsert} = PostgresTranspiler(model);
      const data = {name: 'Jon'};
      const query = {where: {'job.title': 'Programmer'}};
      const expected = 'INSERT INTO persons (name) ' +
        'VALUES (\'Jon\') ON CONFLICT (last_name, age) DO UPDATE ' +
        'SET name=\'Jon\' WHERE persons.job->>\'title\'=\'Programmer\' ' +
        'RETURNING *';
      const actual = upsert(query, data);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Update', () => {
    it('should create update SQL with one field', () => {
      const data = {name: 'Jon'};
      const query = {where: {'job.title': 'Programmer'}};
      const expected = 'UPDATE persons SET name=\'Jon\' ' +
        'WHERE persons.job->>\'title\'=\'Programmer\' RETURNING *';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one field and no conditions', () => {
      const data = {name: 'Jon'};
      const query = {};
      const expected = 'UPDATE persons SET name=\'Jon\' RETURNING *';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one field and unexistent conditions', () => {
      const data = {name: 'Jon'};
      let query;
      const expected = 'UPDATE persons SET name=\'Jon\' RETURNING *';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should return empty string if no data is sent', () => {
      const query = {where: {name: 'Jon'}};
      const expected = '';
      const actual = update(query);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one full json field', () => {
      const data = {'job': {title: 'Programmer', companyName: 'VoxFeed'}};
      const query = {where: {name: 'Jon'}};
      const expected = '' +
        'UPDATE persons SET job=\'{"title":"Programmer","company_name":"VoxFeed"}\' ' +
        'WHERE persons.name=\'Jon\' RETURNING *';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with one atribute in json field', () => {
      const data = {'job.title': 'Programmer'};
      const query = {where: {name: 'Jon'}};
      const expected = '' +
        'UPDATE persons SET job=\'{"title":"Programmer"}\' ' +
        'WHERE persons.name=\'Jon\' RETURNING *';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });

    it('should create update SQL with two atributes in json field', () => {
      const data = {'job.title': 'Programmer', 'job.companyName': 'VoxFeed'};
      const query = {where: {name: 'Jon'}};
      const expected = '' +
        'UPDATE persons SET job=\'{"title":"Programmer","company_name":"VoxFeed"}\' ' +
        'WHERE persons.name=\'Jon\' RETURNING *';
      const actual = update(query, data);
      expect(actual).to.be.equal(expected);
    });
  });

  describe('Remove', () => {
    it('should return correct sql if no where clause is sent', () => {
      const uql = {};
      const expected = 'DELETE FROM persons RETURNING *';
      const actual = remove(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with one field', () => {
      const query = {where: {name: 'Jon'}};
      const expected = 'DELETE FROM persons WHERE persons.name=\'Jon\' RETURNING *';
      const actual = remove(query);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with many conditions', () => {
      const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
      const expected = 'DELETE FROM persons WHERE persons.name=\'Jon\' AND ' +
        'persons.last_name=\'Doe\' AND persons.age=23 AND persons.rating=5.2 RETURNING *';
      const actual = remove(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with bad values', () => {
      const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
      const expected = 'DELETE FROM persons WHERE persons.name=\'123\' AND ' +
        'persons.last_name=null AND persons.age=null AND persons.rating=null RETURNING *';
      const actual = remove(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL with or operator', () => {
      const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
      const expected = 'DELETE FROM persons WHERE persons.name=\'Jon\' OR ' +
       'persons.last_name=\'Doe\' RETURNING *';
      const actual = remove(uql);
      expect(actual).to.be.equal(expected);
    });

    it('should create correct SQL for single json inner query', () => {
      const uql = {where: {'job.title': 'Programmer'}};
      const expected = 'DELETE FROM persons WHERE ' +
        'persons.job->>\'title\'=\'Programmer\' RETURNING *';
      const actual = remove(uql);
      expect(actual).to.be.equal(expected);
    });
  });
});
