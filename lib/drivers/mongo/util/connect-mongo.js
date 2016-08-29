const mongo = require('mongodb').MongoClient;

let mongoDB;
const connectToMongo = (databaseName) => {
  return new Promise((resolve, reject) => {
    if (mongoDB) return resolve(mongoDB);
    const url = `mongodb://localhost:27017/${databaseName}?maxPoolSize=100`;
    mongo.connect(url, (error, db) => {
      if (error) return reject(error);
      mongoDB = db;
      resolve(db);
    });
  });
};

module.exports = connectToMongo;
