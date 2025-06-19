import type { Adapter } from '../../core/VladikDB.js'

import { WebStorage } from './WebStorage.js'

export class SessionStorage<T> implements Adapter<T> {
  private adapter: WebStorage<T>

  public constructor(key: string) {
    this.adapter = new WebStorage(key, sessionStorage)
  }

  public read(): T | null {
    return this.adapter.read()
  }

  public write(data: T): void {
    this.adapter.write(data)
  }
}
