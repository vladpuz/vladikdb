import type { Adapter } from '../../core/VladikDB.js'

import { TextFile } from './TextFile.js'

export interface DataConverter<T> {
  parse: (string: string) => T
  stringify: (data: T) => string
}

export class DataFile<T> implements Adapter<T> {
  private adapter: TextFile
  private converter: DataConverter<T>

  public constructor(filepath: string, converter: DataConverter<T>) {
    this.adapter = new TextFile(filepath)
    this.converter = converter
  }

  public async read(): Promise<T | null> {
    const data = await this.adapter.read()

    if (data === null) {
      return null
    }

    return this.converter.parse(data)
  }

  public async write(data: T): Promise<void> {
    const string = this.converter.stringify(data)
    await this.adapter.write(string)
  }
}
