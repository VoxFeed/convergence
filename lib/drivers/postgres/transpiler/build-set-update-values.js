module.exports = model => {
  const {generateValueForCondition} = require('./build-conditions')(model);

  const buildSetUpdateValues = data => {
    return ' SET ' + Object.keys(data).map(_buildUpdateFieldValue(data)).join(', ');
  };

  const _buildUpdateFieldValue = data => field => {
    const type = model.getFieldType(field);
    const value = generateValueForCondition(type, data[field]);
    return `${field} = ${value}`;
  };

  return buildSetUpdateValues;
};
