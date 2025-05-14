type Key = string | number;
type Item = { [x: string]: unknown };

/**
 * Helper function to use as a comparer when sorting an array of items based on a key in the item.
 */
export function sortItemsByKey(key: Key) {
  return sortItemsBy((item: Item) => item[key]);
}

/**
 * Helper function to use as a comparer when sorting an array of items.
 */
export function sortItemsBy<T>(mapper: (item: T) => unknown) {
  return (a: T, b: T) => {
    const aString = (mapper(a) || '').toString();
    const bString = (mapper(b) || '').toString();
    return aString.localeCompare(bString);
  };
}

// returns selector function that can be uses in _.sortBy for lowercased sort by key/
export const lowercasedSelectorByKey = (key: Key) => (item: Item) => {
  const v = item[key];
  return typeof v === 'string' ? v.toLocaleLowerCase() : v;
};