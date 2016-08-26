const PostgresPool = require('pg-pool');
const connectMongo = require('./drivers/mongo/util/connect-mongo');

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

const mongo = (database = 'converge_test') => {
  return {
    name: 'mongo',
    connection: connectMongo.bind(database, database)
  };
};

module.exports = {memory, postgres, mongo};
