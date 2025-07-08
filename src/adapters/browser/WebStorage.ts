import type { Adapter } from '../../core/VladikDB.js'

export class WebStorage<T> implements Adapter<T> {
  private key: string
  private storage: Storage

  public constructor(key: string, storage: Storage) {
    this.key = key
    this.storage = storage
  }

  public read(): T | null {
    const data = this.storage.getItem(this.key)

    if (data === null) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return JSON.parse(data) as T
  }

  public write(data: T): void {
    const string = JSON.stringify(data)
    this.storage.setItem(this.key, string)
  }
}
