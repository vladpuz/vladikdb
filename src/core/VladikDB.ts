export interface Content<T> {
  adapter: Adapter<T>
  read: () => Promise<void>
  write: (force?: boolean) => Promise<void>
}

export interface Adapter<T> {
  read: () => Promise<T | null> | (T | null)
  write: (data: T) => Promise<void> | void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class VladikDB<ContentObject extends Record<string, Content<any>>> {
  public readonly content: ContentObject
  public readonly contentArray: Array<Content<unknown>>

  public constructor(content: ContentObject) {
    this.content = content
    this.contentArray = Object.values(content)
  }

  public async read(): Promise<void> {
    await Promise.all(this.contentArray.map(async (content) => {
      await content.read()
    }))
  }

  public async write(force = false): Promise<void> {
    await Promise.all(this.contentArray.map(async (content) => {
      await content.write(force)
    }))
  }
}

export default VladikDB
