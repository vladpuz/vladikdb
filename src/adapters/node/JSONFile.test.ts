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

    const chunks: unknown[] = await Array.fromAsync(data2)

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

    const chunks: unknown[] = await Array.fromAsync(data2)

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

    const data1 = await fs.readFile(postsPath1, { encoding: 'utf-8' })
    const data2 = await fs.readFile(postsPath2, { encoding: 'utf-8' })
    const data3 = await fs.readFile(postsPath3, { encoding: 'utf-8' })
    const data4 = await fs.readFile(postsPath4, { encoding: 'utf-8' })

    assert.strictEqual(data1, '{}')
    assert.strictEqual(data2, '[]')
    assert.strictEqual(data3, '{}')
    assert.strictEqual(data4, '[]')
  })
})
