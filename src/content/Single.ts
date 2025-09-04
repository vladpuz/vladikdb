import type { Adapter, Content } from '../core/VladikDB.js'

export class Single<
  Data extends object,
> implements Content<Data> {
  public readonly adapter: Adapter<Data>
  public readonly defaultData: Data

  private data: Data
  private hasChanges = false

  public constructor(adapter: Adapter<Data>, defaultData: Data) {
    this.adapter = adapter
    this.defaultData = defaultData

    this.data = defaultData
  }

  public async read(): Promise<void> {
    this.data = await this.adapter.read() ?? this.defaultData
  }

  public async write(force = false): Promise<void> {
    if (!force && !this.hasChanges) {
      return
    }

    this.hasChanges = false
    await this.adapter.write(this.data)
  }

  public getData(): Data {
    return this.data
  }

  public setData(data: Data): void {
    this.data = data
    this.hasChanges = true
  }
}
