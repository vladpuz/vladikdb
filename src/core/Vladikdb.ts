export interface Model<T> {
  readonly adapter: Adapter<T>
  readonly hasChanges: boolean
  read: () => Promise<void>
  write: (force?: boolean) => Promise<void>
}

export interface Adapter<T> {
  readonly isReading: boolean
  readonly isWriting: boolean
  read: () => Promise<ReadableData<T>> | ReadableData<T>
  write: (data: WritableData<T>) => Promise<void> | void
}

export type ReadableData<T> = T | null | (
    T extends Iterable<unknown>
      ? AsyncIterable<T>
      : AsyncIterable<T[]>
    )

export type WritableData<T> = T | (
    T extends Iterable<infer Document>
      ? T extends object ? Iterable<Document> & object : never
      : never
    )

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>

class Vladikdb<M extends Record<string, AnyModel>> {
  #models: M
  #modelsArray: readonly AnyModel[]

  constructor(models: M) {
    this.#models = Object.freeze(models)
    this.#modelsArray = Object.freeze(Object.values(models))
  }

  async read(): Promise<void> {
    await Promise.all(this.#modelsArray.map(async (model) => {
      await model.read()
    }))
  }

  async write(force = false): Promise<void> {
    await Promise.all(this.#modelsArray.map(async (model) => {
      await model.write(force)
    }))
  }

  get isReading(): boolean {
    return this.#modelsArray.some((model) => {
      return model.adapter.isReading
    })
  }

  get isWriting(): boolean {
    return this.#modelsArray.some((model) => {
      return model.adapter.isWriting
    })
  }

  get hasChanges(): boolean {
    return this.#modelsArray.some((model) => {
      return model.hasChanges
    })
  }

  get models(): M {
    return this.#models
  }

  get modelsArray(): readonly AnyModel[] {
    return this.#modelsArray
  }
}

export default Vladikdb
