const {reject, difference} = require('lodash');
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
    const invalid = _getInvalidFields(snakeobj(query));
    if (invalid.length) return Promise.reject(BadInputError(`invalid fields sent: ${invalid}`));
    return Promise.resolve();
  };

  const validateIndexesForUpsert = () => {
    const pk = model.getPrimaryKey();
    const single = model.getUniqueSingleIndexes();
    const combined = model.getUniqueCombinedIndexes();
    if (!pk && !single.length && !combined.length) return Promise.reject(BadIndexesForUpsert());
    if (single.length > 1) return Promise.reject(BadIndexesForUpsert());
    if (single.length && combined.length) return Promise.reject(BadIndexesForUpsert());
    return Promise.resolve();
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
