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

// For node
const databasePath = 'database'
const databasePostsPath = path.join(databasePath, 'posts.json')
const adapter = new JSONFile<Post[]>(databasePostsPath)

// For browser
// const databasePostsKey = 'posts'
// const adapter = new LocalStorage<Post[]>(databasePostsKey)

const database = new VladikDB({
  posts: new Collection<Post>(adapter, 'id', ['userId']),
})

// Init O(n)
await database.init()

// Create O(1)
database.content.posts.create({
  id: 1,
  userId: 2,
  title: 'vladikdb is awesome',
})

// Read by userId O(1)
const post1 = database.content.posts.findByIndexedField('userId', 2)
console.log(post1)

// Read by id O(1)
const post2 = database.content.posts.findByPrimaryKey(1)
console.log(post2)

// Update O(1)
database.content.posts.updateByPrimaryKey(1, {
  id: 1,
  userId: 2,
  title: 'new title',
})

// Delete O(n)
database.content.posts.deleteByPrimaryKey(1)
// or
database.content.posts.deleteByPrimaryKey([1, 2, 3])

// Get documents O(1)
const posts = database.content.posts.getDocuments()

// Change documents O(n)
const newDocuments = posts.map((post) => {
  return { ...post, title: 'changed title' }
})

// Set documents O(n)
database.content.posts.setDocuments(newDocuments)

// Write O(n)
await database.content.posts.write()
// or
await database.write()
```

## Content Types

The database provides two built-in content types:

- Collection (object[]) - a collection of documents designed for fast work with
  documents by primary keys and fast search by indexed fields.
- Single (object) - designed for single objects, such as application
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

### Creating a Custom Content Type

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

## API

### VladikDB

#### new VladikDB(content: ContentObject)

Creates a database instance for managing content.

#### database.content - ContentObject

The content object passed when creating the instance.

#### database.contentArray - Content[]

The array of content passed when creating the instance.

#### database.init()

Calls init() for all content.

#### database.clear()

Calls clear() for all content.

#### database.read()

Calls read() for all content.

#### database.write()

Calls write() for all content.

### Collection

#### new Collection(adapter: Adapter, primaryKeyField: string, indexedFields?: string[])

Creates a collection instance.

- adapter - Any adapter.
- primaryKeyField - The field of the document used as the primary key. The
  specified field must contain only primitive data types.
- indexedFields (optional) - Indexed fields of the document. Should not contain
  primaryKeyField.

#### collection.adapter - Adapter

The adapter passed when creating the instance.

#### collection.primaryKeyField - string

The primary key field passed when creating the instance.

#### collection.indexedFields - string[]

The indexed fields passed when creating the instance.

#### collection.init()

Initializes the collection.

#### collection.clear()

Clears the collection.

#### collection.read()

Reads data through the collection adapter.

#### collection.write()

Writes data through the collection adapter.

#### collection.getDocuments(): Document[]

Gets the array of documents in the collection.

#### collection.setDocuments(documents: Document[]): void

Sets the array of documents in the collection.

#### collection.create(document: Document): void

Creates a document.

Throws an error if a document with the same primary key already exists.

#### collection.findByIndexedField(field, value): Document | undefined

Searches for a document by an indexed field.

Throws an error if the parameter field was not specified in indexedFields when
creating the instance.

#### collection.findByPrimaryKey(primaryKey: string): Document | undefined

Searches for a document by primary key.

#### collection.updateByPrimaryKey(primaryKey: string, document: Document): void

Updates a document by primary key.

Throws an error if a document with the primary key primaryKey does not exist.

Throws an error when attempting to update the primary key of a document.
Instead, delete the old document and create a new one.

#### collection.deleteByPrimaryKey(primaryKey: string | string[]): void

Deletes a document(s) by primary key.

### Single

#### new Single(adapter: Adapter, defaultData: Data)

Creates a single instance.

- adapter - Any adapter.
- defaultData - Default data.

#### single.adapter - Adapter

The adapter passed when creating the instance.

#### single.defaultData - Data

The default data passed when creating the instance.

#### single.init()

Initializes the single.

#### single.clear()

Clears the single.

#### single.read()

Reads data through the single adapter.

#### single.write()

Writes data through the single adapter.

#### single.getData(): Data

Gets the single's data.

#### single.setData(data: Data): void

Sets the single's data.

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

When working with a large amount of data, you may encounter performance issues.
This happens because each call to `write()` serializes data through
`JSON.stringify`, so even if only one document is changed, the entire array must
be converted to a string before writing.

This can be mitigated by batching changes and performing `write()` at intervals
and before exiting the application to avoid data loss:

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

Collections check for changes before writing. If no changes exist, writing does
not occur. This means you can call `database.write()` at intervals without
worrying about unnecessary writes to collections.

## Comparison with lowdb

- lowdb and vladikdb both use [steno](https://github.com/typicode/steno) for
  safe atomic file writing (single-threaded only).
- vladikdb introduces a new entity Content, which defines the structure of
  stored data and provides methods for efficient work with this data structure
  (indexing, etc). lowdb does not handle efficient data operations, delegating
  this responsibility to the user.
- lowdb provides both synchronous and asynchronous adapters and database
  instances, vladikdb provides synchronous and asynchronous adapters, but
  Content is always asynchronous.
- The built-in TextFile adapter in vladikdb recursively creates the directory if
  it does not exist, whereas the lowdb adapter would throw an error.
- lowdb adapters are compatible with vladikdb adapters, and vladikdb has the
  same set of built-in adapters as lowdb, except for the DataFile adapter, which
  was removed as it seems unnecessary.
