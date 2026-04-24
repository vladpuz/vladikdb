import { WebStorage } from './WebStorage.ts'

export class SessionStorage<T> extends WebStorage<T> {
  constructor(key: string) {
    super(key, sessionStorage)
  }
}
