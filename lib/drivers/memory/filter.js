const operators = ['$gt', '$gte', '$lt', '$lte'];

const MemoryFilter = (schema, store) => {
  const filter = query => store.filter(item => applyFilter(item, query));

  const applyFilter = (item, query) => {
    const fits = !!Object.keys(query).find(prop => {
      if (hasOperators(query[prop])) return meetsFilterCriteria(item[prop], query[prop]);
      return item[prop] === query[prop];
    });
    return fits;
  };

  const hasOperators = criteria => {
    return !!Object.keys(criteria).filter(op => operators.includes(op)).length;
  };

  const meetsFilterCriteria = (val, criteria) => {
    const meets = Object.keys(criteria).reduce((result, op) => {
      return result && meetsCriteria(op, val, criteria[op]);
    }, true);
    return meets;
  };

  const meetsCriteria = (op, val, expected) => {
    const compare = operatorCompareSelector[op];
    return compare(val, expected);
  };

  const greaterThan = (a, b) => a > b;

  const greaterThanOrEqual = (a, b) => a >= b;

  const lessThan = (a, b) => a < b;

  const lessThanOrEqual = (a, b) => a <= b;

  const operatorCompareSelector = {
    '$gt': greaterThan,
    '$gte': greaterThanOrEqual,
    '$lt': lessThan,
    '$lte': lessThanOrEqual
  };

  return filter;
};

module.exports = MemoryFilter;
