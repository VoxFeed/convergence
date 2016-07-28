module.exports = client => {
  const queryString = `
  CREATE TABLE IF NOT EXISTS employees(
    person_id uuid PRIMARY KEY,
    ssn varchar(255),
    schedule varchar(255),
    entry_date timestamp with time zone DEFAULT current_timestamp
  );`;

  return new Promise((resolve, reject) => {
    client.query(queryString, err => err ? reject(err) : resolve());
  });
};
