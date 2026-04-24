## 4.0.0

This is a major update 🚀 aimed at supporting streaming for working with very
large data sizes 📊📁.

General changes:

- All private TypeScript fields were replaced with private JavaScript fields
  (#property).

### Renaming

Content was renamed to model to better reflect its purpose:

- Interface `Content<T>` was renamed to `Model<T>`.
- Field `database.content` was renamed to `database.models`.
- Field `database.contentArray` was renamed to `database.modelsArray`.

### Streaming

Streaming was added for reading/writing large amounts of data. Previously, the
maximum size of data for a single model was limited by the maximum string length
in JavaScript, for example `512MB` (V8, x64). This happens because
`JSON.stringify()` and `JSON.parse()` work with strings. Now this limitation is
removed!

#### For regular users

Built-in JSONFile and TextFile adapters now will use streaming for
reading/writing large amounts of data. User changes are not required, but you
can explicitly set the new mode for the adapter. This will improve performance
if the size of the data collection is larger than the maximum string length in
JavaScript because it will cancel the attempt to read/write data entirely:

```typescript
import { JSONFile } from 'vladikdb/node'

// For all JSONFile instances (can override)
JSONFile.defaultOptions.mode = 'stream'

// For one JSONFile instance
const adapter = new JSONFile<Post[]>('PATH', {
  mode: 'stream',
})
```

The default mode is `auto`, which tries to read/write data entirely, but in case
of an error, it reads/writes through streaming. This is done because streaming
works a little slower than reading/writing entirely. If your data size does not
exceed the maximum string length in JavaScript, or you are unsure, do not set
the `stream` mode.

Note: the default value of the JSONFile space option was changed from 2 to 0
because formatting consumes additional memory.

#### For custom adapter developers

Custom adapters may use streaming if it is possible for your storage, but even
if streaming is not used, you need to make changes to ensure adapters work
correctly with the new version.

It is recommended to follow the example of JSONFile and provide the option to
configure the adapter's working mode through the `mode?: 'stream' | 'auto'`
option. The `auto` option (default) should attempt to read/write data entirely,
but in case of a RangeError error, read/write through streaming.

The `Adapter<T>` interface was changed:

```typescript
interface Adapter<T> {
  readonly isReading: boolean
  readonly isWriting: boolean
  read: () => Promise<ReadableData<T>> | ReadableData<T>
  write: (data: WritableData<T>) => Promise<void> | void
}
```

Transition instruction for the `adapter.read()` method:

- If the adapter uses streaming, return an asynchronously iterable object
  (`AsyncIterable<T>`).
- If the adapter does not use streaming, no changes are required.

Transition instruction for the `adapter.write()` method. Now, an iterable object
may be passed as data:

- If the adapter uses streaming, pass the iterator data to the stream, see
  examples of JSONFile and TextFile
  (https://github.com/vladpuz/vladikdb/tree/main/src/adapters/node).
- If the adapter does not use streaming, convert this iterable object to an
  array and process it as a regular array, see the Memory adapter example
  (https://github.com/vladpuz/vladikdb/blob/main/src/adapters/Memory.ts).

Note: the `DataFile` adapter was removed because it was not designed for
streaming.

### New adapter and model fields

Custom adapters and models must add these fields to work correctly with the new
version. Built-in adapters and models already have these fields.

For adapters, fields reflecting the current reading/writing state were
introduced:

- `adapter.isReading` (`boolean`) - will be true if reading is in progress,
  otherwise false.
- `adapter.isWriting` (`boolean`) - will be true if writing is in progress,
  otherwise false.

For models, a field reflecting data changes was introduced:

- `model.hasChanges` (`boolean`) - will be true if changes exist, otherwise
  false.

### Collection

#### Collections are now iterable

Methods `collection.getDocuments()` and `collection.setDocuments()` were
removed.

Instead of getDocuments, use the collection iterator, for example:

```typescript
// Iterate collection
for (const post of database.models.posts) {
  console.log(post)
}

// Getting an array (not recommended)
const posts = [...database.models.posts]
```

Instead of setDocuments, use CRUD methods of the collection to change documents.
For clearing, instead of `collection.setDocuments([])` use the new method
`collection.clear()`.

#### Collection size

A getter `collection.size` was added to get the current number of documents in
the collection.

#### Other collection changes

- Method `collection.findByIndexedField()` was renamed to
  `collection.findByIndex()`.
- Fields `collection.primaryKeyField` and `collection.indexedFields` are now
  private.

### Single

#### Reset

A new method `single.reset()` was added. It resets the single's data to the
default data.

#### Optimization

A small optimization: now if `single.setData()` does not change the data (the
same object is assigned), then `single.write()` will skip the write since there
are no changes. For example:

```typescript
const data = single.getData()

single.setData(data) // No changes
await single.write() // Write will be skipped
```

#### Other single changes

- Field `single.defaultData` is now private.

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
