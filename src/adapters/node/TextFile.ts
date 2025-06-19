import fs from 'node:fs/promises'
import path from 'node:path'
import { Writer } from 'steno'

import type { Adapter } from '../../core/VladikDB.js'

export class TextFile implements Adapter<string> {
  private path: string
  private writer: Writer

  public constructor(path: string) {
    this.path = path
    this.writer = new Writer(path)
  }

  private isFileNotExistError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
  }

  public async read(): Promise<string | null> {
    let data: string | null = null

    try {
      data = await fs.readFile(this.path, { encoding: 'utf-8' })
    } catch (error) {
      if (this.isFileNotExistError(error)) {
        return data
      }

      throw error
    }

    return data
  }

  public async write(data: string): Promise<void> {
    try {
      await this.writer.write(data)
    } catch (error) {
      if (this.isFileNotExistError(error)) {
        const dirname = path.dirname(this.path)
        await fs.mkdir(dirname, { recursive: true })
        await this.writer.write(data)
        return
      }

      throw error
    }
  }
}
