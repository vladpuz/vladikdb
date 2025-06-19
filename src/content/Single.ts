import type { Adapter, Content } from '../core/VladikDB.js'

export class Single<
  Data extends object,
> implements Content<Data> {
  public adapter: Adapter<Data>
  public defaultData: Data

  private data: Data

  public constructor(adapter: Adapter<Data>, defaultData: Data) {
    this.adapter = adapter
    this.defaultData = defaultData

    this.data = defaultData
  }

  public async init(): Promise<void> {
    await this.read()
  }

  public async clear(): Promise<void> {
    this.data = this.defaultData
    await this.write()
  }

  public async read(): Promise<void> {
    this.data = await this.adapter.read() ?? this.defaultData
  }

  public async write(): Promise<void> {
    await this.adapter.write(this.data)
  }

  public getData(): Data {
    return this.data
  }

  public setData(data: Data): void {
    this.data = data
  }
}
