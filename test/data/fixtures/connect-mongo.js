const mongo = require('mongodb').MongoClient;

const connectToMongo = () => {
  return new Promise((resolve, reject) => {
    const url = 'mongodb://localhost:27017/converge_test';
    mongo.connect(url, (error, db) => {
      if (error) return reject(error);
      resolve(db);
    });
  });
};

module.exports = connectToMongo;
