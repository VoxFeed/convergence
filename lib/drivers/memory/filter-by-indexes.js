const {values, has, pick, isEmpty, get} = require('lodash');

const FilterByIndexes = (model, store) => {
  const collection = model.collection;
  const collectionIndexes = `${collection}_indexes`;

  const parentModel = model.isExtended() ? model.getExtendedModel().model : {};
  const foreignKey = model.isExtended() ? model.getExtendedModel().foreignKey : '';
  const parentCollection = model.isExtended() ? parentModel.collection : '';
  const parentCollectionIndexes = model.isExtended() ? `${parentCollection}_indexes` : '';

  const primaryKey = model.getPrimaryKey();
  const singleIndexKey = model.getUniqueSingleIndexes()[0];
  const combinedIndexKeys = model.getUniqueCombinedIndexes();

  const applyFilter = query => {
    if (has(query, primaryKey)) return filterByPrimaryKey(query[primaryKey]);
    if (has(query, singleIndexKey)) return filterByUniqueIndex(singleIndexKey, query[singleIndexKey]);
    const indexKeysCombined = combinedIndexKeys.join('°U°');
    const indexValuesCombined = values(pick(query, combinedIndexKeys)).join('°U°');

    if (!isEmpty(combinedIndexKeys) && queryHasCombinedIndexes(query)) return filterByUniqueIndex(indexKeysCombined, indexValuesCombined);
    return handleResponse(store[collection]);
  };

  const filterByPrimaryKey = primaryKeyValue => {
    const index = store[collectionIndexes].primary[primaryKeyValue];
    return handleResponse([get(store, [collection, index], true)]);
  };

  const filterByUniqueIndex = (field, uniqueIndex) => {
    const index = store[collectionIndexes].unique[field][uniqueIndex];
    return handleResponse([get(store, [collection, index], {})]);
  };

  const queryHasCombinedIndexes = (query) => {
    const combinedIndexKeys = model.getUniqueCombinedIndexes();
    return combinedIndexKeys.reduce((result, key) => {
      result && has(query, key) && true;
    }, true);
  };

  const handleResponse = response => {
    if (!model.isExtended()) return values(response);
    const dataStore = values(response);
    const dataExtendedStore = values(store[parentCollection]);
    return _mergeStores(dataStore, dataExtendedStore, foreignKey);
  };

  const _mergeStores = (dataStore, extendedStore, fk) => {
    return dataStore.map(storeItem => {
      const storeIndex = store[parentCollectionIndexes].primary[storeItem[primaryKey]];
      const extendedStoreItem = store[parentCollection][storeIndex];
      return Object.assign({}, extendedStoreItem, storeItem);
    });
  };

  return applyFilter;
};

module.exports = FilterByIndexes;
