const employees = require('./employees');
const persons = require('./persons');

const extendPersonWithEmployee = p => Object.assign({}, p, findEmployee(p.id));
const findEmployee = id => employees.find(e => e.personId === id);
module.exports = persons.map(extendPersonWithEmployee);
