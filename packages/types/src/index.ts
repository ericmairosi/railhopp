// Main exports for @railhopp/types package

export * from './railway';
export * from './api';

// Re-export common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Common enums
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

export enum CacheStrategy {
  STALE_WHILE_REVALIDATE = 'swr',
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  NO_CACHE = 'no-cache'
}
