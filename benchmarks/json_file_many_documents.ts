import fs from 'node:fs/promises'
import path from 'node:path'

import { JSONFile } from '../src/node.ts'

const object = { id: 1 }

const size = 2 ** 24 // Max map size (V8, x64)
const mb = Math.round((JSON.stringify(object).length + 1) / 1024 / 1024 * size)

console.log(`Write and read ${size.toLocaleString('en')} documents in stream mode (~${mb}MB)`)

const databasePath = 'database_many_documents'
const postsPath = path.join(databasePath, 'posts.json')
const adapter = new JSONFile<object[]>(postsPath, { mode: 'stream' })

const data: object[] = []

for (let i = 1; i <= size; i++) {
  data.push(object)
}

console.time('Write')
await adapter.write(data)
console.timeEnd('Write')

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const iterable = await adapter.read() as AsyncIterable<object[]>
const chunks: object[] = []

console.time('Read')
for await (const chunk of iterable) {
  for (const object of chunk) {
    chunks.push(object)
  }
}
console.timeEnd('Read')

await fs.rm(databasePath, { recursive: true, force: true })
