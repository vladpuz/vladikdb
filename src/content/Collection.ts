import type { Adapter, Content } from '../core/VladikDB.js'

export class Collection<
  Document extends object,
  PrimaryKey extends keyof Document,
> implements Content<Document[]> {
  public readonly adapter: Adapter<Document[]>
  public readonly primaryKeyField: PrimaryKey
  public readonly indexedFields: Array<keyof Document>

  private documentsMap = new Map<
    Document[PrimaryKey],
    Document
  >()

  private indexedFieldsMap = new Map<
    keyof Document,
    Map<Document[keyof Document], Document[]>
  >()

  private hasChanges = false

  public constructor(
    adapter: Adapter<Document[]>,
    primaryKeyField: PrimaryKey,
    indexedFields: Array<keyof Document> = [],
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

  private syncIndexes(documents: Iterable<Document>): void {
    this.documentsMap.clear()
    this.indexedFieldsMap.clear()

    this.indexedFields.forEach((indexedField) => {
      this.indexedFieldsMap.set(indexedField, new Map())
    })

    for (const document of documents) {
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
    }
  }

  public async read(): Promise<void> {
    const documents = await this.adapter.read() ?? []
    this.syncIndexes(documents)
  }

  public async write(force = false): Promise<void> {
    if (!force && !this.hasChanges) {
      return
    }

    this.hasChanges = false
    await this.adapter.write([...this.documentsMap.values()])
  }

  public getDocuments(): Iterable<Document> {
    return this.documentsMap.values()
  }

  public setDocuments(documents: Iterable<Document>): void {
    this.syncIndexes(documents)
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
    primaryKey: Document[PrimaryKey],
  ): Document | undefined {
    return this.documentsMap.get(primaryKey)
  }

  public updateByPrimaryKey(
    primaryKey: Document[PrimaryKey],
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
    primaryKey: Document[PrimaryKey],
  ): void {
    const document = this.documentsMap.get(primaryKey)

    if (document == null) {
      throw new Error(
        `Document with primary key "${String(primaryKey)}" not found`,
      )
    }

    this.documentsMap.delete(primaryKey)

    this.indexedFieldsMap.forEach((map, indexedField) => {
      const indexedFieldValue = document[indexedField]
      map.delete(indexedFieldValue)
    })

    this.hasChanges = true
  }
}
