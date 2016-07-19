const PostgresTranspiler = require('./transpiler');
const executeSql = require('./execute-sql');

const PostgresCrud = (driver, schema) => {
  const {pool} = driver.connection;
  const transpiler = PostgresTranspiler(schema);

  const findOne = query => {
    const sql = transpiler.select(query);
    return executeSql(sql, pool);
  };

  const insert = data => {
    const sql = transpiler.insert(data);
    return executeSql(sql, pool);
  };

  return {findOne, insert};
};

module.exports = PostgresCrud;
