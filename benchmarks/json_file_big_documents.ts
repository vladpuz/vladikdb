import { kStringMaxLength } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'

import { JSONFile } from '../src/node.ts'

// 512MB object after stringify (V8, x64)
const object = {
  id: '0'.repeat(kStringMaxLength - JSON.stringify({ id: '' }).length),
}

const size = 1
const mb = Math.round((kStringMaxLength + 1) / 1024 / 1024 * size)

console.log(`Write and read ${size.toLocaleString('en')} documents in stream mode (~${mb}MB)`)

const databasePath = 'database_big_documents'
const postsPath = path.join(databasePath, 'posts.json')
const adapter = new JSONFile<object[]>(postsPath, { mode: 'stream' })

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const data = Array.from({ length: size }).fill(object) as object[]

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
