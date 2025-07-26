# vladikdb

> Simple JSON database for node and browser

Это альтернатива [lowdb](https://github.com/typicode/lowdb).

Если вы знаете JavaScript, вы знаете, как использовать vladikdb.

Особенности:

- Простая
- Быстрая за счет индексации
- Работает в node и браузере
- Безопасная атомарная запись файлов (только однопоток)
- Хранение данных в любом формате и месте (JSON, YAML, HTTP, ...)
- Работа с любыми структурами данных (Single, Collection, Graph, ...)

## Быстрый старт

Установка:

```shell
npm install vladikdb
```

Использование:

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

## Типы контента

База данных предоставляет два встроенных типа контента:

- Collection (`object[]`) - коллекция документов предназначенная для быстрой
  работы с документами по первичным ключам и быстрого поиска по индексированным
  полям.
- Single (`object`) - предназначен для одиночных объектов, например конфигурация
  приложения.

Пример использования Single:

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

### Создание собственного типа контента

Вы можете создать новый тип контента для оптимальной, быстрой работы с любой
структурой данных.

Для создания типа контента вам нужно реализовать интерфейс Content:

```typescript
interface Content<T> {
  adapter: Adapter<T>
  init: () => Promise<void>
  clear: () => Promise<void>
  read: () => Promise<void>
  write: () => Promise<void>
}
```

В качестве примера обратитесь к исходному коду встроенных типов контента:
https://github.com/vladpuz/vladikdb/tree/main/src/content.

## Адаптеры

### Список встроенных адаптеров

Для node:

- TextFile
- JSONFile

Для браузера:

- WebStorage
- SessionStorage
- LocalStorage

### Создание собственного адаптера

Вы можете создать новый адаптер для хранения данных в любом формате и месте,
например YAML, удаленное хранилище, шифрование данных и тд.

Для создания адаптера вам нужно реализовать интерфейс Adapter:

```typescript
interface Adapter<T> {
  read: () => Promise<T | null> | (T | null)
  write: (data: T) => Promise<void> | void
}
```

В качестве примера обратитесь к исходному коду встроенных адаптеров:
https://github.com/vladpuz/vladikdb/tree/main/src/adapters.

## API

### VladikDB

#### new VladikDB(content)

content: `ContentObject`

Создает экземпляр базы данных для управления контентом.

#### database.content

Type: `ContentObject`

Объект контента переданный при создании экземпляра.

#### database.contentArray

Type: `Content[]`

Массив контента переданного при создании экземпляра.

#### database.init()

Вызывает init() всему контенту.

#### database.clear()

Вызывает clear() всему контенту.

#### database.read()

Вызывает read() всему контенту.

#### database.write()

Вызывает write() всему контенту.

### Collection

#### new Collection(adapter, primaryKeyField, indexedFields?)

Создает экземпляр коллекции.

- adapter (`Adapter`) - Любой адаптер.
- primaryKeyField (`keyof Document`) - Поле документа используемое в качестве
  первичного ключа. Указанное поле должно содержать только примитивные типы
  данных.
- indexedFields? (`(keyof Document)[]`) - Индексируемые поля документа. Не
  должен содержать primaryKeyField.

#### collection.adapter

Type: `Adapter`

Адаптер переданный при создании экземпляра.

#### collection.primaryKeyField

Type: `keyof Document`

Поле первичного ключа переданное при создании экземпляра.

#### collection.indexedFields

Type: `(keyof Document)[]`

Индексируемые поля переданные при создании экземпляра.

#### collection.init()

Complexity: `O(n)`

Инициализирует коллекцию.

#### collection.clear()

Complexity: `O(1)`

Очищает коллекцию.

#### collection.read()

Complexity: `O(n)`

Читает данные через адаптер коллекции.

#### collection.write()

Complexity: `O(n)`

Записывает данные через адаптер коллекции.

#### collection.getDocuments()

Complexity: `O(1)`

Return: `Document[]`

Получает документы коллекции.

#### collection.setDocuments(documents)

Complexity: `O(n)`

documents: `Document[]`

Устанавливает документы коллекции.

#### collection.create(document)

Complexity: `O(1)`

document: `Document`

Создание документа.

Выдает ошибку если документ с таким первичным ключом уже существует.

#### collection.findByIndexedField(field, value):

Complexity: `O(1)`

Return: `Document | undefined`

field: `keyof Document`

value: `Document[keyof Document]`

Поиск документа по индексируемому полю.

Выдает ошибку если параметр field не был указан в indexedFields при создании
экземпляра.

#### collection.findByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document | undefined`

primaryKey: `keyof Document`

Поиск документа по первичному ключу.

#### collection.updateByPrimaryKey(primaryKey, document)

Complexity: `O(1)`

primaryKey: `keyof Document`

document: `Document`

Обновление документа по первичному ключу.

Выдает ошибку если документа с первичным ключом primaryKey не существует.

Выдает ошибку при попытке обновления первичного ключа документа. Вместо этого
удалите старый документ и создайте новый.

#### collection.deleteByPrimaryKey(primaryKey)

Complexity: `O(1)`

primaryKey: `keyof Document`

Удаление документа(ов) по первичному ключу.

Выдает ошибку если документа с первичным ключом primaryKey не существует.

### Single

#### new Single(adapter, defaultData)

Создает экземпляр сингла.

- adapter (`Adapter`) - Любой адаптер.
- defaultData (`Data`) - Данные по умолчанию.

#### single.adapter

Type: `Adapter`

Адаптер переданный при создании экземпляра.

#### single.defaultData

Type: `Data`

Данные по умолчанию переданные при создании экземпляра.

#### single.init()

Инициализирует сингл.

#### single.clear()

Очищает сингл.

#### single.read()

Читает данные через адаптер сингла.

#### single.write()

Записывает данные через адаптер сингла.

#### single.getData()

Return: `Data`

Получает данные сингла.

#### single.setData(data)

data: `Data`

Устанавливает данные сингла.

## Генерация первичных ключей

В среде node:

```typescript
import crypto from 'node:crypto'

const uuid = crypto.randomUUID()

database.content.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

В среде браузера:

```typescript
const uuid = crypto.randomUUID()

database.content.posts.create({
  id: uuid,
  title: 'vladikdb is awesome',
})
```

## Оптимизация

При работе с большим количеством данных вы столкнетесь с проблемами
производительности. Это происходит потому, что каждый вызов `write()`
сериализует данные через `JSON.stringify`, таким образом даже при изменении
всего одного документа, формат данных JSON вынужден преобразовать все документы
в строку перед записью.

Это можно смягчить если накапливать изменения и выполнять `write()` по интервалу
и перед выходом из приложения, чтобы избежать потери данных:

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

Коллекции перед записью проверяют есть ли изменения, если изменений нет, тогда
записи не происходит. Это означает что можно вызывать `database.write()` по
интервалу не беспокоясь о лишней записи в коллекциях.

## Сравнение с lowdb

- lowdb и vladikdb используют [steno](https://github.com/typicode/steno) для
  безопасной атомарной записи файлов (только однопоток).
- vladikdb вводит новую сущность Content, которая определяет структуру хранимых
  данных и предоставляет методы для производительной работы с этой структурой
  данных (индексация и тд). lowdb не отвечает за производительную работу с
  данными перекладывая эту ответственность на пользователя.
- lowdb предоставляет синхронные и асинхронные адаптеры и экземпляры бд,
  vladikdb предоставляет синхронные и асинхронные адаптеры, но Content всегда
  асинхронный.
- Встроенный адаптер TextFile из vladikdb рекурсивно создает директорию если ее
  не существует, тогда как в lowdb этот адаптер выдаст ошибку.
- Адаптеры lowdb совместимы с адаптерами vladikdb, а так же vladikdb имеет тот
  же набор встроенных адаптеров как lowdb, кроме адаптера DataFile который был
  удален потому, что кажется ненужным.
