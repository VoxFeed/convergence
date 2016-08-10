const omit = require('lodash/omit');

const {types, defineModel, engines} = require('lib');

const unexpectedData = require('test/test-helpers/unexpected-data');
const resetDatabase = require('test/data/fixtures/reset-memory');

const schema = {
  id: types.UUID,
  name: types.STRING,
  externalId: types.STRING,
  socialNetwork: types.STRING
};

describe('Crud', () => {
  let model;

  beforeEach(done => {
    const store = {};
    const engine = engines.memory(store);
    model = defineModel({
      collection: 'accounts',
      engine,
      definition: schema
    });

    resetDatabase({accounts: model}, store)
      .then(() => done())
      .catch(done);
  });

  describe('Upsert', () => {
    const account = {
      id: 'bb2b3183-e405-46ca-a43c-9ce612a98e3f',
      name: 'codingpains',
      externalId: '1870474',
      socialNetwork: 'twitter'
    };
    let data;

    beforeEach(() => {
      data = Object.assign({}, account);
    });

    it('returns error if no indexes exist', done => {
      model.upsert(data, {})
        .then(unexpectedData)
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INDEXES_FOR_UPSERT');
        })
        .then(() => done())
        .catch(done);
    });

    it('rejects if required fields are not present', done => {
      model.present(['name']);
      model.setPrimaryKey('id');
      model.upsert(omit(data, ['name']))
        .then(unexpectedData)
        .catch(err => {
          expect(err.name).to.be.equal('CANT_UPSERT_RECORD');
        })
        .then(() => done())
        .catch(done);
    });

    it('returns error if more than one single index exist', done => {
      model.unique({single: ['externalId', 'socialNetwork']});
      model.upsert(data, {})
        .then(unexpectedData)
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INDEXES_FOR_UPSERT');
        })
        .then(() => done())
        .catch(done);
    });

    it('returns error if one single and one combined index exist', done => {
      model.unique({single: ['externalId'], combined: ['externalId', 'socialNetwork']});
      model.upsert(data, {})
        .then(unexpectedData)
        .catch(err => {
          expect(err.name).to.be.equal('BAD_INDEXES_FOR_UPSERT');
        })
        .then(() => done())
        .catch(done);
    });

    it('resolves correctly if just primary key is present', done => {
      model.setPrimaryKey('id');
      model.upsert(data, {})
        .then(() => done())
        .catch(done);
    });

    it('resolves correctly if just one single index is present', done => {
      model.unique({single: ['externalId']});
      model.upsert(data, {})
        .then(() => done())
        .catch(done);
    });

    it('resolves correctly if just one combined index is present', done => {
      model.unique({combined: ['externalId', 'socialNetwork']});
      model.upsert(data, {})
        .then(() => done())
        .catch(done);
    });

    it('resolves correctly if just one single index and a primaryKey are present', done => {
      model.setPrimaryKey('id');
      model.unique({single: ['externalId']});
      model.upsert(data, {})
        .then(() => done())
        .catch(done);
    });

    it('resolves correctly if just one combined index and a primaryKey are present', done => {
      model.setPrimaryKey('id');
      model.unique({combined: ['externalId', 'socialNetwork']});
      model.upsert(data, {})
        .then(() => done())
        .catch(done);
    });
  });

  describe('Insert', () => {
    const account = {
      id: 'bb2b3183-e405-46ca-a43c-9ce612a98e3f',
      name: 'codingpains',
      externalId: '1870474',
      socialNetwork: 'twitter'
    };
    let data;

    beforeEach(() => {
      data = Object.assign({}, account);
    });

    it('rejects if required fields are not present', done => {
      model.present(['name']);
      model.setPrimaryKey('id');
      model.insert(omit(data, ['name']))
        .then(unexpectedData)
        .catch(err => {
          expect(err.name).to.be.equal('CANT_INSERT_RECORD');
        })
        .then(() => done())
        .catch(done);
    });
  });
});
