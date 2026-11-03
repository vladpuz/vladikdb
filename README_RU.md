# vladikdb

> Simple and very fast JSON database for Node.js and browser

Особенности:

- Простая установка через npm, не нужно ничего дополнительно скачивать
- Минималистичный API, только нужные методы и ничего лишнего
- Хеш-индексация первичных ключей и других полей при необходимости
- Мгновенный доступ и работа с данными через ОЗУ
- Возможность хранить данные в любом формате и месте (если создать
  пользовательский адаптер), встроенные адаптеры: JSONFile, LocalStorage,
  SessionStorage, Memory
- Возможность работать с моделями для разных структур данных (если создать
  пользовательскую модель), встроенные модели: Collection, Single
- Стриминг для чтения/записи больших данных
- Безопасная атомарная запись файлов в Node.js
- Вдохновлена [lowdb](https://github.com/typicode/lowdb), vladikdb это более
  завершенное решение для высокопроизводительной работы с данными

## Быстрый старт

Установка:

```shell
npm install vladikdb
```

Создание экземпляра базы данных:

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

Инициализация (чтение) базы данных:

```typescript
await database.read()
```

> [!IMPORTANT]  
> Необходимо инициализировать базу данных при запуске приложения, чтобы
> существующие данные были загружены в память.

> [!WARNING]  
> Не изменяйте данные во время чтения, это может привести к потере изменений
> потому, что ваши изменения будут перезаписаны прочитанными данными.

Сохранение (запись) базы данных:

```typescript
await database.write()
```

> [!NOTE]  
> Если изменений нет, тогда запись не будет производиться. Это проверяется
> автоматически на уровне модели, чтобы избежать избыточной работы. Проверка
> выполняется быстро без перебора всех документов, полагаясь на определение того
> были ли ранее вызваны методы изменения данных.

Создание документа:

```typescript
database.models.posts.create({
  id: 1,
  userId: 5,
  title: 'vladikdb is awesome',
  body: 'body',
})
```

Поиск документа по первичному ключу:

```typescript
const post = database.models.posts.findByPrimaryKey(1)
console.log(post) // {id: 1, userId: 5, title: 'vladikdb is awesome', body: 'body'}
```

Обновление документа:

```typescript
database.models.posts.updateByPrimaryKey(1, (post) => {
  post.title = 'new title'
})
```

> [!NOTE]  
> Первичные ключи нельзя изменять, попытки изменения игнорируются. Вместо этого
> удалите старый документ и создайте новый.

> [!WARNING]  
> Никогда не мутируйте документы за пределами колбека мутатора метода
> `.updateByPrimaryKey`, это приведет к некорректной работе коллекции.

> [!WARNING]  
> Колбек мутатор должен быть синхронной функцией, асинхронная функция или
> `.then` внутри синхронной функции могут привести к некорректной работе
> коллекции.

Удаление документа:

```typescript
database.models.posts.deleteByPrimaryKey(1)
```

Очистка коллекции:

```typescript
database.models.posts.clear()
```

Итерация по документам:

```typescript
// This is an iterable object, not an array! Use a for..of loop to iterate.
for (const post of database.models.posts) {
  database.models.posts.updateByPrimaryKey(post.id, (post) => {
    post.title = 'changed title'
  })
}
```

> [!TIP]  
> Если вы выполняете запросы на получение выборки определенных документов через
> итерацию, кешируйте результат выборки или используйте индексы вместо этого
> потому, что итерация всех документов занимает много времени - `O(n)`.

Индексация и поиск документов по индексу:

Сначала необходимо добавить индекс для поля по которому будем искать.

```diff
const database = new Vladikdb({
-  posts: new Collection(postsAdapter, 'id'),
+  posts: new Collection(postsAdapter, 'id', ['userId']),
})
```

Затем выполняем поиск документов по индексу.

```typescript
const posts = database.models.posts.findByIndex('userId', 5)
console.log(posts) // Set(1) {{…}}
```

В результате получаем множество всех найденных документов.

> [!NOTE]  
> Индексация нужна для быстрого поиска документов по определенному полю. Вместо
> итерации по документам для выборки некоторых из них можно использовать индексы
> для поиска, это намного быстрее - `O(1) vs O(n)`.

> [!WARNING]  
> Не добавляйте индексы для всех полей коллекции если в этом нет необходимости.
> Индексация каждого дополнительного поля незначительно замедляет операции
> создания, обновления, удаления документов.

### JSONFile опции

Обзор:

```typescript
interface JSONFileOptions {
  mode?: 'stream' | 'auto' // Default: 'auto'
  space?: number // Default: 0
}
```

### mode

Type: `'stream' | 'auto'`

Default: `'auto'`

Устанавливает режим чтения и записи файла:

- `'auto'` (Default) - читает/записывает файл целиком, но в случае возникновения
  ошибки RangeError (если файл очень большой), читает/записывает через стриминг.
  Рекомендуется если вы уверены в том, что файл не будет превышать максимальный
  размер строки вашего движка, или вы пока не знаете сколько он будет весить.
  Максимальная длина строки `512MB` (V8, x64), зависит от движка.
- `'stream'` - читает/записывает файл через стриминг. Рекомендуется если вы
  уверены в том, что файл будет превышать максимальный размер строки вашего
  движка. Установка этого значения повысит производительность в этом случае
  потому, что попытка чтения/записи целого файла производится не будет.

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

Передается третьим параметром в `JSON.stringify(value, replacer?, space?)`.
Добавляет отступы и переносы строк в файл, это занимает дополнительную память,
поэтому по умолчанию 0.

```typescript
import { JSONFile } from 'vladikdb/node'

// For all JSONFile instances (can override)
JSONFile.defaultOptions.space = 2

const adapter = new JSONFile<Post[]>('PATH', {
  space: 2, // For example 2
})
```

## Модели

База данных предоставляет две встроенных модели:

- Collection (`object[]`) - коллекция документов предназначенная для быстрой
  работы с документами по первичным ключам и быстрого поиска по индексам.
- Single (`object`) - предназначен для одиночных объектов, например конфигурация
  приложения.

Пример использования Single:

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
> Никогда не мутируйте данные за пределами колбека мутатора метода `.update`,
> это приведет к некорректной работе сингла.

> [!WARNING]  
> Колбек мутатор должен быть синхронной функцией, асинхронная функция или
> `.then` внутри синхронной функции могут привести к некорректной работе сингла.

### Создание пользовательской модели

Вы можете создать новую модель для оптимальной, быстрой работы с любой
структурой данных.

Для создания модели вам нужно реализовать интерфейс Model:

```typescript
interface Model<T> {
  readonly adapter: Adapter<T>
  readonly hasChanges: boolean
  read: () => Promise<void>
  write: (force?: boolean) => Promise<void>
}
```

В качестве примера обратитесь к исходному коду встроенных моделей:
https://github.com/vladpuz/vladikdb/tree/main/src/models.

## Адаптеры

### Список встроенных адаптеров

Для Node.js:

- TextFile
- JSONFile

Для браузера:

- WebStorage
- SessionStorage
- LocalStorage

Для любой среды:

- Memory

### Создание пользовательского адаптера

Вы можете создать адаптер для хранения данных в любом формате и месте, например
YAML, удаленное хранилище, шифрование данных и тд.

Для создания адаптера вам нужно реализовать интерфейс Adapter:

```typescript
interface Adapter<T> {
  readonly isReading: boolean
  readonly isWriting: boolean
  read: () => Promise<ReadableData<T>> | ReadableData<T>
  write: (data: WritableData<T>) => Promise<void> | void
}
```

В качестве примера обратитесь к исходному коду встроенных адаптеров:
https://github.com/vladpuz/vladikdb/tree/main/src/adapters.

#### JSONParserStream

Чтобы ваш адаптер мог работать с большим количеством данным превышающим
максимальную длину строки в JavaScript `512MB` (V8, x64), нужно использовать
стриминг.

Рекомендуется использовать встроенный высокопроизводительный трансформирующий
стрим JSONParserStream, который так же используется во встроенном адаптере
JSONFile. Обратитесь к исходному коду адаптера JSONFile для примера
использования:
https://github.com/vladpuz/vladikdb/blob/main/src/adapters/node/JSONFile.ts.

Рекомендуется предоставлять способ выбора режима работы адаптера потому, что
стриминг работает немного медленнее чем обработка данных целиком. Стриминг нужен
только если общий размер данных превышает `512MB` (V8, x64) потому, что это
максимальный размер строки в JavaScript и в таком случае невозможно
прочитать/записать данные целиком через JSON. Например, встроенный адаптер
JSONFile предоставляет опцию `mode?: 'stream' | 'auto'`.

Особенности JSONParserStream:

- Поддерживает трансформацию строк содержащих `object` или `object[]`
- Поддерживает строковые чанки максимального размера `512MB` (V8, x64)
- Может работать в Node.js и браузере потому, что является веб стримом
- Парсит через нативный `JSON.parse()`. Он итерирует строку, через стек
  определяет начало и конец каждого объекта, затем получает подстроку и передает
  её в `JSON.parse()`.
- Передает по цепочке чанки типа `object[]` потому, что передача каждого объекта
  по отдельности работает очень медленно для большого количества маленьких
  объектов. Например, 1 строковый чанк большого размера `512MB` (V8, x64) может
  содержать более 16 миллионов маленьких объектов и в целях производительности
  они накапливаются и передаются как `object[]` дальше по цепочке.

Простой пример использования:

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

## Генерация первичных ключей

В среде Node.js или браузера:

```typescript
const uuid = crypto.randomUUID()

database.models.posts.create({
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

По умолчанию модели базы данных перед записью проверяют есть ли изменения
данных, если изменений нет, тогда записи не происходит. Это означает что можно
вызывать `database.write()` по интервалу не беспокоясь о лишней записи данных.

## Ограничения

### Ограничения движка

- Все ограничения JavaScript на типы и структуры данных. Например, максимальная
  длина строки, максимальное число, максимальная длина массива и тд.

### Общие ограничения

- Поддерживаются только JSON-сериализуемые типы и структуры данных.
- Данные полностью загружаются и хранятся в ОЗУ. Это позволяет очень быстро
  работать с данными без задержек, но ограничивает максимальный размер данных
  объемом вашего ОЗУ.
- Максимальный размер одного документа `512MB` (V8, x64). Это ограничение
  накладывает максимальная длина строки в JavaScript (может зависеть от движка).
- Многопоточность не поддерживается. Необходимо работать с базой данных только в
  одном из потоков приложения потому, что каждый поток хранит данные независимо
  и данные не синхронизируются между потоками. Работа с базой данных в
  нескольких потоках приведет к рассинхронизации данных и потере данных при
  записи.

### Ограничения модели Collection

- Максимальное количество документов в коллекции `2^24 = 16,777,216` (V8, x64).
  Это ограничение накладывает реализация Map в JavaScript (может зависеть от
  движка).

### Ограничения адаптера JSONFile

- Максимальный размер файла ограничивается только файловой системой.

### Ограничения адаптеров LocalStorage, SessionStorage

- Максимальный размер хранилища ограничивается браузером.

## Сравнение с lowdb

- lowdb и vladikdb используют [steno](https://github.com/typicode/steno) для
  безопасной атомарной записи файлов (только однопоток).
- vladikdb поддерживает стриминг для записи данных неограниченного размера.
- vladikdb вводит новую сущность Model, которая определяет структуру хранимых
  данных и предоставляет методы для производительной работы с этой структурой
  данных (индексация и тд). lowdb не отвечает за производительную работу с
  данными перекладывая эту ответственность на пользователя.
- lowdb предоставляет синхронные и асинхронные адаптеры и экземпляры бд,
  vladikdb предоставляет синхронные и асинхронные адаптеры, но Model и бд всегда
  асинхронные.
- Встроенный адаптер TextFile из vladikdb рекурсивно создает директорию если ее
  не существует, тогда как в lowdb этот адаптер выдаст ошибку.
- Встроенный адаптер JSONFile из vladikdb позволяет установить любой json space
  (indent), в lowdb space всегда 2.
- Адаптеры lowdb совместимы с адаптерами vladikdb, а так же vladikdb имеет тот
  же набор встроенных адаптеров как lowdb (кроме DataFile).
- Адаптер DataFile был удален.

## API

### Vladikdb

#### new Vladikdb(models)

models: `Record<string, Model<any>>`

Создает экземпляр базы данных для управления моделями.

#### database.models

Type: `Record<string, Model<any>>`

Объект моделей переданный при создании экземпляра.

#### database.modelsArray

Type: `Array<Model<unknown>>`

Массив моделей переданных при создании экземпляра.

#### database.read()

Вызывает read() всем моделям.

Во время чтения небезопасно изменять данные моделей потому, что они могут быть
перезаписаны прочитанными данными и будут потеряны. Рекомендуется вызывать этот
метод только один раз при запуске приложения.

#### database.write(force?)

- force? (`boolean = false`) - Заставляет произвести запись, даже если изменений
  данных нет.

Вызывает write() всем моделям.

#### database.isReading

Type: `boolean`

Если адаптер хотя бы одной модели читает, будет true, иначе false.

#### database.isWriting

Type: `boolean`

Если адаптер хотя бы одной модели пишет, будет true, иначе false.

#### database.hasChanges

Type: `boolean`

Если хотя бы одна модель имеет изменения, будет true, иначе false.

### Collection

#### new Collection(adapter, primaryKey, options?)

Создает экземпляр коллекции.

- adapter (`Adapter`) - Любой адаптер.
- primaryKey (`keyof Document`) - Первичный ключ документа. Указанный ключ
  должен содержать только примитивные типы данных. Указанный ключ должен
  содержать уникальное значение среди других документов.
- indexedKeys? (`Array<keyof Document>`) - Индексируемые ключи документа. Не
  должны содержать primaryKey.

#### collection.adapter

Type: `Adapter`

Адаптер переданный при создании экземпляра.

#### collection.hasChanges

Type: `boolean`

Если есть изменения для записи будет true.

#### collection.read()

Complexity: `O(n)`

Читает данные через адаптер коллекции.

#### collection.write(force?)

Complexity: `O(n)`

- force? (`boolean = false`) - Заставляет произвести запись, даже если изменений
  данных нет.

Записывает данные через адаптер коллекции.

#### collection.clear()

Complexity: `O(1)`

Очищает коллекцию от всех документов.

#### collection.create(document)

Complexity: `O(1)`

document: `Document`

Создание документа.

Выдает ошибку если документ с таким первичным ключом уже существует.

#### collection.findByIndex(indexKey, indexValue)

Complexity: `O(1)`

Return: `Set<Document>`

indexKey: `keyof Document`

indexValue: `Document[keyof Document]`

Поиск документов по индексу.

Выдает ошибку если параметр indexKey не был указан в indexedKeys при создании
экземпляра.

#### collection.findByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document | undefined`

primaryKey: `keyof Document`

Поиск документа по первичному ключу.

#### collection.updateByPrimaryKey(primaryKey, mutator)

Complexity: `O(1)`

Return: `Document`

primaryKey: `keyof Document`

mutator: `(document: Document) => void`

Обновление документа по первичному ключу.

Выдает ошибку если документа с первичным ключом primaryKey не существует.

Изменение первичного ключа документа через колбек мутатор игнорируется (поле
восстанавливает исходное значение). Если нужно изменить первичный ключ, удалите
старый документ и создайте новый.

Никогда не мутируйте документы за пределами колбека мутатора метода
`.updateByPrimaryKey`, это приведет к некорректной работе коллекции (потери
данных и утечки памяти).

Колбек мутатор должен быть синхронной функцией, асинхронная функция или `.then`
внутри синхронной функции могут привести к некорректной работе коллекции (утечки
памяти).

#### collection.deleteByPrimaryKey(primaryKey)

Complexity: `O(1)`

Return: `Document`

primaryKey: `keyof Document`

Удаление документа по первичному ключу.

Выдает ошибку если документа с первичным ключом primaryKey не существует.

#### collection.size()

Complexity: `O(1)`

Выдает текущий размер коллекции.

### Single

#### new Single(adapter, defaultData)

Создает экземпляр сингла.

- adapter (`Adapter`) - Любой адаптер.
- defaultData (`Data`) - Данные по умолчанию.

#### single.data

Type: `Data`

Данные сингла.

#### single.adapter

Type: `Adapter`

Адаптер переданный при создании экземпляра.

#### single.hasChanges

Type: `boolean`

Если есть изменения для записи будет true.

#### single.read()

Читает данные через адаптер сингла.

#### single.write(force?)

- force? (`boolean = false`) - Заставляет произвести запись, даже если изменений
  данных нет.

Записывает данные через адаптер сингла.

#### single.update(mutator)

mutator: `(data: Data) => void`

Обновляет данные сингла.

Никогда не мутируйте данные за пределами колбека мутатора метода `.update`, это
приведет к некорректной работе сингла (потери данных).

Колбек мутатор должен быть синхронной функцией, асинхронная функция или `.then`
внутри синхронной функции могут привести к некорректной работе сингла (потери
данных).

#### single.reset()

Сбрасывает данные на defaultData.
