import { DataFile } from './DataFile.js'

export interface JSONFileOptions {
  space?: number
}

export class JSONFile<T> extends DataFile<T> {
  public constructor(filepath: string, options: JSONFileOptions = {}) {
    const {
      space = 2,
    } = options

    super(filepath, {
      parse: (string) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        return JSON.parse(string) as T
      },
      stringify: (data) => {
        return JSON.stringify(data, null, space)
      },
    })
  }
}
