import type { Adapter, WritableData } from '../core/Vladikdb.ts'

export class Memory<T> implements Adapter<T> {
  #data: T | null = null

  read(): T | null {
    return this.#data
  }

  write(data: WritableData<T>): void {
    if (typeof data === 'object' && data !== null && Symbol.iterator in data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      this.#data = (Array.isArray(data) ? data : [...data]) as T
      return
    }

    this.#data = data
  }

  get isReading(): boolean {
    return false
  }

  get isWriting(): boolean {
    return false
  }
}
