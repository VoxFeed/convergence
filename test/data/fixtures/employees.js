const clone = require('lodash/cloneDeep');

const persons = [
  {
    id: 1,
    personId: 1,
    schedule: '09:00 - 18:00',
    entryDate: new Date('2015-01-18T00:00:00.000Z'),
    ssn: '23534564356'
  },
  {
    id: 2,
    personId: 2,
    schedule: '09:00 - 18:00',
    entryDate: new Date('2014-01-18T00:00:00.000Z'),
    ssn: '22657678456'
  },
  {
    id: 3,
    personId: 3,
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-01-01T00:00:00.000Z'),
    ssn: '272785456'
  },
  {
    id: 4,
    personId: 4,
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-03-18T00:00:00.000Z'),
    ssn: '24456876'
  },
  {
    id: 5,
    personId: 5,
    schedule: '08:00 - 17:00',
    entryDate: new Date('2016-05-18T00:00:00.000Z'),
    ssn: '27786786789'
  },
  {
    id: 6,
    personId: 6,
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-04-18T00:00:00.000Z'),
    ssn: '2876786786768'
  }
];

module.exports = persons.map(p => Object.freeze(clone(p)));
