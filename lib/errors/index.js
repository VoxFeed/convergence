const buildError = require('./build-error');

const BadInputError = msg => buildError('BAD_INPUT', msg);
const BadIndexesForUpsert = msg => buildError('BAD_INDEXES_FOR_UPSERT', msg);
const CantUpsertRecordError = msg => buildError('CANT_UPSERT_RECORD', msg);
const CantInsertRecordError = msg => buildError('CANT_INSERT_RECORD', msg);

module.exports = {
  BadInputError,
  BadIndexesForUpsert,
  CantUpsertRecordError,
  CantInsertRecordError
};
