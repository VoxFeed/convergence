const clone = require('lodash/cloneDeep');

const persons = [
  {
    personId: 1,
    schedule: '09:00 - 18:00',
    entryDate: new Date('2015-01-18T00:00:00.000Z'),
    ssn: '23534564356'
  },
  {
    personId: 2,
    schedule: '09:00 - 18:00',
    entryDate: new Date('2014-01-18T00:00:00.000Z'),
    ssn: '22657678456'
  },
  {
    personId: 3,
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-01-01T00:00:00.000Z'),
    ssn: '272785456'
  },
  {
    personId: 4,
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-03-18T00:00:00.000Z'),
    ssn: '24456876'
  },
  {
    personId: 5,
    schedule: '08:00 - 17:00',
    entryDate: new Date('2016-05-18T00:00:00.000Z'),
    ssn: '27786786789'
  },
  {
    personId: 6,
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-04-18T00:00:00.000Z'),
    ssn: '2876786786768'
  }
];

module.exports = persons.map(p => Object.freeze(clone(p)));
