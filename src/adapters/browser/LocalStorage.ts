import { WebStorage } from './WebStorage.ts'

export class LocalStorage<T> extends WebStorage<T> {
  constructor(key: string) {
    super(key, localStorage)
  }
}
