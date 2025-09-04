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
- Works with any data structures (Collection, Single, Graph, ...)

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

// Read
await database.read()

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
const newPosts = [...posts].map((post) => {
  return {
    ...post,
    title: 'changed title',
  }
})

// Set documents
database.content.posts.setDocuments(newPosts)

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

Example of using Single:

```typescript
import path from 'node:path'

// import { LocalStorage } from 'vladikdb/browser'
import VladikDB, { Single } from 'vladikdb'
import { JSONFile } from 'vladikdb/node'

interface Config {
  apiKey?: string
  loglevel?: string
}

// Node
const databasePath = 'database'
const databaseConfigPath = path.join(databasePath, 'config.json')
const adapter = new JSONFile<Config>(databaseConfigPath)

// Browser
// const databaseConfigKey = 'config'
// const adapter = new LocalStorage<Config>(databaseConfigKey)

const database = new VladikDB({
  config: new Single<Config>(adapter, {}),
})

await database.read()

database.content.config.setData({
  apiKey: '<NEW_API_KEY>',
})

const data = database.content.config.getData()
console.log(data)

await database.write()
```

### Creating a Custom Content Type

You can create a new content type for optimal, fast operations with any data
structure.

To create a content type, you need to implement the Content interface:

```typescript
interface Content<T> {
  adapter: Adapter<T>
  read: () => Promise<void>
  write: (force?: boolean) => Promise<void>
}
```

As an example, refer to the source code of built-in content types:
https://github.com/vladpuz/vladikdb/tree/main/src/content.

## Adapters

### List of Built-in Adapters

For node:

- TextFile
- DataFile
- JSONFile

For browser:

- WebStorage
- SessionStorage
- LocalStorage

For any environment:

- Memory

### Creating a Custom Adapter

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

## Primary Key Generation

In the node environment:

```typescript
import crypto from 'node:crypto'

const uuid = crypto.randomUUID()

database.content.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

In the browser environment:

```typescript
const uuid = crypto.randomUUID()

database.content.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

## Optimization

When working with a large amount of data, you will face performance issues. This
happens because each call to `write()` serializes data through `JSON.stringify`,
thus even if only one document is changed, the JSON format must convert all
documents to a string before writing.

This can be mitigated by accumulating changes and performing `write()` at
intervals and before exiting the application to avoid data loss:

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

By default, the database content checks for changes before writing. If there are
no changes, the write operation does not occur. This means you can call
`database.write()` at intervals without worrying about unnecessary data writes.

## Comparison with lowdb

- lowdb and vladikdb use [steno](https://github.com/typicode/steno) for safe
  atomic file writing (single-threaded only).
- vladikdb introduces a new entity Content, which defines the structure of
  stored data and provides methods for efficient work with this data structure
  (indexing, etc.). lowdb does not handle efficient data operations, delegating
  this responsibility to the user.
- lowdb provides both synchronous and asynchronous adapters and database
  instances, while vladikdb provides both synchronous and asynchronous adapters,
  but Content and the database are always asynchronous.
- The built-in TextFile adapter from vladikdb recursively creates the directory
  if it does not exist, whereas the lowdb adapter will throw an error.
- The built-in JSONFile adapter from vladikdb allows setting any JSON space
  (indent), while lowdb always uses space 2.
- lowdb adapters are compatible with vladikdb adapters, and vladikdb has the
  same set of built-in adapters as lowdb.

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

#### database.read()

Calls read() for all content.

#### database.write(force?)

- force? (`boolean = false`) - Forces writing even if there are no data changes.

Calls write() for all content.

### Collection

#### new Collection(adapter, primaryKeyField, indexedFields?)

Creates a collection instance.

- adapter (`Adapter`) - Any adapter.
- primaryKeyField (`keyof Document`) - The field of the document used as the
  primary key. The specified field must contain only primitive data types.
- indexedFields? (`(keyof Document)[]`) - Indexed fields of the document. Should
  not include primaryKeyField.

#### collection.adapter

Type: `Adapter`

The adapter passed when creating the instance.

#### collection.primaryKeyField

Type: `keyof Document`

The primary key field passed when creating the instance.

#### collection.indexedFields

Type: `(keyof Document)[]`

The indexed fields passed when creating the instance.

#### collection.read()

Complexity: `O(n)`

Reads data through the collection adapter.

#### collection.write(force?)

Complexity: `O(n)`

- force? (`boolean = false`) - Forces writing even if there are no data changes.

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

Throws an error if a document with the same primary key already exists.

#### collection.findByIndexedField(field, value):

Complexity: `O(1)`

Return: `Document | undefined`

field: `keyof Document`

value: `Document[keyof Document]`

Searches for a document by an indexed field.

Throws an error if the parameter field was not specified in indexedFields when
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

Throws an error when attempting to update the document's primary key. Instead,
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

#### single.read()

Reads data through the single adapter.

#### single.write(force?)

- force? (`boolean = false`) - Forces writing even if there are no data changes.

Writes data through the single adapter.

#### single.getData()

Return: `Data`

Gets the single data.

#### single.setData(data)

data: `Data`

Sets the single data.
