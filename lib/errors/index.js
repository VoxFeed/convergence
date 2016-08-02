const buildError = require('./build-error');

const BadInputError = message => buildError('BAD_INPUT', message);
const BadIndexesForUpsert = message => buildError('BAD_INDEXES_FOR_UPSERT', message);

module.exports = {
  BadInputError,
  BadIndexesForUpsert
};
