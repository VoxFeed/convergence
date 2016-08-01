module.exports = client => {
  const queryString = `
  CREATE TABLE IF NOT EXISTS persons(
    id uuid PRIMARY KEY,
    name varchar(255),
    last_name varchar(255),
    age integer,
    tracked boolean,
    job jsonb,
    rating decimal UNIQUE,
    created_at timestamp with time zone DEFAULT current_timestamp
  );
  CREATE UNIQUE INDEX persons_rating_and_last_name ON persons (rating, last_name);`;

  return new Promise((resolve, reject) => {
    client.query(queryString, err => err ? reject(err) : resolve());
  });
};
