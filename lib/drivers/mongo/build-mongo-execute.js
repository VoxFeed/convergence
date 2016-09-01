const camelobj = require('camelobj');

const buildQueryMethods = getConnection => {
  const insert = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        db.collection(collection).insert(mongoQuery, (error, result) => {
          if (error) return reject(error);
          resolve(camelobj(result));
        });
      });
    });
  };

  const findOne = (mongoQuery, collection) => {
    const {query, options} = mongoQuery;
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        db.collection(collection).findOne(query, options, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
      });
    });
  };

  const find = (mongoQuery, collection) => {
    const {query, options} = mongoQuery;
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        db.collection(collection).find(query, options, (error, cursor) => {
          if (error) return reject(error);
          cursor.toArray((error, array) => {
            if (error) return reject(error);
            resolve(array);
          });
        });
      });
    });
  };

  const count = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        db.collection(collection).count(mongoQuery, (error, count) => {
          if (error) return reject(error);
          resolve(count);
        });
      });
    });
  };

  const update = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        const {query, update} = mongoQuery;
        console.log(query, update);
        db.collection(collection).findOneAndUpdate(query, update, {returnOriginal: false}, (error, result) => {
          if (error) return reject(error);
          console.log(result);
          resolve(result.value);
        });
      });
    });
  };

  const remove = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        db.collection(collection).remove(mongoQuery, (error, result) => {
          if (error) return reject(error);
          resolve(result.value);
        });
      });
    });
  };

  return {insert, findOne, find, count, update, remove};
};

module.exports = buildQueryMethods;
