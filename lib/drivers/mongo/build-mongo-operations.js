const camelobj = require('camelobj');
const {clone} = require('lodash');

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
    const {query, sort} = mongoQuery;
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        db.collection(collection).findOne(query, sort, (error, result) => {
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

  const findExtended = (extended, parent, extendedCol, parentCol, injectFkToQuery) => {
    const {query, options} = extended;
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        const result = [];
        const cursor = db.collection(extendedCol).find(query, options);
        cursor.on('data', (parentData) => {
          const {query} = parent;
          parent.query = injectFkToQuery(clone(query), parentData);
          findOne(parent, parentCol)
            .then(record => {
              if (!record) return;
              const merged = Object.assign({}, parentData, record);
              result.push(merged);
            });
        });
        cursor.on('end', () => {
          setTimeout(resolve, 10, result);
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
        db.collection(collection).findOneAndUpdate(query, update, {returnOriginal: false}, (error, result) => {
          if (error) return reject(error);
          resolve(result.value);
        });
      });
    });
  };

  const upsert = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        const {query, update} = mongoQuery;
        db.collection(collection).findOneAndUpdate(query, update, {returnOriginal: false, upsert: true}, (error, result) => {
          if (error) return reject(error);
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
          resolve(result.result.ok);
        });
      });
    });
  };

  const removeExtended = (mongoQuery, collection) => {
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        const {query} = mongoQuery;
        db.collection(collection).remove(query, (error, result) => {
          if (error) return reject(error);
          resolve(result.result.ok);
        });
      });
    });
  };

  return {
    insert, findOne, find, count, update,
    remove, findExtended, removeExtended, upsert
  };
};

module.exports = buildQueryMethods;
