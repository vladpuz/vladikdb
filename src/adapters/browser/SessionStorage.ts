import { WebStorage } from './WebStorage.js'

export class SessionStorage<T> extends WebStorage<T> {
  public constructor(key: string) {
    super(key, sessionStorage)
  }
}
