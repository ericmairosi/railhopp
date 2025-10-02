declare module 'ws' {
  export class WebSocket {
    send: (...args: unknown[]) => void
    close: (...args: unknown[]) => void
    on: (...args: unknown[]) => void
    readyState: number
  }

  export class WebSocketServer<TOptions = unknown> {
    constructor(options?: TOptions)
    on: (...args: unknown[]) => void
    clients: Set<WebSocket>
    close: (...args: unknown[]) => void
  }

  const _default: { WebSocketServer: typeof WebSocketServer; WebSocket: typeof WebSocket }
  export default _default
}
