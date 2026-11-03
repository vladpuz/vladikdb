import type { Adapter, Model } from '../core/Vladikdb.ts'

export class Collection<
  Document extends object,
  PrimaryKey extends keyof Document,
> implements Model<Document[]> {
  #adapter: Adapter<Document[]>
  #primaryKey: PrimaryKey
  #hasChanges = false

  #documentsMap = new Map<
    Document[PrimaryKey],
    Document
  >()

  #indexesMap = new Map<
    keyof Document,
    Map<Document[keyof Document], Set<Document>>
  >()

  constructor(
    adapter: Adapter<Document[]>,
    primaryKey: PrimaryKey,
    indexedKeys: Array<keyof Document> = [],
  ) {
    this.#adapter = adapter
    this.#primaryKey = primaryKey

    for (const indexedKey of indexedKeys) {
      if (indexedKey === primaryKey) {
        throw new Error(
          `Primary key "${String(primaryKey)}" cannot be passed to indexedKeys, primary keys are indexed automatically`,
        )
      }

      this.#indexesMap.set(indexedKey, new Map())
    }
  }

  async #syncIndexes(
    documents: Iterable<Document[]> | AsyncIterable<Document[]>,
  ): Promise<void> {
    this.#documentsMap.clear()

    for (const index of this.#indexesMap.values()) {
      index.clear()
    }

    for await (const chunk of documents) {
      for (const document of chunk) {
        const primaryKey = document[this.#primaryKey]
        this.#documentsMap.set(primaryKey, document)

        for (const [indexKey, index] of this.#indexesMap) {
          const indexValue = document[indexKey]
          const documents = index.get(indexValue)

          if (!documents) {
            index.set(indexValue, new Set([document]))
            continue
          }

          documents.add(document)
        }
      }
    }
  }

  async read(): Promise<void> {
    const documents = await this.#adapter.read() ?? []

    await this.#syncIndexes(
      Symbol.asyncIterator in documents ? documents : [documents],
    )
  }

  async write(force = false): Promise<void> {
    if (!force && !this.#hasChanges) {
      return
    }

    this.#hasChanges = false

    try {
      await this.#adapter.write(this.#documentsMap.values())
    } catch (error) {
      this.#hasChanges = true
      throw error
    }
  }

  [Symbol.iterator](): Iterator<Document> {
    return this.#documentsMap.values()
  }

  clear(): void {
    if (this.#documentsMap.size === 0) {
      return
    }

    this.#documentsMap.clear()

    for (const index of this.#indexesMap.values()) {
      index.clear()
    }

    this.#hasChanges = true
  }

  create(document: Document): void {
    const primaryKey = document[this.#primaryKey]
    const hasDocument = this.#documentsMap.has(primaryKey)

    if (hasDocument) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" already exists, cannot be created`,
      )
    }

    this.#documentsMap.set(primaryKey, document)

    for (const [indexKey, index] of this.#indexesMap) {
      const indexValue = document[indexKey]
      const documents = index.get(indexValue)

      if (!documents) {
        index.set(indexValue, new Set([document]))
        continue
      }

      documents.add(document)
    }

    this.#hasChanges = true
  }

  findByIndex<Key extends keyof Document>(
    indexKey: Key,
    indexValue: Document[Key],
  ): Set<Document> {
    const index = this.#indexesMap.get(indexKey)

    if (!index) {
      throw new Error(
        `Index for key "${String(indexKey)}" not found, pass this key to indexedKeys via constructor`,
      )
    }

    return index.get(indexValue) ?? new Set()
  }

  findByPrimaryKey(
    primaryKey: Document[PrimaryKey],
  ): Document | undefined {
    return this.#documentsMap.get(primaryKey)
  }

  updateByPrimaryKey(
    primaryKey: Document[PrimaryKey],
    mutator: (document: Document) => void,
  ): Document {
    const document = this.#documentsMap.get(primaryKey)

    if (!document) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" not found, cannot be updated`,
      )
    }

    for (const [indexKey, index] of this.#indexesMap) {
      const indexValue = document[indexKey]
      const documents = index.get(indexValue)

      if (!documents) {
        continue
      }

      documents.delete(document)

      if (documents.size === 0) {
        index.delete(indexValue)
      }
    }

    mutator(document)
    document[this.#primaryKey] = primaryKey

    for (const [indexKey, index] of this.#indexesMap) {
      const indexValue = document[indexKey]
      const documents = index.get(indexValue)

      if (!documents) {
        index.set(indexValue, new Set([document]))
        continue
      }

      documents.add(document)
    }

    this.#hasChanges = true
    return document
  }

  deleteByPrimaryKey(
    primaryKey: Document[PrimaryKey],
  ): Document {
    const document = this.#documentsMap.get(primaryKey)

    if (!document) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" not found, cannot be deleted`,
      )
    }

    this.#documentsMap.delete(primaryKey)

    for (const [indexKey, index] of this.#indexesMap) {
      const indexValue = document[indexKey]
      const documents = index.get(indexValue)

      if (!documents) {
        continue
      }

      documents.delete(document)

      if (documents.size === 0) {
        index.delete(indexValue)
      }
    }

    this.#hasChanges = true
    return document
  }

  get adapter(): Adapter<Document[]> {
    return this.#adapter
  }

  get hasChanges(): boolean {
    return this.#hasChanges
  }

  get size(): number {
    return this.#documentsMap.size
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get _indexesMap() {
    const isTest = Boolean(process.env['NODE_TEST_CONTEXT'])

    if (!isTest) {
      throw new Error('collection._indexesMap is only for internal tests, don\'t use it')
    }

    return this.#indexesMap
  }
}
