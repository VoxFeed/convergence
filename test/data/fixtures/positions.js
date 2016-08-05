const clone = require('lodash/cloneDeep');

const persons = [
  {
    id: '4456a5f6-a701-46bd-8411-b043bfeefa95',
    name: 'VoxFeed',
    code: '1111',
    companyId: 'fcb884d4-8b97-49c2-8b00-1bbcc7061655',
    active: true
  },
  {
    id: '1fee7297-dc51-4ea5-ba3d-0504021f8e50',
    name: 'Wizeline',
    code: '1111',
    companyId: 'd173ff5d-28a0-484c-ba95-be7e6a633eef',
    active: true
  },
  {
    id: '6d322343-e449-41d9-810c-c0d3946ccf4b',
    name: 'Kueski',
    code: '2222',
    companyId: '23ef75bc-dcd9-43b2-9992-85315c424cc6',
    active: true
  },
  {
    id: '0187c311-c3f3-48df-9c79-d31689417f05',
    name: 'iTexico',
    code: '2222',
    companyId: 'b96fa763-9c66-478d-97b0-9dba653842e8',
    active: true
  },
  {
    id: '482ea7f0-fd0b-4603-966c-073ab7f9e91c',
    name: 'Empathia',
    code: '3333',
    companyId: '99b0d2fb-04ea-4db7-930f-c69c91da900e',
    active: true
  },
  {
    id: 'e509d0da-358c-437a-9dff-03c121daf125',
    name: 'Mexicoder',
    code: '3333',
    companyId: '4a259b9b-7aad-4b87-b828-27e1145a6f6b',
    active: false
  }
];

module.exports = persons.map(p => Object.freeze(clone(p)));
