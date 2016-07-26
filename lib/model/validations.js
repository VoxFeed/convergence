const {reject, difference} = require('lodash');
const dotobj = require('dot-object').object;
const {BadInputError} = require('./../errors');
const snakeobj = require('snakeobj');

const OPERATORS = ['gt', 'gte', 'lt', 'lte', 'or', 'and'];

module.exports = (schema) => {
  const validateQueryWithSchema = ({where}) => {
    if (!where) {
      return Promise.reject(BadInputError('missing "where" keyword in query'));
    }
    return validateFieldsAreInSchema(where);
  };

  const validateFieldsAreInSchema = (query) => {
    const invalid = _getInvalidFields(snakeobj(query));
    if (invalid.length) return Promise.reject(BadInputError(`invalid fields sent: ${invalid}`));
    return Promise.resolve();
  };

  const _getInvalidFields = query => {
    const known = schema.getKnownFields(_discardDotNotation(query));
    const unknown = difference(Object.keys(query), known);
    return _discardOperators(unknown);
  };

  const _discardDotNotation = query => dotobj(query);

  const _discardOperators = fields => reject(fields, field => OPERATORS.includes(field));

  return {validateFieldsAreInSchema, validateQueryWithSchema};
};
