export type IpcMessageType =
  | 'AUTH'
  | 'AUTH_OK'
  | 'AUTH_FAILED'
  | 'COMMAND'
  | 'RESPONSE'
  | 'EVENT'
  | 'PING'
  | 'PONG';

export interface IpcMessage<T = unknown> {
  type: IpcMessageType;
  requestId?: string;
  token?: string;
  action?: string;
  payload?: T;
  error?: string;
  timestamp: string;
}
