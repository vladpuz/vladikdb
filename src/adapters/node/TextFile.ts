import { kMaxLength, kStringMaxLength } from 'node:buffer'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { TextDecoderStream } from 'node:stream/web'
import { Writer } from 'steno'

import type { Adapter } from '../../core/Vladikdb.ts'

export interface TextFileOptions {
  mode?: 'stream' | 'auto'
}

export class TextFile implements Adapter<string> {
  static defaultOptions: Required<TextFileOptions> = {
    mode: 'auto',
  }

  #filepath: string
  #writer: Writer
  #options: Required<TextFileOptions>

  #isReading = false
  #isWriting = false

  constructor(filepath: string, options?: TextFileOptions) {
    this.#filepath = filepath
    this.#writer = new Writer(filepath)
    this.#options = {
      ...TextFile.defaultOptions,
      ...options,
    }
  }

  #isNoFileError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
  }

  #decorateStream<T>(stream: ReadableStream<T>): ReadableStream<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias,unicorn/no-this-assignment
    const self = this
    const originalAsyncIterator = stream[Symbol.asyncIterator]

    stream[Symbol.asyncIterator] = async function* (
      ...args
    ): ReturnType<typeof originalAsyncIterator> {
      self.#isReading = true

      try {
        yield* Reflect.apply(originalAsyncIterator, stream, args)
      } catch (error) {
        if (self.#isNoFileError(error)) {
          return
        }

        throw error
      } finally {
        self.#isReading = false
      }
    }

    stream.values = stream[Symbol.asyncIterator]

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalPipeThrough = stream.pipeThrough

    stream.pipeThrough = (...args) => {
      const transformedStream = Reflect.apply(originalPipeThrough, stream, args)
      return this.#decorateStream(transformedStream)
    }

    return stream
  }

  #createStream(): ReadableStream<string> {
    const stream = createReadStream(this.#filepath, {
      highWaterMark: Math.min(kStringMaxLength, kMaxLength),
    })

    const webStream = Readable.toWeb(stream)

    const textStream = webStream.pipeThrough(
      new TextDecoderStream('utf-8'),
    )

    return this.#decorateStream(textStream)
  }

  async #readFile(): Promise<string | null> {
    this.#isReading = true

    let data: string | null = null

    try {
      data = await fs.readFile(this.#filepath, { encoding: 'utf-8' })
    } catch (error) {
      if (this.#isNoFileError(error)) {
        return data
      }

      throw error
    } finally {
      this.#isReading = false
    }

    return data
  }

  async read(): Promise<string | null | ReadableStream<string>> {
    if (this.#options.mode === 'stream') {
      return this.#createStream()
    }

    try {
      return await this.#readFile()
    } catch (error) {
      if (error instanceof RangeError) {
        return this.#createStream()
      }

      throw error
    }
  }

  async write(data: string | Iterable<string>): Promise<void> {
    this.#isWriting = true

    try {
      await this.#writer.write(data)
    } catch (error) {
      if (this.#isNoFileError(error)) {
        const dirname = path.dirname(this.#filepath)
        await fs.mkdir(dirname, { recursive: true })
        await this.#writer.write(data)
        return
      }

      throw error
    } finally {
      this.#isWriting = false
    }
  }

  get isReading(): boolean {
    return this.#isReading
  }

  get isWriting(): boolean {
    return this.#isWriting
  }
}
