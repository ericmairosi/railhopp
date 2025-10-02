declare module 'stompit' {
  export type ConnectOptions = {
    host: string
    port: number
    connectHeaders: Record<string, string>
  }

  export type Message = {
    readString: (
      encoding: string,
      callback: (error: unknown, body: string) => void
    ) => void
    ack: () => void
  }

  export type Client = {
    on: (event: 'error' | 'disconnect', listener: (...args: unknown[]) => void) => void
    subscribe: (
      headers: { destination: string; ack?: string },
      callback: (error: unknown, message: Message) => void
    ) => void
    disconnect: () => void
  }

  export function connect(
    options: ConnectOptions,
    callback: (error: unknown, client: Client) => void
  ): void
}
