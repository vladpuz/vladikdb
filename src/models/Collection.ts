import type { Adapter, Model } from '../core/Vladikdb.ts'

export class Collection<
  Document extends object,
  PrimaryKey extends keyof Document,
> implements Model<Document[]> {
  #adapter: Adapter<Document[]>
  #primaryKey: PrimaryKey
  #indexedKeys: Array<keyof Document>
  #hasChanges = false

  #documentsMap = new Map<
    Document[PrimaryKey],
    Document
  >()

  #indexesMap = new Map<
    keyof Document,
    Map<Document[keyof Document], Document[]>
  >()

  constructor(
    adapter: Adapter<Document[]>,
    primaryKey: PrimaryKey,
    indexedKeys: Array<keyof Document> = [],
  ) {
    const indexedKeysSet = new Set(indexedKeys)

    if (indexedKeysSet.has(primaryKey)) {
      throw new Error(
        `Primary key "${String(primaryKey)}" cannot be indexed`,
      )
    }

    this.#adapter = adapter
    this.#primaryKey = primaryKey
    this.#indexedKeys = [...indexedKeysSet]
  }

  async #syncIndexes(
    documents: Iterable<Document[]> | AsyncIterable<Document[]>,
  ): Promise<void> {
    this.#documentsMap.clear()
    this.#indexesMap.clear()

    for (const indexKey of this.#indexedKeys) {
      this.#indexesMap.set(indexKey, new Map())
    }

    for await (const chunk of documents) {
      for (const document of chunk) {
        const primaryKey = document[this.#primaryKey]
        this.#documentsMap.set(primaryKey, document)

        for (const [indexKey, map] of this.#indexesMap) {
          const indexValue = document[indexKey]
          const documents = map.get(indexValue)

          if (!documents) {
            map.set(indexValue, [document])
            continue
          }

          documents.push(document)
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
    await this.#adapter.write(this.#documentsMap.values())
  }

  [Symbol.iterator](): Iterator<Document> {
    return this.#documentsMap.values()
  }

  clear(): void {
    this.#documentsMap.clear()
    this.#indexesMap.clear()
    this.#hasChanges = true
  }

  create(document: Document): void {
    const primaryKey = document[this.#primaryKey]
    const currentDocument = this.#documentsMap.get(primaryKey)

    if (currentDocument) {
      throw new Error(
        `Primary key "${String(primaryKey)}" already exists`,
      )
    }

    this.#documentsMap.set(primaryKey, document)

    for (const [indexKey, map] of this.#indexesMap) {
      const indexValue = document[indexKey]
      const documents = map.get(indexValue)

      if (!documents) {
        map.set(indexValue, [document])
        continue
      }

      documents.push(document)
    }

    this.#hasChanges = true
  }

  findByIndex<Key extends keyof Document>(
    indexKey: Key,
    indexValue: Document[Key],
  ): Document[] {
    const index = this.#indexesMap.get(indexKey)

    if (!index) {
      throw new Error(
        `Index for key "${String(indexKey)}" not found`,
      )
    }

    return index.get(indexValue) ?? []
  }

  findByPrimaryKey(
    primaryKey: Document[PrimaryKey],
  ): Document | undefined {
    return this.#documentsMap.get(primaryKey)
  }

  updateByPrimaryKey(
    primaryKey: Document[PrimaryKey],
    document: Document,
  ): void {
    const currentDocument = this.#documentsMap.get(primaryKey)

    if (!currentDocument) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" not found`,
      )
    }

    const newPrimaryKey = document[this.#primaryKey]

    if (newPrimaryKey !== primaryKey) {
      throw new Error(
        `Primary key "${String(primaryKey)}" cannot be updated`,
      )
    }

    for (const [indexKey, map] of this.#indexesMap) {
      const indexValue = currentDocument[indexKey]
      const newIndexValue = document[indexKey]

      const documents = map.get(indexValue)

      if (!documents) {
        map.set(newIndexValue, [currentDocument])
        continue
      }

      documents.push(currentDocument)

      map.delete(indexValue)
      map.set(newIndexValue, documents)
    }

    Object.assign(currentDocument, document)
    this.#hasChanges = true
  }

  deleteByPrimaryKey(
    primaryKey: Document[PrimaryKey],
  ): void {
    const document = this.#documentsMap.get(primaryKey)

    if (!document) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" not found`,
      )
    }

    this.#documentsMap.delete(primaryKey)

    for (const [indexKey, map] of this.#indexesMap) {
      const indexValue = document[indexKey]
      map.delete(indexValue)
    }

    this.#hasChanges = true
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
}
