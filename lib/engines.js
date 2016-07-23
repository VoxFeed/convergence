const Pool = require('pg-pool');

const memory = store => {
  return {
    name: 'memory',
    connection: {store}
  };
};

const postgres = config => {
  const pool = new Pool(config);
  return {
    name: 'postgres',
    connection: {pool}
  };
};

module.exports = {memory, postgres};
