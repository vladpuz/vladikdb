# vladikdb

> Simple JSON database for node and browser

This is an alternative to [lowdb](https://github.com/typicode/lowdb).

If you know JavaScript, you know how to use vladikdb.

Features:

- Simple
- Fast due to indexing
- Works in node and browser
- Safe atomic file writing (single-threaded only)
- Data storage in any format and location (JSON, YAML, HTTP, ...)
- Works with any data structures (Single, Collection, Graph, ...)

## Quick Start

Installation:

```shell
npm install vladikdb
```

Usage:

```typescript
import path from 'node:path'

// import { LocalStorage } from 'vladikdb/browser'
import VladikDB, { Collection } from 'vladikdb'
import { JSONFile } from 'vladikdb/node'

interface Post {
  id: number
  userId: number
  title: string
}

// Node
const databasePostsPath = path.join('database', 'posts.json')
const adapter = new JSONFile<Post[]>(databasePostsPath)

// Browser
// const databasePostsKey = 'posts'
// const adapter = new LocalStorage<Post[]>(databasePostsKey)

const database = new VladikDB({
  posts: new Collection(adapter, 'id', ['userId']),
})

// Init
await database.init()

// Create
database.content.posts.create({
  id: 1,
  userId: 2,
  title: 'vladikdb is awesome',
})

// Read by userId
const post1 = database.content.posts.findByIndexedField('userId', 2)
console.log(post1)

// Read by id
const post2 = database.content.posts.findByPrimaryKey(1)
console.log(post2)

// Update
database.content.posts.updateByPrimaryKey(1, {
  id: 1,
  userId: 2,
  title: 'new title',
})

// Delete
database.content.posts.deleteByPrimaryKey(1)

// Get documents
const posts = database.content.posts.getDocuments()

// Change documents
const changedPosts: Post[] = []

for (const post of posts) {
  changedPosts.push({
    ...post,
    title: 'changed title',
  })
}

// Set documents
database.content.posts.setDocuments(changedPosts)

// Write posts
await database.content.posts.write()
// Write all database
await database.write()
```

## Content Types

The database provides two built-in content types:

- Collection (`object[]`) - a collection of documents designed for fast
  operations with documents by primary keys and fast search by indexed fields.
- Single (`object`) - designed for single objects, such as application
  configuration.

Example usage of Single:

```typescript
import path from 'node:path'

// import { LocalStorage } from 'vladikdb/browser'
import VladikDB, { Single } from 'vladikdb'
import { JSONFile } from 'vladikdb/node'

interface Config {
  apiKey?: string
  loglevel?: string
}

// For node
const databasePath = 'database'
const databaseConfigPath = path.join(databasePath, 'config.json')
const adapter = new JSONFile<Config>(databaseConfigPath)

// For browser
// const databaseConfigKey = 'config'
// const adapter = new LocalStorage<Config>(databaseConfigKey)

const database = new VladikDB({
  config: new Single<Config>(adapter, {}),
})

await database.init()

database.content.config.setData({
  apiKey: '<NEW_API_KEY>',
})

const data = database.content.config.getData()
console.log(data)

await database.write()
```

### Creating Custom Content Type

You can create a new content type for optimal, fast work with any data
structure.

To create a content type, you need to implement the Content interface:

```typescript
interface Content<T> {
  adapter: Adapter<T>
  init: () => Promise<void>
  clear: () => Promise<void>
  read: () => Promise<void>
  write: () => Promise<void>
}
```

As an example, refer to the source code of built-in content types:
https://github.com/vladpuz/vladikdb/tree/main/src/content.

## Adapters

### List of Built-in Adapters

For node:

- TextFile
- JSONFile

For browser:

- WebStorage
- SessionStorage
- LocalStorage

### Creating Custom Adapter

You can create a new adapter for storing data in any format and location, such
as YAML, remote storage, data encryption, etc.

To create an adapter, you need to implement the Adapter interface:

```typescript
interface Adapter<T> {
  read: () => Promise<T | null> | (T | null)
  write: (data: T) => Promise<void> | void
}
```

As an example, refer to the source code of built-in adapters:
https://github.com/vladpuz/vladikdb/tree/main/src/adapters.

## API

### VladikDB

#### new VladikDB(content)

content: `ContentObject`

Creates a database instance for managing content.

#### database.content

Type: `ContentObject`

The content object passed when creating the instance.

#### database.contentArray

Type: `Content[]`

The array of content passed when creating the instance.

#### database.init()

Calls init() to all content.

#### database.clear()

Calls clear() to all content.

#### database.read()

Calls read() to all content.

#### database.write()

Calls write() to all content.

### Collection

#### new Collection(adapter, primaryKeyField, indexedFields?)

Creates a collection instance.

- adapter (`Adapter`) - Any adapter.
- primaryKeyField (`keyof Document`) - The document field used as the primary
  key. The specified field must contain only primitive data types.
- indexedFields? (`(keyof Document)[]`) - Indexed document fields. Should not
  contain primaryKeyField.

#### collection.adapter

Type: `Adapter`

The adapter passed when creating the instance.

#### collection.primaryKeyField

Type: `keyof Document`

The primary key field passed when creating the instance.

#### collection.indexedFields

Type: `(keyof Document)[]`

The indexed fields passed when creating the instance.

#### collection.init()

Complexity: `O(n)`

Initializes the collection.

#### collection.clear()

Complexity: `O(1)`

Clears the collection.

#### collection.read()

Complexity: `O(n)`

Reads data through the collection adapter.

#### collection.write()

Complexity: `O(n)`

Writes data through the collection adapter.

#### collection.getDocuments()

Complexity: `O(1)`

Return: `Document[]`

Gets the collection documents.

#### collection.setDocuments(documents)

Complexity: `O(n)`

documents: `Document[]`

Sets the collection documents.

#### collection.create(document)

Complexity: `O(1)`

document: `Document`

Creates a document.

Throws an error if a document with this primary key already exists.

#### collection.findByIndexedField(field, value):

Complexity: `O(1)`

Return: `Document | undefined`

field: `keyof Document`

value: `Document[keyof Document]`

Searches for a document by indexed field.

Throws an error if the field parameter was not specified in indexedFields when
creating the instance.

#### collection.findByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document | undefined`

primaryKey: `keyof Document`

Searches for a document by primary key.

#### collection.updateByPrimaryKey(primaryKey, document)

Complexity: `O(1)`

primaryKey: `keyof Document`

document: `Document`

Updates a document by primary key.

Throws an error if a document with the primary key primaryKey does not exist.

Throws an error when attempting to update a document's primary key. Instead,
delete the old document and create a new one.

#### collection.deleteByPrimaryKey(primaryKey)

Complexity: `O(1)`

primaryKey: `keyof Document`

Deletes documents by primary key.

Throws an error if a document with the primary key primaryKey does not exist.

### Single

#### new Single(adapter, defaultData)

Creates a single instance.

- adapter (`Adapter`) - Any adapter.
- defaultData (`Data`) - Default data.

#### single.adapter

Type: `Adapter`

The adapter passed when creating the instance.

#### single.defaultData

Type: `Data`

The default data passed when creating the instance.

#### single.init()

Initializes the single.

#### single.clear()

Clears the single.

#### single.read()

Reads data through the single adapter.

#### single.write()

Writes data through the single adapter.

#### single.getData()

Return: `Data`

Gets the single data.

#### single.setData(data)

data: `Data`

Sets the single data.

## Primary Key Generation

In node environment:

```typescript
import crypto from 'node:crypto'

const uuid = crypto.randomUUID()

database.content.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

In browser environment:

```typescript
const uuid = crypto.randomUUID()

database.content.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

## Optimization

When working with large amounts of data, you may encounter performance issues.
This happens because each call to `write()` serializes data through
`JSON.stringify`, so even if only one document is changed, the JSON format must
convert all documents to a string before writing.

This can be mitigated by accumulating changes and performing `write()` at
intervals and before exiting the application to avoid data loss:

```typescript
const WRITE_INTERVAL = 60_000

const intervalId = setInterval(() => {
  database.write()
}, WRITE_INTERVAL)

// For node (Docker, pm2, ...)
process.on('SIGINT', () => {
  clearInterval(intervalId)
  database.write()
})

// For browser
window.addEventListener('beforeunload', () => {
  clearInterval(intervalId)
  database.write()
})
```

Collections check for changes before writing. If there are no changes, writing
does not occur. This means you can call `database.write()` at intervals without
worrying about unnecessary writes to collections.

## Comparison with lowdb

- Both lowdb and vladikdb use [steno](https://github.com/typicode/steno) for
  safe atomic file writing (single-threaded only).
- vladikdb introduces a new entity Content that defines the structure of stored
  data and provides methods for efficient work with this data structure
  (indexing, etc.). lowdb does not handle efficient data operations, delegating
  this responsibility to the user.
- lowdb provides both synchronous and asynchronous adapters and database
  instances, while vladikdb provides synchronous and asynchronous adapters, but
  Content is always asynchronous.
- The built-in TextFile adapter in vladikdb recursively creates the directory if
  it does not exist, whereas in lowdb this adapter would throw an error.
- lowdb adapters are compatible with vladikdb adapters, and vladikdb has the
  same set of built-in adapters as lowdb, except for the DataFile adapter which
  was removed because it seems unnecessary.
