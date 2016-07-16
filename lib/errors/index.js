const buildError = require('./build-error');

const BadInputError = message => buildError('BAD_INPUT', message);

module.exports = {
  BadInputError
};
