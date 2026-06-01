import { shallowRef } from 'vue';

export const routeError = shallowRef<Error | null>(null);

export function setRouteError(err: unknown): void {
  routeError.value = err instanceof Error ? err : new Error(String(err));
}

export function clearRouteError(): void {
  routeError.value = null;
}
