import type { Adapter } from '../../core/VladikDB.js'

import { TextFile } from './TextFile.js'

export class JSONFile<T> implements Adapter<T> {
  private adapter: TextFile

  public constructor(path: string) {
    this.adapter = new TextFile(path)
  }

  public async read(): Promise<T | null> {
    const data = await this.adapter.read()

    if (data === null) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return JSON.parse(data) as T
  }

  public async write(data: T): Promise<void> {
    const string = JSON.stringify(data, null, 2)
    await this.adapter.write(string)
  }
}
