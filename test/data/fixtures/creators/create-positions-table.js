module.exports = client => {
  const queryString = `
  CREATE TABLE IF NOT EXISTS positions(
    id uuid PRIMARY KEY,
    name varchar(255),
    code varchar(100),
    company_id uuid,
    employees text[],
    active boolean
  );`;

  return new Promise((resolve, reject) => {
    client.query(queryString, err => err ? reject(err) : resolve());
  });
};
