const {isEqual} = require('lodash');

const {types, defineModel} = require('lib/model/definition');
const MongoTranspiler = require('lib/drivers/mongo/transpiler');
const startDate = 1;
const endDate = 1;
const engine = {name: 'mongo'};

describe('Mongo Transpiler', () => {
  describe('Select', () => {
    let model;
    beforeEach(() => {
      model = require('test/test-helpers/build-single-table-schema')(engine);
    });

    describe('Simple Model', () => {
      let transpiler;
      beforeEach(() => {
        transpiler = MongoTranspiler(model);
      });

      it('should return empty object if there are no query conditions', () => {
        const uql = {};
        const expected = {};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with one condition', () => {
        const uql = {where: {name: 'Jon'}};
        const expected = {name: 'Jon'};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with two conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe'}};
        const expected = {name: 'Jon', last_name: 'Doe'};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with three conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = {name: 'Jon', last_name: 'Doe', age: 23, rating: 5.2};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = {name: 123, last_name: null, age: null, rating: null};
        const actual = transpiler.select(uql).query;
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with a date range condition', () => {
        const uql = { where: { createdAt: {gte: new Date(startDate), lt: new Date(endDate)} } };
        const actual = transpiler.select(uql).query;
        const expected = {
          created_at: {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
          }
        };
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct mongo query with three regular conditions and a date range condition', () => {
        const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
        const dateRange = {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate)
          }
        };
        const uql = {where: Object.assign({}, regularConds, dateRange)};
        const expectedConds = {name: 'Jon', last_name: 'Doe', age: 23};
        const expectedDateRange = {
          created_at: {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
          }
        };
        const actual = transpiler.select(uql).query;
        const expected = Object.assign({}, expectedConds, expectedDateRange);
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct MongoQuery with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$or: [{name: 'Jon'}, {last_name: 'Doe'}]};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with explicit and operator', () => {
        const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$and: [{name: 'Jon'}, {last_name: 'Doe'}]};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with a single lt operator', () => {
        const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
        const expected = {tracked: true, created_at: {$lt: new Date(startDate)}};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = {'job.title': 'Programmer'};
        const actual = transpiler.select(uql).query;
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with order and single field to order', () => {
        const uql = {order: {age: 'ASC'}};
        const expected = {query: {}, sort: {age: 1}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with multiple order conditions', () => {
        const uql = {order: {age: 'ASC', lastName: 'DESC'}};
        const expected = {query: {}, sort: {age: 1, last_name: -1}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });
    });

    describe('Extended Model', () => {
      let transpiler;
      let model;

      beforeEach(() => {
        model = require('test/test-helpers/build-single-table-schema')(engine);
        const extended = defineModel({
          collection: 'employees',
          engine,
          definition: {
            personId: types.FOREIGN_KEY,
            schedule: types.STRING,
            entryDate: types.DATE,
            ssn: types.STRING
          }
        });
        extended.extend(model, 'personId');
        transpiler = MongoTranspiler(extended);
      });

      it('should return empty object if there are no query conditions', () => {
        const uql = {};
        const expected = {parent: {query: {}, sort: {}}, extended: {query: {}, sort: {}}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct mongo query with one condition', () => {
        const uql = {where: {name: 'Jon'}};
        const expected = {parent: {query: {}, sort: {}}, extended: {query: {name: 'Jon'}, sort: {}}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct mongo query with two conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe'}};
        const expected = {parent: {query: {}, sort: {}}, extended: {query: {name: 'Jon', last_name: 'Doe'}, sort: {}}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct mongo query with a date range condition', () => {
        const uql = { where: { createdAt: {gte: new Date(startDate), lt: new Date(endDate)} } };
        const actual = transpiler.select(uql);
        const expected = {
          parent: {query: {}, sort: {}},
          extended: {
            query: {
              created_at: {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
              }
            }, sort: {}
          }
        };
        expect(actual).to.be.deep.equals(expected);
      });

      it('should create correct MongoQuery with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {
          parent: {query: {}, sort: {}},
          extended: {query: {$or: [{name: 'Jon'}, {last_name: 'Doe'}]}, sort: {}}
        };
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with explicit and operator', () => {
        const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {parent: {query: {}, sort: {}}, extended: {query: {$and: [{name: 'Jon'}, {last_name: 'Doe'}]}, sort: {}}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with a single lt operator', () => {
        const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
        const expected = {
          parent: {query: {}, sort: {}},
          extended: {query: {tracked: true, created_at: {$lt: new Date(startDate)}}, sort: {}}
        };
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = {
          parent: {query: {}, sort: {}},
          extended: {query: {'job.title': 'Programmer'}, sort: {}}
        };
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with order and single field to order', () => {
        const uql = {order: {age: 'ASC'}};
        const expected = {parent: {query: {}, sort: {}}, extended: {query: {}, sort: {age: 1}}};
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with multiple order conditions', () => {
        const uql = {order: {age: 'ASC', ssn: 'DESC'}};
        const expected = {
          parent: {query: {}, sort: {ssn: -1}},
          extended: {query: {}, sort: {age: 1}}
        };
        const actual = transpiler.select(uql);
        expect(actual).to.be.deep.equal(expected);
      });
    });
  });

  describe('Insert', () => {
    describe('Simple Model', () => {
      let transpiler;
      beforeEach(() => {
        transpiler = MongoTranspiler();
      });

      it('should create sql with one field', () => {
        const data = {name: 'Jon'};
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create sql with two fields', () => {
        const data = {name: 'Jon', lastName: 'Doe'};
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create sql with three fields', () => {
        const data = {name: 'Jon', lastName: 'Doe', age: 23};
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create sql with all schema fields', () => {
        const data = {
          name: 'Jon',
          lastName: 'Doe',
          age: 23,
          tracked: false,
          job: {title: 'Programmer', company: 'VoxFeed'}
        };
        const expected = Object.assign({}, data);
        const actual = transpiler.insert(data);
        expect(actual).to.be.deep.equal(expected);
      });
    });

    describe('Count', () => {
      let transpiler;
      beforeEach(() => {
        transpiler = MongoTranspiler();
      });

      it('should return correct mongo query if no where clause is sent', () => {
        const uql = {};
        const expected = Object.assign({}, uql);
        const actual = transpiler.count(uql);
        expect(isEqual(actual, expected)).to.be.true;
      });

      it('should create correct mongo query with one condition', () => {
        const uql = {where: {name: 'Jon'}};
        const expected = {name: 'Jon'};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct mongo query with two conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe'}};
        const expected = {name: 'Jon', lastName: 'Doe'};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct mongo query with four conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = {name: 123, lastName: null, age: null, rating: null};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with a date range condition', () => {
        const uql = {
          where: {
            createdAt: {gte: new Date(startDate), lt: new Date(endDate)}
          }
        };
        const actual = transpiler.count(uql);
        const expected = {
          createdAt: {$gte: new Date(startDate), $lt: new Date(endDate)}
        };
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with regular and date range conditions', () => {
        const regularConds = {name: 'Jon', lastName: 'Doe', age: 23};
        const dateRange = {
          createdAt: {
            gte: new Date(startDate),
            lt: new Date(endDate)
          }
        };
        const uql = {where: Object.assign({}, regularConds, dateRange)};
        const expectedRegularConds = Object.assign({}, regularConds);
        const expectedDateRange = {
          createdAt: {$gte: new Date(startDate), $lt: new Date(endDate)}
        };
        const expected = Object.assign({}, expectedRegularConds, expectedDateRange);
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$or: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with explicit and operator', () => {
        const uql = {where: {and: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$and: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with a single lt operator', () => {
        const uql = {where: {tracked: true, createdAt: {lt: new Date(startDate)}}};
        const expected = {tracked: true, createdAt: {$lt: new Date(startDate)}};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = {'job.title': 'Programmer'};
        const actual = transpiler.count(uql);
        expect(actual).to.be.deep.equal(expected);
      });
    });

    describe('Update', () => {
      describe('Simple Model', () => {
        let transpiler;
        let model;

        beforeEach(() => {
          model = require('test/test-helpers/build-single-table-schema')(engine);
          transpiler = MongoTranspiler(model);
        });

        it('should create update mongo query with one field', () => {
          const data = {name: 'Jon'};
          const query = {where: {'job.title': 'Programmer'}};
          const expected = {
            query: {'job.title': 'Programmer'},
            update: {$set: {name: 'Jon'}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });

        it('ignores primary key from set values', () => {
          const data = {id: '1', name: 'Jon'};
          const query = {where: {'job.title': 'Programmer'}};
          const expected = {
            query: {'job.title': 'Programmer'},
            update: {$set: {name: 'Jon'}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });

        it('should create update mongo query with one field and no conditions', () => {
          const data = {name: 'Jon'};
          const query = {};
          const expected = {
            query: {},
            update: {$set: {name: 'Jon'}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });

        it('should create update MongoQuery with one field and unexistent conditions', () => {
          const data = {name: 'Jon'};
          let query;
          const expected = {
            query: {},
            update: {$set: {name: 'Jon'}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });

        it('should return empty object in update if no data is sent', () => {
          const query = {where: {name: 'Jon'}};
          const expected = {};
          const actual = transpiler.update(query);
          expect(actual).to.be.deep.equal(expected);
        });

        it('should create update mongo with one full json field', () => {
          const data = {'job': {title: 'Programmer', companyName: 'VoxFeed'}};
          const query = {where: {name: 'Jon'}};
          const expected = {
            query: {name: 'Jon'},
            update: {$set: {job: {title: 'Programmer', companyName: 'VoxFeed'}}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });

        it('should create update MongoQuery with one atribute in json field', () => {
          const data = {'job.title': 'Programmer'};
          const query = {where: {name: 'Jon'}};
          const expected = {
            query: {name: 'Jon'},
            update: {$set: {'job.title': 'Programmer'}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });

        it('should create update MongoQuery with two atributes in json field', () => {
          const data = {'job.title': 'Programmer', 'job.companyName': 'VoxFeed'};
          const query = {where: {name: 'Jon'}};
          const expected = {
            query: {name: 'Jon'},
            update: {$set: {'job.title': 'Programmer', 'job.companyName': 'VoxFeed'}},
            options: {multi: true}
          };
          const actual = transpiler.update(query, data);
          expect(actual).to.be.deep.equal(expected);
        });
      });
    });
  });

  describe('Remove', () => {
    describe('Single Model', () => {
      let transpiler;

      beforeEach(() => {
        transpiler = MongoTranspiler();
      });

      it('should return correct sql if no where clause is sent', () => {
        const uql = {};
        const expected = {};
        const actual = transpiler.remove(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with one field', () => {
        const query = {where: {name: 'Jon'}};
        const expected = {name: 'Jon'};
        const actual = transpiler.remove(query);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with many conditions', () => {
        const uql = {where: {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2}};
        const expected = {name: 'Jon', lastName: 'Doe', age: 23, rating: 5.2};
        const actual = transpiler.remove(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with bad values', () => {
        const uql = {where: {name: 123, lastName: null, age: null, rating: null}};
        const expected = {name: 123, lastName: null, age: null, rating: null};
        const actual = transpiler.remove(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery with or operator', () => {
        const uql = {where: {or: [{name: 'Jon'}, {lastName: 'Doe'}]}};
        const expected = {$or: [{name: 'Jon'}, {lastName: 'Doe'}]};
        const actual = transpiler.remove(uql);
        expect(actual).to.be.deep.equal(expected);
      });

      it('should create correct MongoQuery for single json inner query', () => {
        const uql = {where: {'job.title': 'Programmer'}};
        const expected = {'job.title': 'Programmer'};
        const actual = transpiler.remove(uql);
        expect(actual).to.be.deep.equal(expected);
      });
    });
  });

  describe('Upsert', () => {
    describe('Single Model', () => {
      const {defineModel, types} = require('lib/model/definition');
      const options = {upsert: true};
      let model;
      let transpiler;

      beforeEach(() => {
        model = defineModel({
          collection: 'persons',
          definition: {
            id: types.UUID,
            name: types.STRING,
            lastName: types.STRING,
            age: types.INTEGER,
            job: types.JSON
          },
          engine
        });
        transpiler = MongoTranspiler();
      });

      describe('Single Unique Index', () => {
        it('creates upsert sql with no unique indexes', () => {
          const data = {name: 'Jon'};
          const expected = {query: {}, update: {$set: data}, options};
          const actual = transpiler.upsert(data);
          expect(actual).to.be.deep.equals(expected);
        });

        it('creates upsert sql with one unique index', () => {
          model.unique({single: ['age']});
          const data = {name: 'Jon', age: 25};
          const query = {where: {age: 25}};
          const expected = {query: {age: 25}, update: {$set: data}, options};
          const actual = transpiler.upsert(data, query);
          expect(actual).to.be.deep.equals(expected);
        });

        it('ignores primary key from update set values', () => {
          model.setPrimaryKey('id');
          model.unique({single: ['age']});
          const data = {id: '1', name: 'Jon', age: 25};
          const query = {where: {age: 25}};
          const expected = {query: {age: 25}, update: {$set: data}, options};
          const actual = transpiler.upsert(data, query);
          expect(actual).to.be.deep.equals(expected);
        });

        it('creates upsert query with multiple unique indexes and json property', () => {
          model.unique({single: ['last_name', 'age']});
          const query = {where: {lastName: 'Doe'}};
          const data = {name: 'Jon', last_name: 'Doe', age: 25};
          const expected = {query: {lastName: 'Doe'}, update: {$set: data}, options};
          const actual = transpiler.upsert(data, query);
          expect(actual).to.be.deep.equals(expected);
        });

        it('creates upsert query with no unique indexes using primary key instead', () => {
          model.setPrimaryKey('id');
          const data = {id: '1', name: 'Jon'};
          const query = {where: {id: '1'}};
          const expected = {query: {id: '1'}, update: {$set: data}, options};
          const actual = transpiler.upsert(data, query);
          expect(actual).to.be.deep.equals(expected);
        });
      });

      describe('Combined Unique Indexes', () => {
        it('creates upsert sql with one combined index', () => {
          model.unique({combined: ['age', 'last_name']});
          const data = {name: 'Jon', age: 25};
          const query = {where: {lastName: 'Doe'}};
          const expected = {query: {lastName: 'Doe'}, update: {$set: data}, options};
          const actual = transpiler.upsert(data, query);
          expect(actual).to.be.deep.equals(expected);
        });
      });
    });
  });
});
