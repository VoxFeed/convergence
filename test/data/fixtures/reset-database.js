const Client = require('pg').Client;
const selectCreator = require('./creators');

const resetDatabase = (tables) => {
  return connectToPostgress()
    .then(dropTables(tables))
    .then(createTables(tables))
    .catch(respondWithError);
};

const connectToPostgress = (database) => {
  const client = new Client('postgres://postgres@localhost/test');
  return new Promise((resolve, reject) => {
    client.connect(err => {
      if (err) return reject(err);
      resolve({client});
    });
  });
};

const dropTables = tables => db => {
  const {client} = db;
  const promises = tables.map(dropTable(client));
  return Promise.all(promises).then(() => db);
};

const dropTable = client => table => {
  return new Promise((resolve, reject) => {
    const query = `DROP TABLE IF EXISTS ${table}`;
    client.query(query, err => err ? reject(err) : resolve());
  });
};

const createTables = tables => db => {
  const {client} = db;
  const creators = tables.map((table) => selectCreator[table](client));
  return Promise.all(creators)
    .then(() => client.end())
    .catch(err => {
      console.log(err);
      client.end();
      throw err;
    });
};

const respondWithError = err => {
  console.log(err);
  throw CantResetDatabase(err);
};

const CantResetDatabase = cause => {
  const error = new Error();
  this.name = 'CANT_RESET_DATABASE';
  this.message = `failed to reset the database: ${cause.message}`;
  return error;
};

module.exports = resetDatabase;
