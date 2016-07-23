# Converge

## First a little bit of dream code.

A practical use case says more than a 1000 words!

Lets declare an employee model, this gateway will define a typed schema and return a collection of
functions to operate on the underlying store such as find, findOne, update, insert, upsert.

```js
const {types, defineModel, engines} = require('converge');

const store = {};
const engine = engines.memory(store);
const collection = 'employees';

const EmployeeModel = () => {
  const definition = {
    id: types.UUID,
    name: types.STRING,
    lastName: types.STRING,
    job: types.JSON
  };

  return defineModel(Object.assign({}, {engine, collection, definition}));
};
```

That´s it, now we can call the model methods as we are used to.

```js
const EmployeeModel = require('./../gateways/employee');

EmployeeModel.findOne({where: {id: 'someid'}})
  .then(handleYourSuccessCase)
  .catch(handleErrors);

EmployeeModel.insert({name: 'some name', lastName: 'some last name'})
  .then(handleYourSuccessCase)
  .catch(handleErrors);
```

The main feature of this Table Gateway lib is that it allows you to change the underlying  
database engine seamlessly. Check this implementation.

**models/employee.js**

```js
const {types, defineModel} = require('converge');

const collection = 'employees';

const EmployeeModel = engine => {
  const definition = {
    id: types.UUID,
    name: types.STRING,
    lastName: types.STRING,
    job: types.JSON
  };

  return defineModel(Object.assign({}, {engine, collection, definition}));
};
```

**models/users.js**
```js
const {types, defineModel} = require('converge');

const collection = 'users';

const UserModel = engine => {
  const definition = {
    id: types.UUID,
    username: types.STRING,
    email: types.STRING,
    hashedPassword: types.STRING,
    salt: types.JSON
  };

  return defineModel(Object.assign({}, {engine, collection, definition}));
};
```

Of course we don´t want to be declaring models everywhere, so we can do so in
a file dedicated to it.

**models/index.js**
```js
let models;

const getModels = engine => {
  if (models) return models;

  const UserModel = require('./users')(engine);
  const EmployeeModel = require('./employees')(engine);

  models = {UserModel, EmployeeModel};

  return models;
};

module.exports = getModels;
```

We use the closure of this file to cache the models, so they will just be created
once.
