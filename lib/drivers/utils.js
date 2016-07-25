const {reject, difference} = require('lodash');
const dotobj = require('dot-object').object;
const {BadInputError} = require('./../errors');

const OPERATORS = ['gt', 'gte', 'lt', 'lte', 'or', 'and'];

module.exports = (schema) => {
  const validateQueryWithSchema = ({where}) => {
    if (!where) {
      return Promise.reject(BadInputError('missing "where" keyword in query'));
    }
    return validateFieldsAreInSchema(where);
  };

  const validateFieldsAreInSchema = (query) => {
    const invalid = getInvalidFields(query);
    if (invalid.length) return Promise.reject(BadInputError(`invalid fields sent: ${invalid}`));
    return Promise.resolve();
  };

  const getInvalidFields = query => {
    const known = schema.getKnownFields(discardDotNotation(query));
    const unknown = difference(Object.keys(query), known);
    return discardOperators(unknown);
  };

  const discardDotNotation = query => dotobj(query);

  const discardOperators = fields => reject(fields, field => OPERATORS.includes(field));

  return {validateQueryWithSchema, validateFieldsAreInSchema};
};
