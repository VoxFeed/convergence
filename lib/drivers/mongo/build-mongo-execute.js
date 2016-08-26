const camelobj = require('camelobj');

const buildMongoExecute = (query, connection) => {
  return connection().then(buildQueryMethods(query));
};

const buildQueryMethods = mongoQuery => db => {
  const insert = collection => {
    return new Promise((resolve, reject) => {
      db.collection(collection).insert(mongoQuery, (error, result) => {
        if (error) return reject(error);
        resolve(camelobj(result));
      });
    });
  };

  const findOne = collection => {
    const {query, options} = mongoQuery;
    return new Promise((resolve, reject) => {
      db.collection(collection).findOne(query, options, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  };

  const find = collection => {
    const {query, options} = mongoQuery;
    return new Promise((resolve, reject) => {
      db.collection(collection).find(query, options, (error, cursor) => {
        if (error) return reject(error);
        cursor.toArray((error, array) => {
          if (error) return reject(error);
          resolve(array);
        });
      });
    });
  };

  const count = collection => {
    return new Promise((resolve, reject) => {
      db.collection(collection).count(mongoQuery, (error, count) => {
        if (error) return reject(error);
        resolve(count);
      });
    });
  };

  const update = collection => {
    return new Promise((resolve, reject) => {
      const {query, update} = mongoQuery;
      db.collection(collection).findAndModify(query, null, update, {new: true}, (error, result) => {
        if (error) return reject(error);
        resolve(result.value);
      });
    });
  };

  const remove = collection => {
    return new Promise((resolve, reject) => {
      db.collection(collection).remove(mongoQuery, (error, result) => {
        if (error) return reject(error);
        resolve(result.value);
      });
    });
  };

  return {insert, findOne, find, count, update, remove};
};

module.exports = buildMongoExecute;
