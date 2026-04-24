import assert from 'node:assert'
import { ReadableStream } from 'node:stream/web'
import test, { suite } from 'node:test'

import { JSONObjectStream } from './JSONObjectStream.ts'

/* eslint @typescript-eslint/no-floating-promises: off */

suite('JSONObjectStream', () => {
  const object = {
    key: 'value',

    // test stack
    subobject: {
      key: 'value',
    },

    // test string range
    subarray: [
      '😀',
      '',
      '{',
      '"',
      '""',
      '"""',
      '{"',
      '"{',
      '{""',
      '"{"',
      '""{',
      '{"""',
      '"{""',
      '""{"',
      '"""{',
    ],
  }

  const objectArray = Array.from({ length: 5 }).fill(object)

  test('Can transform single data (object)', async () => {
    // Chunk size: 1
    const chunks1 = await getChunks(JSON.stringify(object))
    assert.deepStrictEqual(chunks1, [object])

    // Chunk size: max
    const chunks2 = await getChunks([JSON.stringify(object)])
    assert.deepStrictEqual(chunks2, [object])

    // Chunk size: 1, with formatting
    const chunks3 = await getChunks(JSON.stringify(object, null, 2))
    assert.deepStrictEqual(chunks3, [object])

    // Chunk size: max, with formatting
    const chunks4 = await getChunks([JSON.stringify(object, null, 2)])
    assert.deepStrictEqual(chunks4, [object])
  })

  test('Can transform collection documents (object[])', async () => {
    // Chunk size: 1
    const chunks1 = await getChunks(JSON.stringify(objectArray))
    assert.deepStrictEqual(chunks1, objectArray)

    // Chunk size: max
    const chunks2 = await getChunks([JSON.stringify(objectArray)])
    assert.deepStrictEqual(chunks2, objectArray)

    // Chunk size: 1, with formatting
    const chunks3 = await getChunks(JSON.stringify(objectArray, null, 2))
    assert.deepStrictEqual(chunks3, objectArray)

    // Chunk size: max, with formatting
    const chunks4 = await getChunks([JSON.stringify(objectArray, null, 2)])
    assert.deepStrictEqual(chunks4, objectArray)
  })

  test('Can transform empty object and empty array', async () => {
    const emptyObject = {}

    // Chunk size: 1
    const chunks1 = await getChunks(JSON.stringify(emptyObject))
    assert.deepStrictEqual(chunks1, [emptyObject])

    // Chunk size: max
    const chunks2 = await getChunks([JSON.stringify(emptyObject)])
    assert.deepStrictEqual(chunks2, [emptyObject])

    // Chunk size: 1, with formatting
    const chunks3 = await getChunks(JSON.stringify(emptyObject, null, 2))
    assert.deepStrictEqual(chunks3, [emptyObject])

    // Chunk size: max, with formatting
    const chunks4 = await getChunks([JSON.stringify(emptyObject, null, 2)])
    assert.deepStrictEqual(chunks4, [emptyObject])

    const emptyArray: unknown[] = []

    // Chunk size: 1
    const chunks5 = await getChunks(JSON.stringify(emptyArray))
    assert.deepStrictEqual(chunks5, emptyArray)

    // Chunk size: max
    const chunks6 = await getChunks([JSON.stringify(emptyArray)])
    assert.deepStrictEqual(chunks6, emptyArray)

    // Chunk size: 1, with formatting
    const chunks7 = await getChunks(JSON.stringify(emptyArray, null, 2))
    assert.deepStrictEqual(chunks7, emptyArray)

    // Chunk size: max, with formatting
    const chunks8 = await getChunks([JSON.stringify(emptyArray, null, 2)])
    assert.deepStrictEqual(chunks8, emptyArray)
  })
})

async function getChunks(data: Iterable<string>): Promise<object[]> {
  const webStream = ReadableStream.from(data)
  const objectStream = webStream.pipeThrough(new JSONObjectStream())

  const chunks: object[] = []

  for await (const chunk of objectStream) {
    for (const object of chunk) {
      chunks.push(object)
    }
  }

  return chunks
}
