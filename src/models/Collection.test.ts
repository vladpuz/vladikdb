import assert from 'node:assert'
import test, { afterEach, beforeEach, type Mock, suite } from 'node:test'

import type { Adapter } from '../core/Vladikdb.ts'

import { Memory } from '../adapters/Memory.ts'
import { Collection } from './Collection.ts'

/* eslint @typescript-eslint/no-floating-promises: off */

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

suite('Collection', () => {
  const adapter = new Memory<Post[]>()
  const collection = new Collection(adapter, 'id', ['userId'])

  let post1: Post
  let post2: Post
  let post3: Post
  let post4: Post

  beforeEach(() => {
    post1 = {
      id: 1,
      userId: 10,
      title: 'post1',
      body: 'body1',
    }

    post2 = {
      id: 2,
      userId: 10,
      title: 'post2',
      body: 'body2',
    }

    post3 = {
      id: 3,
      userId: 20,
      title: 'post3',
      body: 'body3',
    }

    post4 = {
      id: 4,
      userId: 20,
      title: 'post4',
      body: 'body4',
    }
  })

  afterEach(() => {
    collection.clear()
    collection.write()
  })

  test('Read', async () => {
    await collection.adapter.write([post1, post2, post3, post4])
    await collection.read()

    assert.deepStrictEqual([...collection], [post1, post2, post3, post4])
    assert.deepStrictEqual([...collection.findByIndex('userId', 10)], [post1, post2])
    assert.deepStrictEqual([...collection.findByIndex('userId', 20)], [post3, post4])
    assert.strictEqual(collection.hasChanges, false)
  })

  test('Write: simple case', () => {
    collection.create(post1)
    collection.create(post2)
    collection.create(post3)
    collection.create(post4)
    collection.write()

    assert.deepStrictEqual([...collection], [post1, post2, post3, post4])
    assert.strictEqual(collection.hasChanges, false)
  })

  test('Write: adapter write error rolls back hasChanges', async () => {
    const adapter: Adapter<Post[]> = {
      read() {
        return []
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

    const collection = new Collection(adapter, 'id', ['userId'])
    collection.create(post1)

    await assert.rejects(async () => {
      await collection.write()
    })

    assert.strictEqual(collection.hasChanges, true)
  })

  test('Write: parallel writing is ignored', async (t) => {
    const adapter: Adapter<Post[]> & {
      write: Mock<Adapter<Post[]>['write']>
    } = {
      read() {
        return []
      },
      write: t.mock.fn(),
      get isReading() {
        return false
      },
      get isWriting() {
        return false
      },
    }

    const collection = new Collection(adapter, 'id', ['userId'])
    collection.create(post1)

    await Promise.all(Array.from({ length: 10 }, async () => {
      await collection.write()
    }))

    assert.strictEqual(adapter.write.mock.callCount(), 1)
  })

  test('Constructor: throws an error if the primary key is indexed', () => {
    assert.throws(() => {
      // eslint-disable-next-line no-new
      new Collection(adapter, 'id', ['id'])
    })
  })

  test('Create: simple case', () => {
    collection.create(post1)
    assert.strictEqual(collection.findByPrimaryKey(1), post1)
  })

  test('Create: throws an error if the primary key is already used by another document', () => {
    collection.create(post1)

    assert.throws(() => {
      collection.create(post1)
    })
  })

  test('Create: indexes are created', () => {
    collection.create(post1)
    collection.create(post2)
    collection.create(post3)
    collection.create(post4)

    assert.deepStrictEqual([...collection.findByIndex('userId', 10)], [post1, post2])
    assert.deepStrictEqual([...collection.findByIndex('userId', 20)], [post3, post4])
  })

  test('Update: simple case', () => {
    collection.create(post1)
    collection.updateByPrimaryKey(1, (post) => {
      post.title = 'new title'
    })

    assert.strictEqual(collection.findByPrimaryKey(1)?.title, 'new title')
  })

  test('Update: throws an error if the document does not exist', () => {
    assert.throws(() => {
      collection.updateByPrimaryKey(1, (post) => {
        post.title = 'new title'
      })
    })
  })

  test('Update: changes to primary keys are ignored', () => {
    collection.create(post1)

    collection.updateByPrimaryKey(1, (post) => {
      post.id = 10
    })

    assert.strictEqual(post1.id, 1)
    assert.strictEqual(collection.findByPrimaryKey(1), post1)
    assert.strictEqual(collection.findByPrimaryKey(10), undefined)
  })

  test('Update: indexes are updated and do not create memory leaks', () => {
    collection.create(post1)
    collection.create(post2)
    collection.create(post3)
    collection.create(post4)

    collection.updateByPrimaryKey(1, (post) => {
      post.userId = 100
    })

    collection.updateByPrimaryKey(2, (post) => {
      post.userId = 100
    })

    collection.updateByPrimaryKey(3, (post) => {
      post.userId = 200
    })

    collection.updateByPrimaryKey(4, (post) => {
      post.userId = 200
    })

    assert.deepStrictEqual([...collection.findByIndex('userId', 100)], [post1, post2])
    assert.deepStrictEqual([...collection.findByIndex('userId', 200)], [post3, post4])
    assert.strictEqual(collection._indexesMap.get('userId')?.size, 2)
  })

  test('Delete: simple case', () => {
    collection.create(post1)
    collection.deleteByPrimaryKey(1)

    assert.strictEqual(collection.findByPrimaryKey(1), undefined)
  })

  test('Delete: throws an error if the document does not exist', () => {
    assert.throws(() => {
      collection.deleteByPrimaryKey(1)
    })
  })

  test('Delete: indexes are deleted and do not create memory leaks', () => {
    collection.create(post1)
    collection.create(post2)
    collection.create(post3)
    collection.create(post4)

    collection.deleteByPrimaryKey(1)

    assert.deepStrictEqual([...collection.findByIndex('userId', 10)], [post2])
    assert.deepStrictEqual([...collection.findByIndex('userId', 20)], [post3, post4])
    assert.strictEqual(collection._indexesMap.get('userId')?.size, 2)

    collection.deleteByPrimaryKey(2)

    assert.deepStrictEqual([...collection.findByIndex('userId', 10)], [])
    assert.deepStrictEqual([...collection.findByIndex('userId', 20)], [post3, post4])
    assert.strictEqual(collection._indexesMap.get('userId')?.size, 1)

    collection.deleteByPrimaryKey(3)

    assert.deepStrictEqual([...collection.findByIndex('userId', 10)], [])
    assert.deepStrictEqual([...collection.findByIndex('userId', 20)], [post4])
    assert.strictEqual(collection._indexesMap.get('userId')?.size, 1)

    collection.deleteByPrimaryKey(4)

    assert.deepStrictEqual([...collection.findByIndex('userId', 10)], [])
    assert.deepStrictEqual([...collection.findByIndex('userId', 20)], [])
    assert.strictEqual(collection._indexesMap.get('userId')?.size, 0)
  })

  test('Clear ignores duplicate calls', () => {
    collection.create(post1)

    collection.clear()
    collection.write()

    // Ignored call
    collection.clear()

    assert.strictEqual(collection.size, 0)
    assert.strictEqual(collection.hasChanges, false)
  })

  test('findByIndex throws an error if the index does not exist', () => {
    const collection = new Collection(adapter, 'id')

    assert.throws(() => {
      collection.findByIndex('userId', 10)
    })
  })
})
