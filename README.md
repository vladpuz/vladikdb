# vladikdb

> Simple and fast JSON database for node and browser

Features:

- Simple installation via npm, no need to download anything extra
- Minimalist API, only needed methods and nothing extra
- Hash-indexing for primary keys and other fields when needed
- Instant access and work with data through RAM
- Ability to store data in any format and location (if create custom adapter),
  built-in adapters: JSONFile, LocalStorage, SessionStorage, Memory
- Ability to work with models for different data structures (if create custom
  model), built-in models: Collection, Single
- Streaming for reading/writing large data
- Safe atomic file writing in Node.js
- Inspired by [lowdb](https://github.com/typicode/lowdb), vladikdb is more
  complete solution for high-performance data work

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
}

// For node
const postsPath = path.join('database', 'posts.json')
const postsAdapter = new JSONFile<Post[]>(postsPath)

// For browser
// const postsKey = 'posts'
// const postsAdapter = new LocalStorage<Post[]>(postsKey)

// userId - is an indexed key for example with findByIndex
const database = new Vladikdb({
  posts: new Collection(postsAdapter, 'id', ['userId']),
})
```

Initialization (reading) database:

```typescript
await database.read()
```

Saving (writing) database:

```typescript
// Write all database (it's fast, checks for real changes)
await database.write()

// Write only posts
await database.models.posts.write()
```

Creating document:

```typescript
database.models.posts.create({
  id: 1,
  userId: 5, // Foreign key for example
  title: 'vladikdb is awesome',
})
```

Getting document by id or index:

```typescript
// Read by id
const post = database.models.posts.findByPrimaryKey(1)
console.log(post)

// Read by userId, works only for indexed keys
const posts = database.models.posts.findByIndex('userId', 5)
console.log(posts)
```

Updating document:

```typescript
database.models.posts.updateByPrimaryKey(1, {
  id: 1,
  userId: 6,
  title: 'new title',
})
```

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
  // Bad, do not mutate collection documents!!! Use methods.
  post.title = 'changed title'

  // Good, method is used.
  database.models.posts.updateByPrimaryKey(post.id, {
    ...post,
    title: 'changed title',
  })
}
```

Note: if you perform queries to get specific documents through iteration, cache
the result of the query because iterating through all documents takes a lot of
time - `O(n)`.

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

Sets the read and write file mode:

- `'auto'` (Default) - reads/writes the file completely, but in case of
  RangeError error (if file is very large), reads/writes through streaming.
  Recommended if you are sure that the file will not exceed the maximum string
  size of your engine, or you don't know how large it will be. Maximum string
  length `512MB` (V8, x64), depends on the engine.
- `'stream'` - reads/writes the file through streaming. Recommended if you are
  sure that the file will exceed the maximum string size of your engine. Setting
  this value will improve performance in this case because trying to read/write
  the whole file will not happen.

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
indentation and line breaks in the file, this takes additional memory, so
default is 0.

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

- Collection (`object[]`) - collection of documents designed for fast work with
  documents by primary keys and fast search by indexes.
- Single (`object`) - designed for single objects, for example application
  configuration.

Example usage of Single:

```typescript
import path from 'node:path'

import Vladikdb, { Single } from 'vladikdb'
import { JSONFile } from 'vladikdb/node'
// import { LocalStorage } from 'vladikdb/browser'

interface Config {
  apiKey?: string
  loglevel?: string
}

// Node
const configPath = path.join('database', 'config.json')
const configAdapter = new JSONFile<Config>(configPath)

// Browser
// const configKey = 'config'
// const configAdapter = new LocalStorage<Config>(configKey)

const database = new Vladikdb({
  config: new Single<Config>(configAdapter, {}),
})

await database.read()

database.models.config.setData({
  apiKey: '<NEW_API_KEY>',
})

const data = database.models.config.getData()
console.log(data)

// Reset to default data
// database.models.config.reset()

await database.write()
```

### Creating custom model

You can create new model for optimal, fast work with any data structure.

To create model you need to implement Model interface:

```typescript
interface Model<T> {
  readonly adapter: Adapter<T>
  readonly hasChanges: boolean
  read: () => Promise<void>
  write: (force?: boolean) => Promise<void>
}
```

As an example refer to source code of built-in models:
https://github.com/vladpuz/vladikdb/tree/main/src/models.

## Adapters

### List of built-in adapters

For node:

- TextFile
- JSONFile

For browser:

- WebStorage
- SessionStorage
- LocalStorage

For any environment:

- Memory

### Creating custom adapter

You can create adapter for storing data in any format and location, for example
YAML, remote storage, data encryption and so on.

To create adapter you need to implement Adapter interface:

```typescript
interface Adapter<T> {
  readonly isReading: boolean
  readonly isWriting: boolean
  read: () => Promise<ReadableData<T>> | ReadableData<T>
  write: (data: WritableData<T>) => Promise<void> | void
}
```

As an example refer to source code of built-in adapters:
https://github.com/vladpuz/vladikdb/tree/main/src/adapters.

#### JSONObjectStream

To make your adapter work with large data exceeding maximum string length in
JavaScript `512MB` (V8, x64), you need to use streaming.

It is recommended to use built-in high-performance transforming stream
JSONObjectStream, which is also used in built-in adapter JSONFile. Refer to
source code of adapter JSONFile for example usage:
https://github.com/vladpuz/vladikdb/blob/main/src/adapters/node/JSONFile.ts.

It is recommended to provide a way to choose adapter mode because streaming
works a bit slower than processing data completely. Streaming is needed only if
total data size exceeds `51 MB` (V8, x64) because this is maximum string length
in JavaScript and in such case it is impossible to read/write data completely
through JSON. For example, built-in adapter JSONFile provides option
`mode?: 'stream' | 'auto'`.

Features of JSONObjectStream:

- Supports transformation of strings containing `object` or `object[]`
- Supports string chunks with maximum size `512MB` (V8, x64)
- Can work in node and browser because it is a web stream
- Parses through native `JSON.parse()`. It iterates the string, through stack
  determines the beginning and end of each object, then gets substring and
  passes it to `JSON.parse()`.
- Passes chunks of type `object[]` through the chain because passing each object
  separately works very slowly for large number of small objects. For example, 1
  string chunk of large size `512MB` (V8, x64) may contain more than 16 million
  small objects and for performance reasons they are accumulated and passed as
  `object[]` further through the chain.

Simple example of usage:

```typescript
import { JSONObjectStream } from 'vladikdb'

const webStream = ReadableStream.from(['[{"id', '": 1}]']) // 2 chunks
const objectStream = webStream.pipeThrough(new JSONObjectStream())

for await (const chunk of objectStream) {
  for (const object of chunk) {
    console.log(object) // { id: 1 }
  }
}
```

## Primary key generation

In node or browser environment:

```typescript
const uuid = crypto.randomUUID()

database.models.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

## Optimization

When working with large amount of data you will face performance issues. This
happens because each call to `write()` serializes data through `JSON.stringify`,
thus even if only one document is changed, the JSON data format forces to
convert all documents to string before writing.

This can be mitigated if accumulating changes and performing `write()`
periodically and on application exit to avoid data loss:

```typescript
const WRITE_INTERVAL = 60 * 1000

const intervalId = setInterval(() => {
  database.write()
}, WRITE_INTERVAL)

// Node (Docker, pm2, ...)
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

By default, database models check for data changes before writing, if there are
no changes, writing does not happen. This means you can call `database.write()`
periodically without worrying about unnecessary data writing.

## Limitations

### Engine limitations

- All JavaScript type and data structure limitations. For example, maximum
  string length, maximum number, maximum array length and so on.

### General limitations

- Only JSON-serializable types and data structures are supported.
- Data is fully loaded and stored in RAM. This allows very fast data work
  without delays, but limits maximum data size to your RAM capacity.
- Maximum size of one document `512MB` (V8, x64). This limitation is imposed by
  maximum string length in JavaScript (may depend on engine).
- Multithreading is not supported. Need to work with database only in one thread
  of the application because each thread stores data independently and data is
  not synchronized between threads. Working with database in multiple threads
  will lead to data desynchronization and data loss on writing.

### Collection model limitations

- Maximum number of documents in collection `2^24 = 16,777,216` (V8, x64). This
  limitation is imposed by JavaScript Map implementation (may depend on engine).

### JSONFile adapter limitations

- Maximum file size is limited only by the file system.

### LocalStorage, SessionStorage adapter limitations

- Maximum storage size is limited by the browser.

## Comparison with lowdb

- lowdb and vladikdb use [steno](https://github.com/typicode/steno) for safe
  atomic file writing (only single-thread).
- vladikdb supports streaming for writing data of unlimited size.
- vladikdb introduces new entity Model that defines stored data structure and
  provides methods for efficient work with this data structure (indexing and so
  on). lowdb does not handle efficient data work, delegating this responsibility
  to the user.
- lowdb provides synchronous and asynchronous adapters and database instances,
  vladikdb provides synchronous and asynchronous adapters, but Model and
  database are always asynchronous.
- Built-in TextFile adapter from vladikdb recursively creates directory if it
  doesn't exist, whereas lowdb's adapter will throw an error.
- Built-in JSONFile adapter from vladikdb allows setting any json space
  (indent), while lowdb space is always 2.
- lowdb adapters are compatible with vladikdb adapters, and vladikdb has the
  same set of built-in adapters as lowdb (except DataFile).
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

It is unsafe to change model data during reading because they may be overwritten
by read data and lost. It is recommended to call this method only once when
starting the application.

#### database.write(force?)

- force? (`boolean = false`) - Forces writing, even if there are no data
  changes.

Calls write() to all models.

#### database.isReading

Type: `boolean`

If adapter of at least one model is reading, will be true, otherwise false.

#### database.isWriting

Type: `boolean`

If adapter of at least one model is writing, will be true, otherwise false.

#### database.hasChanges

Type: `boolean`

If at least one model has changes, will be true, otherwise false.

### Collection

#### new Collection(adapter, primaryKey, options?)

Creates collection instance.

- adapter (`Adapter`) - Any adapter.
- primaryKey (`keyof Document`) - Primary key of document. The specified key
  must contain only primitive data types. The specified key must contain unique
  value among other documents.
- indexedKeys? (`Array<keyof Document>`) - Indexed keys of document. Should not
  contain primaryKey.

#### collection.adapter

Type: `Adapter`

Adapter passed when creating instance.

#### collection.hasChanges

Type: `boolean`

If there are changes for writing will be true.

#### collection.read()

Complexity: `O(n)`

Reads data through collection adapter.

#### collection.write(force?)

Complexity: `O(n)`

- force? (`boolean = false`) - Forces writing, even if there are no data
  changes.

Writes data through collection adapter.

#### collection.clear()

Complexity: `O(1)`

Clears collection from all documents.

#### collection.create(document)

Complexity: `O(1)`

document: `Document`

Creating document.

Throws error if document with such primary key already exists.

#### collection.findByIndex(indexKey, indexValue):

Complexity: `O(1)`

Return: `Document[]`

indexKey: `keyof Document`

indexValue: `Document[keyof Document]`

Searching documents by index.

Throws error if parameter indexKey was not specified in indexedKeys when
creating instance.

#### collection.findByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document | undefined`

primaryKey: `keyof Document`

Searching document by primary key.

#### collection.updateByPrimaryKey(primaryKey, document)

Complexity: `O(1)`

primaryKey: `keyof Document`

document: `Document`

Updating document by primary key.

Throws error if document with primary key primaryKey does not exist.

Throws error when trying to update primary key of document. Instead, delete old
document and create new one.

#### collection.deleteByPrimaryKey(primaryKey)

Complexity: `O(1)`

primaryKey: `keyof Document`

Deleting document(s) by primary key.

Throws error if document with primary key primaryKey does not exist.

#### collection.size()

Complexity: `O(1)`

Returns current size of collection.

### Single

#### new Single(adapter, defaultData)

Creates single instance.

- adapter (`Adapter`) - Any adapter.
- defaultData (`Data`) - Default data.

#### single.adapter

Type: `Adapter`

Adapter passed when creating instance.

#### single.hasChanges

Type: `boolean`

If there are changes for writing will be true.

#### single.read()

Reads data through single adapter.

#### single.write(force?)

- force? (`boolean = false`) - Forces writing, even if there are no data
  changes.

Writes data through single adapter.

#### single.getData()

Return: `Data`

Gets single data.

#### single.setData(data)

data: `Data`

Sets single data.

#### single.reset()

Resets data to defaultData.
