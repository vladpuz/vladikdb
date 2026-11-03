import assert from 'node:assert'
import test, { afterEach, beforeEach, type Mock, suite } from 'node:test'

import type { Adapter } from '../core/Vladikdb.ts'

import { Memory } from '../adapters/Memory.ts'
import { Single } from './Single.ts'

/* eslint @typescript-eslint/no-floating-promises: off */

interface Config {
  apiKey: string
}

suite('Single', () => {
  let defaultData: Config = { apiKey: '' }
  let newData: Config = { apiKey: 'NEW_KEY' }

  const adapter = new Memory<Config>()
  const single = new Single(adapter, defaultData)

  beforeEach(() => {
    defaultData = { apiKey: '' }
    newData = { apiKey: 'NEW_KEY' }
  })

  afterEach(() => {
    single.reset()
    single.write()
  })

  test('Read', async () => {
    await single.adapter.write(newData)
    await single.read()

    assert.deepStrictEqual(single.data, newData)
    assert.strictEqual(single.hasChanges, false)
  })

  test('Write: simple case', () => {
    single.update((data) => {
      Object.assign(data, newData)
    })

    single.write()

    assert.deepStrictEqual(single.data, newData)
    assert.strictEqual(single.hasChanges, false)
  })

  test('Write: adapter write error rolls back hasChanges', async () => {
    const adapter: Adapter<Config> = {
      read() {
        return defaultData
      },
      write() {
        throw new Error('Write error')
      },
      get isReading() {
        return false
      },
      get isWriting() {
        return false
      },
    }

    const single = new Single(adapter, defaultData)

    single.update((data) => {
      Object.assign(data, newData)
    })

    await assert.rejects(async () => {
      await single.write()
    })

    assert.strictEqual(single.hasChanges, true)
  })

  test('Write: parallel writing is ignored', async (t) => {
    const adapter: Adapter<Config> & {
      write: Mock<Adapter<Config>['write']>
    } = {
      read() {
        return defaultData
      },
      write: t.mock.fn(),
      get isReading() {
        return false
      },
      get isWriting() {
        return false
      },
    }

    const single = new Single(adapter, defaultData)

    single.update((data) => {
      Object.assign(data, newData)
    })

    await Promise.all(Array.from({ length: 10 }, async () => {
      await single.write()
    }))

    assert.strictEqual(adapter.write.mock.callCount(), 1)
  })

  test('Update: simple case', () => {
    single.update((data) => {
      Object.assign(data, newData)
    })

    assert.deepStrictEqual(single.data, newData)
    assert.strictEqual(single.hasChanges, true)
  })

  test('Update: reset after update', () => {
    single.update((data) => {
      data.apiKey = 'NEW_KEY'
    })

    single.reset()

    assert.strictEqual(single.data.apiKey, '')
    assert.strictEqual(single.hasChanges, true)
  })

  test('Reset: simple case', () => {
    single.update((data) => {
      Object.assign(data, newData)
    })

    single.reset()

    assert.deepStrictEqual(single.data, defaultData)
    assert.strictEqual(single.hasChanges, true)
  })

  test('Reset: ignores duplicate calls', () => {
    single.update((data) => {
      Object.assign(data, newData)
    })

    single.reset()
    single.write()

    // Ignored call
    single.reset()

    assert.strictEqual(single.hasChanges, false)
  })
})
