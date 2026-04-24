import assert from 'node:assert'
import test, { suite } from 'node:test'

import { Memory } from './Memory.ts'

/* eslint @typescript-eslint/no-floating-promises: off */

interface Post {
  title: string
}

suite('Memory', () => {
  test('Memory<string>', () => {
    const adapter = new Memory<string>()
    const data = ''

    adapter.write(data)
    assert.deepStrictEqual(adapter.read(), data)

    // @ts-expect-error: iterable not allowed
    adapter.write([data])
  })

  test('Memory<string[]>', () => {
    const adapter = new Memory<string[]>()
    const data = ['']

    adapter.write(new Set(data)) // iterable allowed
    assert.deepStrictEqual(adapter.read(), data)

    // @ts-expect-error: string not allowed
    adapter.write('')
  })

  test('Memory<Post>', () => {
    const adapter = new Memory<Post>()
    const data = { title: '' }

    adapter.write(data)
    assert.deepStrictEqual(adapter.read(), data)

    // @ts-expect-error: iterable not allowed
    adapter.write([data])
  })

  test('Memory<Post[]>', () => {
    const adapter = new Memory<Post[]>()
    const data = [{ title: '' }]

    adapter.write(new Set(data)) // iterable allowed
    assert.deepStrictEqual(adapter.read(), data)

    // @ts-expect-error: post not allowed
    adapter.write({ title: '' })
  })
})
