const camelobj = require('camelobj');

const buildMongoExecute = connection => {
  return connection().then(buildQueryMethods);
};

const buildQueryMethods = db => {
  const insert = (query, collection) => {
    return new Promise((resolve, reject) => {
      db.collection(collection).insert(query, (error, result) => {
        if (error) return reject(error);
        resolve(camelobj(result));
      });
    });
  };

  const findOne = (mongoQuery, collection) => {
    const {query, options} = mongoQuery;
    return new Promise((resolve, reject) => {
      db.collection(collection).findOne(query, options, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  };

  const find = (mongoQuery, collection) => {
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

  const count = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      db.collection(collection).count(mongoQuery, (error, count) => {
        if (error) return reject(error);
        resolve(count);
      });
    });
  };

  const update = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      const {query, update} = mongoQuery;
      db.collection(collection).findAndModify(query, null, update, {new: true}, (error, result) => {
        if (error) return reject(error);
        resolve(result.value);
      });
    });
  };

  const remove = (mongoQuery, collection) => {
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