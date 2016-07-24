const {types, defineModel} = require('lib/model/definition');
const collection = 'test_table';
const engine = {name: 'memory', connection: {store: {}}};

describe('Model', () => {
  describe('Types', () => {
    it('should have all needed types', () => {
      expect(types.UUID).to.be.equal('uuid');
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
  });
});
