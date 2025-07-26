## Version 2.0.0

- `collection.deleteByPrimaryKey()` now has complexity O(1) instead of O(n) as
  before, and now only accepts one primary key as an argument (an array of
  primary keys can no longer be passed). If the document with the passed primary
  key does not exist, it returns an error.
- `collection.getDocuments()` and `collection.setDocuments()` now gets/sets the
  data type Iterable<Document>, not Document[] as before.
- Collection fields `collection.primaryKeyField`, `collection.indexedFields` and
  Single field `single.defaultData` now is readonly.
- Added generic `PrimaryKey` for Collection.
