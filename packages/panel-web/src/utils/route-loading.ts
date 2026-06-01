import { ref } from 'vue';

export const routeLoading = ref(false);

export function startRouteLoading(): void {
  routeLoading.value = true;
}

export function finishRouteLoading(): void {
  routeLoading.value = false;
}

export function resetRouteLoading(): void {
  routeLoading.value = false;
}
