const PostgresPool = require('pg-pool');

const memory = store => {
  return {
    name: 'memory',
    connection: {store}
  };
};

const postgres = config => {
  const pool = new PostgresPool(config);
  return {
    name: 'postgres',
    connection: {pool}
  };
};

const mongo = () => {
  return {name: 'mongo'};
};

module.exports = {memory, postgres, mongo};
