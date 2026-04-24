import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import test, { suite } from 'node:test'

import { JSONFile } from './JSONFile.ts'

/* eslint @typescript-eslint/no-floating-promises: off */

suite('JSONFile', () => {
  test('Reading when directory or file does not exist', async (t) => {
    t.after(async () => {
      await fs.rm(databasePath, { recursive: true, force: true })
    })

    const databasePath = 'database_read_empty'
    const postsPath1 = path.join(databasePath, 'posts1.json')
    const postsPath2 = path.join(databasePath, 'posts2.json')

    const adapter1 = new JSONFile(postsPath1, { mode: 'auto' })
    const adapter2 = new JSONFile(postsPath2, { mode: 'stream' })

    const data1 = await adapter1.read()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const data2 = await adapter2.read() as AsyncIterable<unknown>

    const chunks: unknown[] = []

    for await (const chunk of data2) {
      chunks.push(chunk)
    }

    assert.strictEqual(data1, null)
    assert.strictEqual(chunks.length, 0)
  })

  test('Writing when directory or file does not exist', async (t) => {
    t.after(async () => {
      await fs.rm(databasePath, { recursive: true, force: true })
    })

    const databasePath = 'database_write_empty'
    const postsPath1 = path.join(databasePath, 'posts1.json')
    const postsPath2 = path.join(databasePath, 'posts2.json')

    const adapter1 = new JSONFile(postsPath1, { mode: 'auto' })
    const adapter2 = new JSONFile(postsPath2, { mode: 'stream' })

    const object = { id: 1 }
    await adapter1.write([object])
    await adapter2.write([object])

    const data1 = await adapter1.read()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const data2 = await adapter2.read() as AsyncIterable<unknown>

    const chunks: unknown[] = []

    for await (const chunk of data2) {
      chunks.push(chunk)
    }

    assert.deepStrictEqual(data1, [object])
    assert.deepStrictEqual(chunks, [[object]])
  })

  test('Writing and reading empty object and empty array', async (t) => {
    t.after(async () => {
      await fs.rm(databasePath, { recursive: true, force: true })
    })

    const databasePath = 'database_empty_object_and_array'
    const postsPath1 = path.join(databasePath, 'posts1.json')
    const postsPath2 = path.join(databasePath, 'posts2.json')
    const postsPath3 = path.join(databasePath, 'posts3.json')
    const postsPath4 = path.join(databasePath, 'posts4.json')

    const adapter1 = new JSONFile(postsPath1, { mode: 'auto' })
    const adapter2 = new JSONFile(postsPath2, { mode: 'auto' })
    const adapter3 = new JSONFile(postsPath3, { mode: 'stream' })
    const adapter4 = new JSONFile(postsPath4, { mode: 'stream' })

    await adapter1.write({})
    await adapter2.write([])
    await adapter3.write({})
    await adapter4.write([])

    const data1 = await adapter1.read()
    const data2 = await adapter2.read()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const data3 = await adapter3.read() as AsyncIterable<unknown>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const data4 = await adapter4.read() as AsyncIterable<unknown>

    const chunks1: unknown[] = []
    const chunks2: unknown[] = []

    for await (const chunk of data3) {
      chunks1.push(chunk)
    }

    for await (const chunk of data4) {
      chunks2.push(chunk)
    }

    assert.deepStrictEqual(data1, {})
    assert.deepStrictEqual(data2, [])
    assert.deepStrictEqual(chunks1, [[{}]])
    assert.deepStrictEqual(chunks2, [[]])
  })
})
