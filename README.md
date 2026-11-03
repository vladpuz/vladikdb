# vladikdb

> Simple and very fast JSON database for Node.js and browser

Features:

- Simple installation via npm, no need to download anything extra
- Minimalist API, only needed methods and nothing extra
- Hash-indexing for primary keys and other fields when needed
- Instant access and operation with data through RAM
- Ability to store data in any format and location (if create custom adapter),
  built-in adapters: JSONFile, LocalStorage, SessionStorage, Memory
- Ability to work with models for different data structures (if create custom
  model), built-in models: Collection, Single
- Streaming for reading/writing large data
- Safe atomic file writing in Node.js
- Inspired by [lowdb](https://github.com/typicode/lowdb), vladikdb is a more
  complete solution for high-performance data operations

## Quick Start

Installation:

```shell
npm install vladikdb
```

Creating database instance:

```typescript
import path from 'node:path'
import Vladikdb, { Collection } from 'vladikdb'
import { JSONFile } from 'vladikdb/node'
// import { LocalStorage } from 'vladikdb/browser'

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

// Node.js
const postsPath = path.join('database', 'posts.json')
const postsAdapter = new JSONFile<Post[]>(postsPath)

// Browser
// const postsKey = 'posts'
// const postsAdapter = new LocalStorage<Post[]>(postsKey)

const database = new Vladikdb({
  posts: new Collection(postsAdapter, 'id'),
  // other models..
})
```

Initialization (reading) database:

```typescript
await database.read()
```

> [!IMPORTANT]  
> Must initialize database on application startup to load existing data into
> memory.

> [!WARNING]  
> Do not change data during reading, this may cause data loss because your
> changes will be overwritten by read data.

Saving (writing) database:

```typescript
await database.write()
```

> [!NOTE]  
> If no changes, writing won't occur. This is checked automatically at model
> level to avoid unnecessary work. Check is fast without iterating all
> documents, relying on whether change methods were called previously.

Creating document:

```typescript
database.models.posts.create({
  id: 1,
  userId: 5,
  title: 'vladikdb is awesome',
  body: 'body',
})
```

Finding document by primary key:

```typescript
const post = database.models.posts.findByPrimaryKey(1)
console.log(post) // {id: 1, userId: 5, title: 'vladikdb is awesome', body: 'body'}
```

Updating document:

```typescript
database.models.posts.updateByPrimaryKey(1, (post) => {
  post.title = 'new title'
})
```

> [!NOTE]  
> Primary keys cannot be changed, attempts to change are ignored. Instead,
> delete old document and create new one.

> [!WARNING]  
> Never mutate documents outside of `.updateByPrimaryKey` mutator callback, this
> will cause collection malfunction.

> [!WARNING]  
> Mutator callback must be synchronous function, asynchronous function or
> `.then` inside synchronous function may cause collection malfunction.

Deleting document:

```typescript
database.models.posts.deleteByPrimaryKey(1)
```

Clearing collection:

```typescript
database.models.posts.clear()
```

Iterating through documents:

```typescript
// This is an iterable object, not an array! Use a for..of loop to iterate.
for (const post of database.models.posts) {
  database.models.posts.updateByPrimaryKey(post.id, (post) => {
    post.title = 'changed title'
  })
}
```

> [!TIP]  
> If you perform queries to get specific documents through iteration, cache the
> query result or use indexes instead because iterating all documents takes
> time - `O(n)`.

Indexing and searching documents by index:

First, need to add index for the field we're searching by.

```diff
const database = new Vladikdb({
-  posts: new Collection(postsAdapter, 'id'),
+  posts: new Collection(postsAdapter, 'id', ['userId']),
})
```

Then perform search by index.

```typescript
const posts = database.models.posts.findByIndex('userId', 5)
console.log(posts) // Set(1) {{…}}
```

Result is a set of all found documents.

> [!NOTE]  
> Indexing needed for fast document search by specific field. Instead of
> iterating documents to select some, use indexes for search, which is much
> faster - `O(1) vs O(n)`.

> [!WARNING]  
> Don't add indexes for all collection fields if not needed. Indexing each
> additional field slightly slows down create, update, delete operations.

### JSONFile options

Overview:

```typescript
interface JSONFileOptions {
  mode?: 'stream' | 'auto' // Default: 'auto'
  space?: number // Default: 0
}
```

### mode

Type: `'stream' | 'auto'`

Default: `'auto'`

Sets read/write mode:

- `'auto'` (Default) - reads/writes file entirely, but uses streaming if
  RangeError occurs (if file is very large). Recommended if you're sure file
  won't exceed engine's max string size or you don't know its size. Max string
  length `512MB` (V8, x64), depends on engine.
- `'stream'` - reads/writes file through streaming. Recommended if you're sure
  file will exceed engine's max string size. Setting this value improves
  performance in this case because whole file reading/writing won't happen.

```typescript
import { JSONFile } from 'vladikdb/node'

// For all JSONFile instances (can override)
JSONFile.defaultOptions.mode = 'stream'

const adapter = new JSONFile<Post[]>('PATH', {
  mode: 'stream', // For example stream
})
```

### space

Type: `number`

Default: `0`

Passed as third parameter in `JSON.stringify(value, replacer?, space?)`. Adds
padding and line breaks in file, which uses additional memory, so default is 0.

```typescript
import { JSONFile } from 'vladikdb/node'

// For all JSONFile instances (can override)
JSONFile.defaultOptions.space = 2

const adapter = new JSONFile<Post[]>('PATH', {
  space: 2, // For example 2
})
```

## Models

Database provides two built-in models:

- Collection (`object[]`) - collection of documents for fast operations by
  primary keys and fast index search.
- Single (`object`) - for single objects, like application configuration.

Example of Single usage:

```typescript
import path from 'node:path'
import Vladikdb, { Single } from 'vladikdb'
import { JSONFile } from 'vladikdb/node'
// import { LocalStorage } from 'vladikdb/browser'

interface Config {
  apiKey: string
  loglevel: string
}

const defaultConfig: Config = {
  apiKey: '',
  loglevel: 'info',
}

// Node.js
const configPath = path.join('database', 'config.json')
const configAdapter = new JSONFile<Config>(configPath)

// Browser
// const configKey = 'config'
// const configAdapter = new LocalStorage<Config>(configKey)

const database = new Vladikdb({
  config: new Single<Config>(configAdapter, defaultConfig),
  // other models..
})

await database.read()

// Get
console.log(database.models.config.data)

// Update
database.models.config.update((data) => {
  data.apiKey = 'NEW_API_KEY'
  data.loglevel = 'warn'
})

// Reset
database.models.config.reset()

await database.write()
```

> [!WARNING]  
> Never mutate data outside of `.update` mutator callback, this will cause
> single malfunction.

> [!WARNING]  
> Mutator callback must be synchronous function, asynchronous function or
> `.then` inside synchronous function may cause single malfunction.

### Creating custom model

You can create new model for optimal, fast work with any data structure.

To create model you need implement Model interface:

```typescript
interface Model<T> {
  readonly adapter: Adapter<T>
  readonly hasChanges: boolean
  read: () => Promise<void>
  write: (force?: boolean) => Promise<void>
}
```

As example refer to source code of built-in models:
https://github.com/vladpuz/vladikdb/tree/main/src/models.

## Adapters

### List of built-in adapters

For Node.js:

- TextFile
- JSONFile

For browser:

- WebStorage
- SessionStorage
- LocalStorage

For any environment:

- Memory

### Creating custom adapter

You can create adapter for storing data in any format and location, like YAML,
remote storage, data encryption, etc.

To create adapter you need implement Adapter interface:

```typescript
interface Adapter<T> {
  readonly isReading: boolean
  readonly isWriting: boolean
  read: () => Promise<ReadableData<T>> | ReadableData<T>
  write: (data: WritableData<T>) => Promise<void> | void
}
```

As example refer to source code of built-in adapters:
https://github.com/vladpuz/vladikdb/tree/main/src/adapters.

#### JSONParserStream

To make your adapter work with large data exceeding JavaScript's max string
length `512MB` (V8, x64), need to use streaming.

Recommended to use built-in high-performance transforming JSONParserStream,
which is also used in built-in JSONFile adapter. Refer to JSONFile adapter
source code for example usage:
https://github.com/vladpuz/vladikdb/blob/main/src/adapters/node/JSONFile.ts.

Recommended to provide way to choose adapter's work mode because streaming works
a bit slower than full data processing. Streaming needed only if total data size
exceeds `512MB` (V8, x64) because this is JavaScript's max string size and it's
impossible to read/write data entirely through JSON. For example, built-in
JSONFile adapter provides `mode?: 'stream' | 'auto'` option.

Features of JSONParserStream:

- Supports transformation of strings containing `object` or `object[]`
- Supports string chunks of max size `512MB` (V8, x64)
- Can work in Node.js and browser because it's a web stream
- Parses through native `JSON.parse()`. It iterates string, through stack
  determines start and end of each object, then gets substring and passes it to
  `JSON.parse()`.
- Passes chunks of type `object[]` through chain because sending each object
  separately works very slowly for large number of small objects. For example, 1
  large string chunk `512MB` (V8, x64) may contain more than 16 million small
  objects and for performance they are accumulated and passed as `object[]`
  further through chain.

Simple example of usage:

```typescript
import { JSONParserStream } from 'vladikdb'

const stream = ReadableStream.from(['[{"id', '": 1}]']) // 2 chunks
const objectStream = stream.pipeThrough(new JSONParserStream())

for await (const chunk of objectStream) {
  for (const object of chunk) {
    console.log(object) // { id: 1 }
  }
}
```

## Primary Key Generation

In Node.js or browser environment:

```typescript
const uuid = crypto.randomUUID()

database.models.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

## Optimization

When working with large amount of data you'll face performance issues. This
happens because each `write()` call serializes data through `JSON.stringify`,
thus even changing one document forces JSON format to convert all documents to
string before writing.

This can be mitigated by accumulating changes and performing `write()`
periodically and on application exit to avoid data loss:

```typescript
const WRITE_INTERVAL = 60 * 1000

const intervalId = setInterval(() => {
  database.write()
}, WRITE_INTERVAL)

// Node.js (Docker, pm2, ...)
process.on('SIGINT', () => {
  clearInterval(intervalId)
  database.write()
})
process.on('SIGTERM', () => {
  clearInterval(intervalId)
  database.write()
})

// Browser
window.addEventListener('beforeunload', () => {
  clearInterval(intervalId)
  database.write()
})
```

By default models check for data changes before writing, if no changes, writing
doesn't occur. This means you can call `database.write()` periodically without
worrying about unnecessary data writes.

## Limitations

### Engine Limitations

- All JavaScript type and data structure limitations. For example, max string
  length, max number, max array length, etc.

### General Limitations

- Only JSON-serializable types and data structures are supported.
- All data is fully loaded and stored in RAM. This allows very fast data
  operations without delays, but limits maximum data size to your RAM capacity.
- Max document size `512MB` (V8, x64). This limitation is based on JavaScript's
  max string length (may depend on engine).
- Multithreading is not supported. Must work with database only in one
  application thread because each thread stores data independently and data
  isn't synchronized between threads. Working with database in multiple threads
  will cause data desynchronization and data loss on write.

### Collection Model Limitations

- Max number of documents in collection `2^24 = 16,777,216` (V8, x64). This
  limitation is based on JavaScript's Map implementation (may depend on engine).

### JSONFile Adapter Limitations

- File size is limited only by file system.

### LocalStorage/SessionStorage Adapter Limitations

- Storage size is limited by browser.

## Comparison with lowdb

- lowdb and vladikdb use [steno](https://github.com/typicode/steno) for safe
  atomic file writing (only single-threaded).
- vladikdb supports streaming for writing unlimited size data.
- vladikdb introduces new Model entity that defines data structure and provides
  methods for efficient data operations (indexing, etc). lowdb doesn't handle
  data operations, delegating this responsibility to user.
- lowdb provides synchronous and asynchronous adapters and DB instances,
  vladikdb provides synchronous and asynchronous adapters, but Model and DB are
  always asynchronous.
- vladikdb's built-in TextFile adapter recursively creates directory if it
  doesn't exist, while lowdb's adapter would throw an error.
- vladikdb's built-in JSONFile adapter allows setting any json space (indent),
  while lowdb's space is always 2.
- lowdb adapters are compatible with vladikdb adapters, and vladikdb has same
  built-in adapters as lowdb (except DataFile).
- DataFile adapter was removed.

## API

### Vladikdb

#### new Vladikdb(models)

models: `Record<string, Model<any>>`

Creates database instance for managing models.

#### database.models

Type: `Record<string, Model<any>>`

Object of models passed when creating instance.

#### database.modelsArray

Type: `Array<Model<unknown>>`

Array of models passed when creating instance.

#### database.read()

Calls read() to all models.

Modifying model data during reading is unsafe because it may be overwritten by
read data and lost. Recommended to call this method only once on application
startup.

#### database.write(force?)

- force? (`boolean = false`) - Forces write even if no data changes.

Calls write() to all models.

#### database.isReading

Type: `boolean`

True if at least one model's adapter is reading, false otherwise.

#### database.isWriting

Type: `boolean`

True if at least one model's adapter is writing, false otherwise.

#### database.hasChanges

Type: `boolean`

True if at least one model has changes, false otherwise.

### Collection

#### new Collection(adapter, primaryKey, options?)

Creates collection instance.

- adapter (`Adapter`) - Any adapter.
- primaryKey (`keyof Document`) - Document's primary key. Specified key must
  contain only primitive data types. Specified key must contain unique value
  among other documents.
- indexedKeys? (`Array<keyof Document>`) - Indexed document keys. Should not
  contain primaryKey.

#### collection.adapter

Type: `Adapter`

Adapter passed when creating instance.

#### collection.hasChanges

Type: `boolean`

True if changes for writing exist.

#### collection.read()

Complexity: `O(n)`

Reads data through collection adapter.

#### collection.write(force?)

Complexity: `O(n)`

- force? (`boolean = false`) - Forces write even if no data changes.

Writes data through collection adapter.

#### collection.clear()

Complexity: `O(1)`

Clears collection from all documents.

#### collection.create(document)

Complexity: `O(1)`

document: `Document`

Creates document.

Throws error if document with such primary key already exists.

#### collection.findByIndex(indexKey, indexValue)

Complexity: `O(1)`

Return: `Set<Document>`

indexKey: `keyof Document`

indexValue: `Document[keyof Document]`

Searches documents by index.

Throws error if indexKey wasn't specified in indexedKeys when creating instance.

#### collection.findByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document | undefined`

primaryKey: `keyof Document`

Searches document by primary key.

#### collection.updateByPrimaryKey(primaryKey, mutator)

Complexity: `O(1)`

Return: `Document`

primaryKey: `keyof Document`

mutator: `(document: Document) => void`

Updates document by primary key.

Throws error if document with primary key primaryKey doesn't exist.

Changing primary key through mutator callback is ignored (field restores
original value). If need to change primary key, delete old document and create
new one.

Never mutate documents outside of `.updateByPrimaryKey` mutator callback, this
will cause collection malfunction (data loss and memory leaks).

Mutator callback must be synchronous function, asynchronous function or `.then`
inside synchronous function may cause collection malfunction (memory leaks).

#### collection.deleteByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document`

primaryKey: `keyof Document`

Deletes document by primary key.

Throws error if document with primary key primaryKey doesn't exist.

#### collection.size()

Complexity: `O(1)`

Returns current collection size.

### Single

#### new Single(adapter, defaultData)

Creates single instance.

- adapter (`Adapter`) - Any adapter.
- defaultData (`Data`) - Default data.

#### single.data

Type: `Data`

Single's data.

#### single.adapter

Type: `Adapter`

Adapter passed when creating instance.

#### single.hasChanges

Type: `boolean`

True if changes for writing exist.

#### single.read()

Reads data through single adapter.

#### single.write(force?)

- force? (`boolean = false`) - Forces write even if no data changes.

Writes data through single adapter.

#### single.update(mutator)

mutator: `(data: Data) => void`

Updates single's data.

Never mutate data outside of `.update` mutator callback, this will cause single
malfunction (data loss).

Mutator callback must be synchronous function, asynchronous function or `.then`
inside synchronous function may cause single malfunction (data loss).

#### single.reset()

Resets data to defaultData.
