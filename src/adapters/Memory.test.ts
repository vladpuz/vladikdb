import assert from 'node:assert'
import test, { suite } from 'node:test'

import { Memory } from './Memory.ts'

/* eslint @typescript-eslint/no-floating-promises: off */

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

suite('Memory', () => {
  const post: Post = {
    id: 1,
    userId: 10,
    title: 'post1',
    body: 'body1',
  }

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

    adapter.write(post)
    assert.deepStrictEqual(adapter.read(), post)

    // @ts-expect-error: iterable not allowed
    adapter.write([post])
  })

  test('Memory<Post[]>', () => {
    const adapter = new Memory<Post[]>()

    adapter.write(new Set([post])) // iterable allowed
    assert.deepStrictEqual(adapter.read(), [post])

    // @ts-expect-error: post not allowed
    adapter.write(post)
  })
})
