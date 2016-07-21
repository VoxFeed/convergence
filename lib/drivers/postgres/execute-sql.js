const camelobj = require('camelobj');

const executeSql = (sql, pool) => pool.connect().then(client => _runQuery(client, sql));

const _runQuery = (client, query) => {
  return client.query(query)
    .then(data => {
      client.release();
      return data.rows.map(camelobj);
    })
    .catch(err => {
      client.release();
      throw err;
    });
};

module.exports = executeSql;
