const clone = require('lodash/cloneDeep');

const persons = [
  {
    id: 1,
    name: 'Jon',
    lastName: 'Doe',
    age: 23,
    tracked: false,
    job: {title: 'Aprentice', companyName: 'VoxFeed'},
    createdAt: new Date('2016-01-18T00:00:00.000Z')
  },
  {
    id: 2,
    name: 'Alberto',
    lastName: 'Romero',
    age: 22,
    tracked: true,
    job: {title: 'Programmer', companyName: 'VoxFeed'},
    createdAt: new Date('2016-01-18T00:00:00.000Z')
  },
  {
    id: 3,
    name: 'Gibran',
    lastName: 'Arias',
    age: 27,
    tracked: true,
    job: {title: 'QA', companyName: 'VoxFeed'},
    createdAt: new Date('2015-11-02T00:00:00.000Z')
  },
  {
    id: 4,
    name: 'Luis',
    lastName: 'Argumedo',
    age: 24,
    tracked: true,
    job: {title: 'Programmer', companyName: 'VoxFeed'},
    createdAt: new Date('2015-09-28T00:00:00.000Z')
  },
  {
    id: 5,
    name: 'Jesus Agustin',
    lastName: 'Peña Meza',
    age: 27,
    tracked: false,
    job: {title: 'Programmer', companyName: 'VoxFeed'},
    createdAt: new Date('2015-10-19T00:00:00.000Z')
  }
];

module.exports = persons.map(p => Object.freeze(clone(p)));
