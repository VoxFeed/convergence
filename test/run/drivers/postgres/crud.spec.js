const proxyquire = require('proxyquire');

const MockExecuteSql = require('test/test-helpers/mocks/execute-sql');
const unexpectedData = require('test/test-helpers/unexpected-data');
const dbConfig = {
  host: 'localhost',
  port: '5435',
  user: 'postgres',
  database: 'test',
  max: 10,
  min: 2,
  idleTimeoutMillis: 5000
};

const {postgres} = require('lib/engines');
const Crud = proxyquire('lib/drivers/postgres/crud', {'./execute-sql': MockExecuteSql.build()});
const engine = postgres(dbConfig);
const schema = require('test/test-helpers/build-single-table-schema')(engine);
const BAD_INPUT = 'BAD_INPUT';

describe('Postgres Crud', () => {
  const crud = Crud(engine, schema);

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
      crud.findOne({where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}})
        .then(() => done())
        .catch(done);
    });

    it('should return select statement', done => {
      crud.findOne({where: {name: 'Jon'}})
        .then(sql => {
          const expected = true;
          const actual = sql.includes('SELECT');
          expect(actual).to.be.equal(expected);
        })
        .then(() => done())
        .catch(done);
    });

    it('should return select statement and include all fields', done => {
      crud.findOne({where: {name: 'Jon', lastName: 'Doe', age: 23}})
        .then(sql => {
          const expected = true;
          ['SELECT * FROM', 'name', 'last_name', 'age'].forEach(field => {
            const actual = sql.includes(field);
            expect(actual).to.be.equal(expected);
          });
        })
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
      return new Promise((resolve, reject) => {
        crud.insert({unknown: 'Field'})
          .then(unexpectedData)
          .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
          .then(() => done())
          .catch(done);
      });
    });

    it('should return insert into statement', done => {
      crud.insert({name: 'Jon'}).then(sql => {
        const expected = true;
        const actual = sql.includes('INSERT INTO');
        expect(actual).to.be.equal(expected);
      })
      .then(() => done())
      .catch(done);
    });

    it('should return insert into statement and include all fields', done => {
      crud.insert({name: 'Jon', lastName: 'Doe', age: 23})
        .then(sql => {
          const expected = true;
          ['INSERT INTO', 'name', 'last_name', 'age'].forEach(field => {
            const actual = sql.includes(field);
            expect(actual).to.be.equal(expected);
          });
        })
        .then(() => done())
        .catch(done);
    });
  });

  describe('Update', () => {
    it('should return update statement', done => {
      crud.update({where: {name: 'Jon'}}, {lastName: 'Doe'})
        .then(sql => {
          const expected = true;
          ['UPDATE', 'SET', 'name', 'last_name'].forEach(field => {
            const actual = sql.includes(field);
            expect(actual).to.be.equal(expected);
          });
        })
        .then(() => done())
        .catch(done);
    });

    it('should return error when trying to update with unkown field in data', done => {
      crud.update({where: {name: 'Jon'}}, {unknown: 'Field'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
    });

    it('should return error when trying to update with unkown field in query', done => {
      crud.update({where: {unknown: 'Field'}}, {name: 'Jon'})
        .then(unexpectedData)
        .catch(err => expect(err.name).to.be.equal(BAD_INPUT))
        .then(() => done())
        .catch(done);
    });
  });
});
