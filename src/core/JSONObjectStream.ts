/* eslint-disable @typescript-eslint/no-non-null-assertion */

export class JSONObjectStream<
  T extends object,
> extends TransformStream<string, T[]> {
  constructor() {
    let buffer: string[] = []

    super({
      transform(chunk, controller) {
        buffer.push(chunk)

        const objects: T[] = []
        const stack: string[] = []
        let inStringRange = false

        let objectStartChunkIndex = 0
        let objectStartCharIndex = 0

        let objectEndChunkIndex = 0
        let objectEndCharIndex = 0

        for (let i = 0; i < buffer.length; i++) {
          for (let j = 0; j < buffer[i]!.length; j++) {
            const char = buffer[i]![j]!

            // String start or end
            if (char === '"') {
              const prevChar = (j === 0)
                ? buffer[i - 1]?.at(-1) ?? ''
                : buffer[i]![j - 1]!

              if (prevChar === '\\') {
                continue
              }

              inStringRange = !inStringRange
              continue
            }

            // Skip string content
            if (inStringRange) {
              continue
            }

            if (char === '{') { // Object opens
              if (stack.length === 0) { // Root object opens
                objectStartChunkIndex = i
                objectStartCharIndex = j
              }

              stack.push(char)
            } else if (char === '}') { // Object closes
              stack.pop()

              if (stack.length === 0) { // Root object closes
                const sliceIndex = j + 1

                objectEndChunkIndex = i
                objectEndCharIndex = sliceIndex

                let object: string

                // Object can be located in multiple chunks
                if (objectStartChunkIndex === i) {
                  object = buffer[i]!.slice(objectStartCharIndex, sliceIndex)
                } else {
                  const chunks = [
                    buffer[objectStartChunkIndex]!.slice(objectStartCharIndex),
                  ]

                  for (let k = objectStartChunkIndex + 1; k < i; k++) {
                    chunks.push(buffer[k]!)
                  }

                  chunks.push(buffer[i]!.slice(0, sliceIndex))
                  object = chunks.join('')
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                objects.push(JSON.parse(object) as T)
              }
            }
          }

          // Clear chunk
          if (objectEndCharIndex) {
            const chunk = buffer[objectEndChunkIndex]!.slice(objectEndCharIndex)

            if (chunk) {
              buffer[objectEndChunkIndex] = chunk
            } else {
              objectEndChunkIndex += 1
            }
          }
        }

        // Clear buffer
        if (objectEndChunkIndex) {
          buffer = buffer.slice(objectEndChunkIndex)
        }

        // Send objects array (for performance, this is an array)
        controller.enqueue(objects)
      },
    })
  }
}
