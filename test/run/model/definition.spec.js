const {types, defineModel} = require('lib/model/definition');
const collection = 'test_table';
const engine = {name: 'memory', connection: {store: {}}};

describe('Model', () => {
  describe('Types', () => {
    it('should have all needed types', () => {
      expect(types.UUID).to.be.equal('uuid');
      expect(types.PRIMARY_KEY).to.be.equal('uuid');
      expect(types.FOREIGN_KEY).to.be.equal('uuid');
      expect(types.STRING).to.be.equal('string');
      expect(types.TEXT).to.be.equal('text');
      expect(types.INTEGER).to.be.equal('integer');
      expect(types.DECIMAL).to.be.equal('decimal');
      expect(types.BOOLEAN).to.be.equal('boolean');
      expect(types.JSON).to.be.equal('json');
      expect(types.DATE).to.be.equal('date');
    });
  });

  describe('model definition', () => {
    it('should throw if model definition is empty', () => {
      let error;
      const args = {collection, engine};
      expect(() => defineModel(args)).to.throw;
      try {
        defineModel(args);
      } catch (err) {
        error = err;
      }
      expect(error).to.exist;
      expect(error.name).to.be.equal('BAD_INPUT');
    });

    it('should throw if model args are empty', () => {
      let error;
      expect(() => defineModel()).to.throw;
      try {
        defineModel();
      } catch (err) {
        error = err;
      }
      expect(error).to.exist;
      expect(error.name).to.be.equal('BAD_INPUT');
    });

    it('should throw if model definition has bad type', () => {
      let error;
      const definition = {
        id: types.INTEGER,
        name: types.UNKNOWN
      };

      try {
        defineModel({collection, definition, engine});
      } catch (err) {
        error = err;
      }
      expect(error).to.exist;
      expect(error.name).to.be.equal('BAD_INPUT');
    });

    it('should return model adt if definition is correct', () => {
      const definition = {
        id: types.INTEGER,
        name: types.STRING
      };
      const model = defineModel({collection, definition, engine});
      expect(model).to.exist;
      expect(model).to.respondTo('getKnownFields');
      expect(model).to.respondTo('getFieldType');
    });
  });

  describe('getKnownFields', () => {
    it('should return array', () => {
      const definition = {name: types.STRING, last_name: types.STRING};
      const data = {name: 'John', lastName: 'Doe'};
      const model = defineModel({collection, definition, engine});
      expect(model.getKnownFields(data)).to.have.length(2);
    });

    it('should ignore fields oustide of the definition', () => {
      const definition = {name: types.STRING};
      const data = {name: 'John', notInDefinition: 'Not In Definition'};
      const model = defineModel({collection, definition, engine});
      expect(model.getKnownFields(data)).to.have.length(1);
      expect(model.getKnownFields(data).pop()).to.be.equal('name');
    });
  });

  describe('getFieldType', () => {
    const model = require('test/test-helpers/build-single-table-schema')(engine);

    it('should get correct type for fields', () => {
      expect(model.getFieldType('id')).to.be.equal('uuid');
      expect(model.getFieldType('name')).to.be.equal('string');
      expect(model.getFieldType('last_name')).to.be.equal('string');
      expect(model.getFieldType('age')).to.be.equal('integer');
      expect(model.getFieldType('tracked')).to.be.equal('boolean');
      expect(model.getFieldType('job')).to.be.equal('json');
      expect(model.getFieldType('rating')).to.be.equal('decimal');
      expect(model.getFieldType('created_at')).to.be.equal('date');
    });

    it('should return undefined id field is unkwown', () => {
      expect(model.getFieldType('unkwown')).not.to.exist;
    });
  });

  describe('unique', () => {
    const buildModel = require('test/test-helpers/build-single-table-schema');

    describe('single', () => {
      it('should add known field to list of single unique indexes', () => {
        const model = buildModel(engine);
        model.unique({single: ['name']});
        expect(model.getUniqueSingleIndexes()).to.include('name');
      });

      it('should add list of known field to list of single unique indexes', () => {
        const model = buildModel(engine);
        model.unique({single: ['name', 'age']});
        expect(model.getUniqueSingleIndexes()).to.include('name');
        expect(model.getUniqueSingleIndexes()).to.include('age');
        expect(model.getUniqueSingleIndexes()).not.to.include('tracked');
      });

      it('should transform to snake case a field added to unique indexes', () => {
        const model = buildModel(engine);
        model.unique({single: ['lastName']});
        expect(model.getUniqueSingleIndexes()).to.include('last_name');
      });

      it('should ignore unkwown fields', () => {
        const model = buildModel(engine);
        const uniques = model.unique({single: ['name', 'unkwown', 'lastName']});
        expect(uniques).to.include('name');
        expect(uniques).to.include('last_name');
        expect(uniques).not.to.include('unkwown');
        expect(model.getUniqueSingleIndexes()).to.include('name');
        expect(model.getUniqueSingleIndexes()).to.include('last_name');
        expect(model.getUniqueSingleIndexes()).not.to.include('unkwon');
      });

      it('should return empty array if all are unkwown fields', () => {
        const model = buildModel(engine);
        const uniques = model.unique({single: ['nope', 'unkwown']});
        expect(uniques.length).to.be.equal(0);
        expect(model.getUniqueSingleIndexes().length).to.be.equal(1);
      });

      it('should ingore repeated fields', () => {
        const model = buildModel(engine);
        const uniques = model.unique({single: ['name', 'age', 'name']});
        expect(uniques.length).to.be.equal(2);
        expect(uniques).to.include('name');
        expect(uniques).to.include('age');
        expect(model.getUniqueSingleIndexes().length).to.be.equal(3);
        expect(model.getUniqueSingleIndexes()).to.include('name');
        expect(model.getUniqueSingleIndexes()).to.include('age');
      });
    });

    describe('combined', () => {
      it('should add known fields to list of combined unique indexes', () => {
        const model = buildModel(engine);
        model.unique({combined: ['name', 'rating']});
        expect(model.getUniqueCombinedIndexes()).to.include('name');
        expect(model.getUniqueCombinedIndexes()).to.include('rating');
      });

      it('should add unique known fields to existing list of combined unique indexes', () => {
        const model = buildModel(engine);
        model.unique({combined: ['name', 'rating']});
        model.unique({combined: ['last_name']});
        expect(model.getUniqueCombinedIndexes()).to.include('name');
        expect(model.getUniqueCombinedIndexes()).to.include('rating');
        expect(model.getUniqueCombinedIndexes()).to.include('last_name');
      });

      it('should ingore repeated fields', () => {
        const model = buildModel(engine);
        const uniques = model.unique({combined: ['name', 'age', 'name', 'rating']});
        expect(uniques.length).to.be.equal(3);
        expect(uniques).to.include('name');
        expect(uniques).to.include('age');
        expect(uniques).to.include('rating');
        expect(model.getUniqueCombinedIndexes().length).to.be.equal(3);
        expect(model.getUniqueCombinedIndexes()).to.include('name');
        expect(model.getUniqueCombinedIndexes()).to.include('age');
        expect(model.getUniqueCombinedIndexes()).to.include('rating');
      });
    });
  });

  describe('present', () => {
    const buildModel = require('test/test-helpers/build-single-table-schema');

    it('should add known fields to not null list', () => {
      const model = buildModel(engine);
      const fields = ['name', 'lastName'];
      const notNull = model.present(fields);
      expect(notNull.sort().join()).to.be.equal(fields.sort().join());
    });

    it('should ignore unknown fields', () => {
      const model = buildModel(engine);
      const fields = ['name', 'lastName'];
      const notNull = model.present([...fields, 'unknown']);
      expect(notNull.sort().join()).to.be.equal(fields.sort().join());
    });

    it('should ignore duplicated fields', () => {
      const model = buildModel(engine);
      const fields = ['name', 'lastName'];
      const notNull = model.present([...fields, ...fields]);
      expect(notNull.sort().join()).to.be.equal(fields.sort().join());
    });

    it('should get not null fields', () => {
      const model = buildModel(engine);
      const fields = ['name', 'lastName'];
      model.present(fields);
      expect(model.getRequiredFields().sort().join()).to.be.equal(fields.sort().join());
    });
  });

  describe('setPrimaryKey', () => {
    it('sets primary key', () => {
      const model = require('test/test-helpers/build-single-table-schema')(engine);
      const actual = model.setPrimaryKey('id');
      const expected = 'id';
      expect(actual).to.be.deep.equal(expected);
    });

    it('does not set primary key', () => {
      const model = defineModel({
        engine,
        collection: 'bla',
        definition: {
          id: types.INTEGER,
          name: types.STRING
        }
      });
      const actual = model.setPrimaryKey('id');
      expect(actual).not.to.exist ;
    });
  });

  describe('extend', () => {
    const PostModel = defineModel({
      collection: 'posts',
      engine,
      definition: {
        id: types.PRIMARY_KEY,
        externalId: types.STRING
      }
    });

    it('returns extended model object', () => {
      const DetailedPostModel = defineModel({
        collection: 'detailed_posts',
        engine,
        definition: {
          content: types.TEXT,
          postId: types.FOREIGN_KEY
        }
      });

      const result = DetailedPostModel.extend(PostModel, 'postId');
      expect(result).to.exist;
      expect(result.foreignKey).to.be.equal('post_id');
      expect(result.name).to.be.equal('posts');
      expect(result.model).to.be.deep.equal(PostModel);
    });

    it('returs undefined if foreign key is not an existing field', () => {
      const DetailedPostModel = defineModel({
        collection: 'detailed_posts',
        engine,
        definition: {
          content: types.TEXT
        }
      });
      const result = DetailedPostModel.extend(PostModel, 'postId');
      expect(result).not.to.exist;
    });

    it('returs undefined if foreign key is not a valid type', () => {
      const DetailedPostModel = defineModel({
        collection: 'detailed_posts',
        engine,
        definition: {
          postId: types.INTEGER,
          content: types.TEXT
        }
      });
      const result = DetailedPostModel.extend(PostModel, 'postId');
      expect(result).not.to.exist;
    });

    it('returs undefined if extended model does not have a primary key', () => {
      const model = defineModel({
        colleciton: 'posts',
        engine,
        definition: {
          id: types.UUID,
          externalId: types.STRING
        }
      });

      const DetailedPostModel = defineModel({
        collection: 'detailed_posts',
        engine,
        definition: {
          postId: types.FOREIGN_KEY,
          content: types.TEXT
        }
      });
      const result = DetailedPostModel.extend(model, 'postId');
      expect(result).not.to.exist;
    });

    it('returns undefined if model does not look like model', () => {
      const NotAModel = {
        notAModel: 'nope'
      };
      const DetailedPostModel = defineModel({
        collection: 'detailed_posts',
        engine,
        definition: {
          content: types.TEXT,
          postId: types.STRING
        }
      });
      const result = DetailedPostModel.extend(NotAModel, 'postId');
      expect(result).not.to.exist;
    });
  });
});
