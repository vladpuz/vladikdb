import { WebStorage } from './WebStorage.js'

export class LocalStorage<T> extends WebStorage<T> {
  public constructor(key: string) {
    super(key, localStorage)
  }
}
