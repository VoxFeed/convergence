# Turbo-DB

## First a little bit of dreamcode.

A practical use case says more than a 1000 words!

Lets declare an employee gateway, this gateway will define a typed schema and return a collection of
functions to operate on the underlying store such as find, findOne, findAll, update, create, upsert.

```js
const {types, defineSchema} = require('turbo-db');

const EmployeeGateway = (driver) => {
  const schema = defineSchema('employees', driver, {
    id: types.UUID,
    name: types.STRING,
    lastName: types.STRING,
    job: types.JSON
  });

  return schema;
};
```

Now lets build a Store Abstraction that will wrap gateway operations in convenient
well named functions and hide all the queries so our app don't need to change every time
we adjust a single query.

```js
const EmployeeGateway = require('./../gateways/employee');

const EmployeeStore = (driver) => {
  const employeeGateway = EmployeeGateway(driver);
  const findEmployeeByName = name => {
    const query = {name};
    return employeeGateway.find(query);
  };

  const findEmployeeByFullName = (name, lastName) => {
    cons query = {name, lastName};
    return employeeGateway.find(query);
  };

  return {findEmployeeByName, findEmployeeByFullName};
};
```

And lastly lets expose two versions of Database Abstraction Layers, one for memory stores
and one for Postgres stores. Both these abstractions behave exactly the same and can seamlessly
be used by the Core Application. Lets Liskov the $#17 out of this!

```js
const EmployeeStore = require('./stores/employees');
const SomeOtherStore = require('./stores/some-other');

const PostgresDatabase = () => {
  const driver = {engine: 'postgres', config: {}};
  const employeeStore = EmployeeStore(driver);
  const someOtherStore = SomeOtherStore(driver);

  return Object.assign({}, employeeStore, someOtherStore);
};

const MemoryDatabase = () => {
  const driver = {engine: 'memory', store: {}};
  const employeeStore = EmployeeStore(driver);
  const someOtherStore = SomeOtherStore(driver);

  return Object.assign({}, employeeStore, someOtherStore);
};
```

KH3!!!
