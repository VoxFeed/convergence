const clone = require('lodash/cloneDeep');
const {memory} = require('lib/engines');
const Crud = require('lib/drivers/memory/crud');
const personsFixtures = require('test/data/fixtures/persons');
const store = {'persons': personsFixtures.map(clone)};
const engine = memory(store);
const model = require('test/test-helpers/build-single-table-schema')(engine);
const isPlainObject = require('lodash/isPlainObject');

describe('Memory Crud', () => {
  const crud = Crud(engine, model);

  describe('Find One', () => {
    it('returns a promise', () => {
      const actual = crud.findOne({where: {name: 'Jon'}}).constructor.name;
      const expected = 'Promise';
      expect(actual).to.be.equal(expected);
    });

    it('returns an error if unknown fields are sent', (done) => {
      crud.findOne({where: {unknown: 'field'}})
        .then(record => {
          expect(record).to.not.exist;
          done();
        })
        .catch(done);
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
});
