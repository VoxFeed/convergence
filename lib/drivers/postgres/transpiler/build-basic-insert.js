const snakeobj = require('snakeobj');
const isNil = require('lodash/isNil');

const buildBasicInsertSQL = (model, data) => {
  const sanitizedData = snakeobj(data);
  const fields = Object.keys(sanitizedData);
  const vals = fields.map(field => {
    const value = _buildValue(model, field, sanitizedData);
    return isNil(value) ? 'null' : value;
  });

  return `INSERT INTO ${model.collection} (${fields.join(', ')}) VALUES (${vals.join(', ')})`;
};

const _buildValue = (model, field, data) => {
  const {generateValueForCondition} = require('./build-conditions')(model);
  const type = model.getFieldType(field);
  return generateValueForCondition(type, data[field]);
};

module.exports = buildBasicInsertSQL;
