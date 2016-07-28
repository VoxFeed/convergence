const clone = require('lodash/cloneDeep');

const persons = [
  {
    id: '672ee20a-77a0-4670-ac19-17c73e588774',
    name: 'Jon',
    lastName: 'Doe',
    age: 23,
    tracked: false,
    rating: 1,
    job: {title: 'Aprentice', companyName: 'VoxFeed'},
    createdAt: new Date('2016-01-18T00:00:00.000Z')
  },
  {
    id: 'f8769847-a272-42fc-a09a-1f27d5b58176',
    name: 'Alberto',
    lastName: 'Romero',
    age: 22,
    tracked: true,
    rating: 2,
    job: {title: 'Programmer', companyName: 'VoxFeed'},
    createdAt: new Date('2016-01-18T00:00:00.000Z')
  },
  {
    id: '97392189-482b-410f-9581-4f5032b18e96',
    name: 'Gibran',
    lastName: 'Arias',
    age: 27,
    tracked: true,
    rating: 3,
    job: {title: 'QA', companyName: 'VoxFeed'},
    createdAt: new Date('2015-11-02T00:00:00.000Z')
  },
  {
    id: '036fb71a-54ff-4ca8-8604-553ebfeee053',
    name: 'Luis',
    lastName: 'Argumedo',
    age: 24,
    tracked: true,
    rating: 4,
    job: {title: 'Programmer', companyName: 'VoxFeed'},
    createdAt: new Date('2015-09-28T00:00:00.000Z')
  },
  {
    id: '645401c1-8fba-4716-8a67-ca8cfa090725',
    name: 'Jesus Agustin',
    lastName: 'Peña Meza',
    age: 27,
    tracked: false,
    rating: 5,
    job: {title: 'Programmer', companyName: 'VoxFeed'},
    createdAt: new Date('2015-10-19T00:00:00.000Z')
  },
  {
    id: 'db9a561b-ae9a-4c31-a6a9-508a65f75a04',
    name: 'Abiee Alejandro',
    lastName: 'Echamea',
    age: 28,
    tracked: false,
    rating: 6,
    job: {title: 'Programmer', companyName: 'Wizeline'},
    createdAt: new Date('2015-11-20T00:00:00.000Z')
  }
];

module.exports = persons.map(p => Object.freeze(clone(p)));
