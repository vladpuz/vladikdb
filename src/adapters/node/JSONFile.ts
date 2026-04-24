import { kStringMaxLength } from 'node:buffer'

import type { Adapter, ReadableData, WritableData } from '../../core/Vladikdb.ts'

import { JSONObjectStream } from '../../core/JSONObjectStream.ts'
import { TextFile, type TextFileOptions } from './TextFile.ts'

export interface JSONFileOptions extends TextFileOptions {
  space?: number
}

export class JSONFile<T> implements Adapter<T> {
  static defaultOptions: Required<JSONFileOptions> = {
    ...TextFile.defaultOptions,
    space: 0,
  }

  #adapter: TextFile
  #options: Required<JSONFileOptions>

  constructor(filepath: string, options?: JSONFileOptions) {
    const mergedOptions = {
      ...JSONFile.defaultOptions,
      ...options,
    }

    this.#adapter = new TextFile(filepath, mergedOptions)
    this.#options = mergedOptions
  }

  * #getIterable(data: Iterable<unknown>): Iterable<string> {
    const [
      arrayOpen,
      arrayClose,
      arraySeparator,
    ] = this.#options.space ? ['[\n', '\n]', ',\n'] : ['[', ']', ',']

    const buffer = [arrayOpen]
    let bufferLength = arrayOpen.length

    for (const object of data) {
      const string = JSON.stringify(object, null, this.#options.space)
      const nextLength = bufferLength + string.length

      if (nextLength > kStringMaxLength) {
        yield buffer.join('')
        buffer.length = 0
        bufferLength = 0
      }

      buffer.push(string)
      bufferLength += string.length

      const nextLengthSeparator = bufferLength + arraySeparator.length

      if (nextLengthSeparator > kStringMaxLength) {
        yield buffer.join('')
        buffer.length = 0
        bufferLength = 0
      }

      buffer.push(arraySeparator)
      bufferLength += arraySeparator.length
    }

    const lastChunk = buffer.at(-1)

    if (lastChunk === arraySeparator) {
      buffer.pop()
    }

    buffer.push(arrayClose)
    yield buffer.join('')
  }

  async #writeIterable(data: Iterable<unknown>): Promise<void> {
    const iterable = this.#getIterable(data)
    await this.#adapter.write(iterable)
  }

  async #writeFile(iterable: Iterable<unknown>): Promise<void> {
    const array = Array.isArray(iterable) ? iterable : [...iterable]
    const string = JSON.stringify(array, null, this.#options.space)
    await this.#adapter.write(string)
  }

  async read(): Promise<ReadableData<T>> {
    const data = await this.#adapter.read()

    if (data instanceof ReadableStream) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      return data.pipeThrough(
        new JSONObjectStream(),
      ) as unknown as ReadableData<T>
    }

    if (data === null) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return JSON.parse(data) as T
  }

  async write(data: WritableData<T>): Promise<void> {
    if (typeof data === 'object' && data !== null && Symbol.iterator in data) {
      if (this.#options.mode === 'stream') {
        await this.#writeIterable(data)
        return
      }

      try {
        await this.#writeFile(data)
      } catch (error) {
        if (error instanceof RangeError) {
          await this.#writeIterable(data)
          return
        }

        throw error
      }

      return
    }

    const string = JSON.stringify(data, null, this.#options.space)
    await this.#adapter.write(string)
  }

  get isReading(): boolean {
    return this.#adapter.isReading
  }

  get isWriting(): boolean {
    return this.#adapter.isWriting
  }
}
