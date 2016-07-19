const MockExecuteSql = {
  expectation: null,

  resetExpectation() {
    this.expectation = () => {};
  },

  setExpectation(exp) {
    this.expectation = exp;
  },

  build() {
    this.resetExpectation();
    const executeSql = (sql) => {
      this.expectation(sql);
      return Promise.resolve(sql);
    };

    return executeSql;
  }
};

module.exports = MockExecuteSql;
