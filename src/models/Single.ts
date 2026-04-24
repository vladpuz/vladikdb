import type { Adapter, Model } from '../core/Vladikdb.ts'

export class Single<
  Data extends object,
> implements Model<Data> {
  #adapter: Adapter<Data>
  #defaultData: Data
  #data: Data
  #hasChanges = false

  constructor(adapter: Adapter<Data>, defaultData: Data) {
    this.#adapter = adapter
    this.#defaultData = defaultData
    this.#data = defaultData
  }

  async read(): Promise<void> {
    const data = await this.#adapter.read() ?? this.#defaultData

    if (Symbol.asyncIterator in data) {
      for await (const chunk of data) {
        for (const object of chunk) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          this.#data = object as Data
        }
      }
      return
    }

    this.#data = data
  }

  async write(force = false): Promise<void> {
    if (!force && !this.#hasChanges) {
      return
    }

    this.#hasChanges = false
    await this.#adapter.write(this.#data)
  }

  getData(): Data {
    return this.#data
  }

  setData(data: Data): void {
    if (this.#data === data) {
      return
    }

    this.#data = data
    this.#hasChanges = true
  }

  reset(): void {
    if (this.#data === this.#defaultData) {
      return
    }

    this.#data = this.#defaultData
    this.#hasChanges = true
  }

  get adapter(): Adapter<Data> {
    return this.#adapter
  }

  get hasChanges(): boolean {
    return this.#hasChanges
  }
}
