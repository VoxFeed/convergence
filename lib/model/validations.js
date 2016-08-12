const {reject, difference, omit} = require('lodash');
const dotobj = require('dot-object').object;
const {BadInputError, BadIndexesForUpsert} = require('./../errors');
const snakeobj = require('snakeobj');

const OPERATORS = ['gt', 'gte', 'lt', 'lte', 'or', 'and'];

module.exports = model => {
  const validateQueryWithSchema = ({where}) => {
    if (!where) {
      return Promise.reject(BadInputError('missing "where" keyword in query'));
    }
    return validateFieldsAreInSchema(where);
  };

  const validateFieldsAreInSchema = query => {
    const invalid = _getInvalidFields(omit(snakeobj(query)), ['created_at', 'updated_at']);
    if (invalid.length) return Promise.reject(BadInputError(`invalid fields sent: ${invalid}`));
    return Promise.resolve();
  };

  const validateIndexesForUpsert = () => {
    if (_hasNoIndexes()) return Promise.reject(BadIndexesForUpsert());
    if (_hasSingleIndex()) return Promise.reject(BadIndexesForUpsert());
    if (_hasSingleAndCombinedIndexes()) return Promise.reject(BadIndexesForUpsert());
    return Promise.resolve();
  };

  const _hasNoIndexes = () => {
    const single = model.getUniqueSingleIndexes();
    const combined = model.getUniqueCombinedIndexes();
    return !model.getPrimaryKey() && !single.length && !combined.length;
  };

  const _hasSingleIndex = () => model.getUniqueSingleIndexes().length > 1;

  const _hasSingleAndCombinedIndexes = () => {
    return model.getUniqueSingleIndexes().length &&
      model.getUniqueCombinedIndexes().length;
  };

  const _getInvalidFields = query => {
    const known = model.getKnownFields(_discardDotNotation(query));
    const unknown = difference(Object.keys(query), known);
    return _discardOperators(unknown);
  };

  const _discardDotNotation = query => dotobj(query);

  const _discardOperators = fields => reject(fields, field => OPERATORS.includes(field));

  return {validateFieldsAreInSchema, validateQueryWithSchema, validateIndexesForUpsert};
};
