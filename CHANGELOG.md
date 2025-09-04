## 3.0.0

- Added parameter `force?: boolean` for Content interface method
  `write(force?: boolean): Promise<void>`. By default, the write method does not
  write if there are no changes, but if you pass the force parameter, then write
  will happen anyway. By default, false.
- Added option `space?: number` for JSONFile adapter. Default space is 2.
- Removed Content interface method `init()` and `database.init()`, use `read()`
  instead of this.
- Removed Content interface method `clear()` and `database.clear()`, use
  `setDocuments([])` / `setData(defaultData)` and `write()` instead of this.
- Added `DataFile` adapter as in lowdb.
- Database fields `database.content` and `database.contentArray` now is
  readonly, `collection.adapter` and `single.adapter` now is readonly.

## 2.0.0

- `collection.deleteByPrimaryKey()` now has complexity O(1) instead of O(n) as
  before, and now only accepts one primary key as an argument (an array of
  primary keys can no longer be passed). If the document with the passed primary
  key does not exist, it returns an error.
- `collection.getDocuments()` and `collection.setDocuments()` now gets/sets the
  data type Iterable<Document>, not Document[] as before.
- Collection fields `collection.primaryKeyField`, `collection.indexedFields` and
  Single field `single.defaultData` now is readonly.
- Added generic `PrimaryKey` for Collection.
