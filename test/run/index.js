if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const paths = require('app-module-path');

paths.addPath(__dirname + '/../../');
