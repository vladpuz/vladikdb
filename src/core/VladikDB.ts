export interface Content<T> {
  adapter: Adapter<T>
  init: () => Promise<void>
  clear: () => Promise<void>
  read: () => Promise<void>
  write: () => Promise<void>
}

export interface Adapter<T> {
  read: () => Promise<T | null> | (T | null)
  write: (data: T) => Promise<void> | void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class VladikDB<ContentObject extends Record<string, Content<any>>> {
  public content: ContentObject
  public contentArray: Array<Content<unknown>>

  public constructor(content: ContentObject) {
    this.content = content
    this.contentArray = Object.values(content)
  }

  public async init(): Promise<void> {
    await Promise.all(this.contentArray.map(async (content) => {
      await content.init()
    }))
  }

  public async clear(): Promise<void> {
    await Promise.all(this.contentArray.map(async (content) => {
      await content.clear()
    }))
  }

  public async read(): Promise<void> {
    await Promise.all(this.contentArray.map(async (content) => {
      await content.read()
    }))
  }

  public async write(): Promise<void> {
    await Promise.all(this.contentArray.map(async (content) => {
      await content.write()
    }))
  }
}

export default VladikDB
