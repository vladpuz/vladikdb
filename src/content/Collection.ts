import type { Adapter, Content } from '../core/VladikDB.js'

export class Collection<
  Document extends object,
> implements Content<Document[]> {
  public adapter: Adapter<Document[]>
  public primaryKeyField: keyof Document
  public indexedFields: (keyof Document)[]

  private documents: Document[] = []

  private documentsMap = new Map<
    Document[keyof Document],
    Document
  >()

  private indexedFieldsMap = new Map<
    keyof Document,
    Map<Document[keyof Document], Document[]>
  >()

  private hasChanges = false

  public constructor(
    adapter: Adapter<Document[]>,
    primaryKeyField: keyof Document,
    indexedFields: (keyof Document)[] = [],
  ) {
    const indexedFieldsSet = new Set(indexedFields)

    if (indexedFieldsSet.has(primaryKeyField)) {
      throw new Error(
        `Primary key field "${String(primaryKeyField)}" cannot be indexed`,
      )
    }

    this.adapter = adapter
    this.primaryKeyField = primaryKeyField
    this.indexedFields = [...indexedFieldsSet]
  }

  private syncIndexes(): void {
    this.documentsMap.clear()
    this.indexedFieldsMap.clear()

    this.indexedFields.forEach((indexedField) => {
      this.indexedFieldsMap.set(indexedField, new Map())
    })

    this.documents.forEach((document) => {
      const primaryKey = document[this.primaryKeyField]
      this.documentsMap.set(primaryKey, document)

      this.indexedFieldsMap.forEach((map, indexedField) => {
        const indexedFieldValue = document[indexedField]
        const documents = map.get(indexedFieldValue)

        if (documents == null) {
          map.set(indexedFieldValue, [document])
          return
        }

        documents.push(document)
      })
    })
  }

  public async init(): Promise<void> {
    await this.read()
  }

  public async clear(): Promise<void> {
    this.documents = []
    this.documentsMap.clear()
    this.indexedFieldsMap.clear()

    await this.write()
  }

  public async read(): Promise<void> {
    this.documents = await this.adapter.read() ?? []
    this.syncIndexes()
  }

  public async write(): Promise<void> {
    if (!this.hasChanges) {
      return
    }

    this.hasChanges = false
    await this.adapter.write(this.documents)
  }

  public getDocuments(): Document[] {
    return this.documents
  }

  public setDocuments(documents: Document[]): void {
    this.documents = documents

    this.syncIndexes()
    this.hasChanges = true
  }

  public create(document: Document): void {
    const primaryKey = document[this.primaryKeyField]
    const currentDocument = this.documentsMap.get(primaryKey)

    if (currentDocument != null) {
      throw new Error(
        `Primary key "${String(primaryKey)}" already exists`,
      )
    }

    this.documents.push(document)
    this.documentsMap.set(primaryKey, document)

    this.indexedFieldsMap.forEach((map, indexedField) => {
      const indexedFieldValue = document[indexedField]
      const documents = map.get(indexedFieldValue)

      if (documents == null) {
        map.set(indexedFieldValue, [document])
        return
      }

      documents.push(document)
    })

    this.hasChanges = true
  }

  public findByIndexedField<Field extends keyof Document>(
    field: Field,
    value: Document[Field],
  ): Document[] {
    const map = this.indexedFieldsMap.get(field)

    if (map == null) {
      throw new Error(
        `Index for field "${String(field)}" not found`,
      )
    }

    return map.get(value) ?? []
  }

  public findByPrimaryKey(
    primaryKey: Document[keyof Document],
  ): Document | undefined {
    return this.documentsMap.get(primaryKey)
  }

  public updateByPrimaryKey(
    primaryKey: Document[keyof Document],
    document: Document,
  ): void {
    const currentDocument = this.documentsMap.get(primaryKey)

    if (currentDocument == null) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" not found`,
      )
    }

    const newPrimaryKey = document[this.primaryKeyField]

    if (newPrimaryKey !== primaryKey) {
      throw new Error(
        `Primary key "${String(primaryKey)}" cannot be updated`,
      )
    }

    this.indexedFieldsMap.forEach((map, indexedField) => {
      const indexedFieldValue = currentDocument[indexedField]
      const newIndexedFieldValue = document[indexedField]

      const documents = map.get(indexedFieldValue)

      if (documents == null) {
        map.set(newIndexedFieldValue, [currentDocument])
        return
      }

      documents.push(currentDocument)

      map.delete(indexedFieldValue)
      map.set(newIndexedFieldValue, documents)
    })

    Object.assign(currentDocument, document)
    this.hasChanges = true
  }

  public deleteByPrimaryKey(
    primaryKey: Document[keyof Document] | Document[keyof Document][],
  ): void {
    const primaryKeys = new Set(
      Array.isArray(primaryKey) ? primaryKey : [primaryKey],
    )

    if (primaryKeys.size === 0) {
      return
    }

    this.documents = this.documents.filter((document) => {
      const documentPrimaryKey = document[this.primaryKeyField]
      const shouldKeep = !primaryKeys.has(documentPrimaryKey)

      if (!shouldKeep) {
        this.documentsMap.delete(documentPrimaryKey)

        this.indexedFieldsMap.forEach((map, indexedField) => {
          const indexedFieldValue = document[indexedField]
          map.delete(indexedFieldValue)
        })

        return false
      }

      return true
    })

    this.hasChanges = true
  }
}
