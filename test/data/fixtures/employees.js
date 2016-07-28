const clone = require('lodash/cloneDeep');

const persons = [
  {
    personId: '672ee20a-77a0-4670-ac19-17c73e588774',
    schedule: '09:00 - 18:00',
    entryDate: new Date('2015-01-18T00:00:00.000Z'),
    ssn: '23534564356'
  },
  {
    personId: 'f8769847-a272-42fc-a09a-1f27d5b58176',
    schedule: '09:00 - 18:00',
    entryDate: new Date('2014-01-18T00:00:00.000Z'),
    ssn: '22657678456'
  },
  {
    personId: '97392189-482b-410f-9581-4f5032b18e96',
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-01-01T00:00:00.000Z'),
    ssn: '272785456'
  },
  {
    personId: '036fb71a-54ff-4ca8-8604-553ebfeee053',
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-03-18T00:00:00.000Z'),
    ssn: '24456876'
  },
  {
    personId: '645401c1-8fba-4716-8a67-ca8cfa090725',
    schedule: '08:00 - 17:00',
    entryDate: new Date('2016-05-18T00:00:00.000Z'),
    ssn: '27786786789'
  },
  {
    personId: 'db9a561b-ae9a-4c31-a6a9-508a65f75a04',
    schedule: '10:00 - 19:00',
    entryDate: new Date('2016-04-18T00:00:00.000Z'),
    ssn: '2876786786768'
  }
];

module.exports = persons.map(p => Object.freeze(clone(p)));
