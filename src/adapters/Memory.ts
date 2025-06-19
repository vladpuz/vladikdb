import type { Adapter } from '../core/VladikDB.js'

export class Memory<T> implements Adapter<T> {
  private data: T | null = null

  public read(): T | null {
    return this.data
  }

  public write(data: T): void {
    this.data = data
  }
}
