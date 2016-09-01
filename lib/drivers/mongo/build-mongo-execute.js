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

  const findExtended = (extended, parent, extendedCol, parentCol, injectFk) => {
    const {query, options} = extended;
    return new Promise((resolve, reject) => {
      getConnection().then((db) => {
        const result = [];
        const cursor = db.collection(extendedCol).find(query, options);
        cursor.on('data', (doc) => {
          const {query} = parent;
          const newQuery = injectFk(clone(query), doc);
          parent.query = newQuery;
          findOne(parent, parentCol)
            .then(record => {
              if (!record) return;
              const mergedRecord = Object.assign({}, doc, record);
              result.push(mergedRecord);
            })
            .catch(console.log);
        });
        cursor.on('end', function() {
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

  return {insert, findOne, find, count, update, remove, findExtended};
};

module.exports = buildQueryMethods;
