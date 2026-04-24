import type { Adapter, WritableData } from '../../core/Vladikdb.ts'

export class WebStorage<T> implements Adapter<T> {
  #key: string
  #storage: Storage

  constructor(key: string, storage: Storage) {
    this.#key = key
    this.#storage = storage
  }

  read(): T | null {
    const data = this.#storage.getItem(this.#key)

    if (data === null) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return JSON.parse(data) as T
  }

  write(data: WritableData<T>): void {
    if (typeof data === 'object' && data !== null && Symbol.iterator in data) {
      const array = Array.isArray(data) ? data : [...data]
      this.#storage.setItem(this.#key, JSON.stringify(array))
      return
    }

    this.#storage.setItem(this.#key, JSON.stringify(data))
  }

  get isReading(): boolean {
    return false
  }

  get isWriting(): boolean {
    return false
  }
}
