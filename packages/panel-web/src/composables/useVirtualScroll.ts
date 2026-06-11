import { ref, computed, watch, nextTick, type Ref } from 'vue';

export interface VirtualScrollOptions {
  items: Ref<Array<{ kind: string; id: string; m?: unknown }>>;
  container: Ref<HTMLElement | null>;
  threshold?: number;
  buffer?: number;
  estimatedHeight?: number;
}

export function useVirtualScroll(options: VirtualScrollOptions) {
  const {
    items,
    container,
    threshold = 50,
    buffer = 10,
    estimatedHeight = 120,
  } = options;

  const scrollTop = ref(0);
  const containerHeight = ref(600);
  const itemHeights = ref<Map<string, number>>(new Map());
  const measuredCount = ref(0);

  const shouldVirtualize = computed(() => items.value.length > threshold);

  const itemOffsets = computed(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const item of items.value) {
      offsets.push(acc);
      acc += itemHeights.value.get(item.id) ?? estimatedHeight;
    }
    return offsets;
  });

  const totalHeight = computed(() => {
    if (itemOffsets.value.length === 0) return 0;
    const lastOffset = itemOffsets.value[itemOffsets.value.length - 1];
    const lastHeight = itemHeights.value.get(items.value[items.value.length - 1]?.id ?? '') ?? estimatedHeight;
    return lastOffset + lastHeight;
  });

  const visibleRange = computed(() => {
    if (!shouldVirtualize.value) {
      return { start: 0, end: items.value.length };
    }

    const scroll = scrollTop.value;
    const viewHeight = containerHeight.value;

    let start = 0;
    for (let i = 0; i < itemOffsets.value.length; i++) {
      if (itemOffsets.value[i] + (itemHeights.value.get(items.value[i]?.id ?? '') ?? estimatedHeight) >= scroll) {
        start = i;
        break;
      }
    }

    let end = start;
    for (let i = start; i < itemOffsets.value.length; i++) {
      if (itemOffsets.value[i] > scroll + viewHeight) {
        end = i;
        break;
      }
      end = i + 1;
    }

    start = Math.max(0, start - buffer);
    end = Math.min(items.value.length, end + buffer);

    return { start, end };
  });

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value;
    return items.value.slice(start, end).map((item, idx) => ({
      ...item,
      _virtualIndex: start + idx,
      _offsetTop: itemOffsets.value[start + idx] ?? 0,
    }));
  });

  const spacerTop = computed(() => {
    if (!shouldVirtualize.value) return 0;
    const { start } = visibleRange.value;
    return itemOffsets.value[start] ?? 0;
  });

  const spacerBottom = computed(() => {
    if (!shouldVirtualize.value) return 0;
    const { end } = visibleRange.value;
    if (end >= items.value.length) return 0;
    const bottomOffset = itemOffsets.value[end] ?? totalHeight.value;
    return totalHeight.value - bottomOffset;
  });

  function onScroll(): void {
    const el = container.value;
    if (!el) return;
    scrollTop.value = el.scrollTop;
  }

  function measureItem(id: string, height: number): void {
    if (itemHeights.value.get(id) === height) return;
    const newMap = new Map(itemHeights.value);
    newMap.set(id, height);
    itemHeights.value = newMap;
  }

  function updateContainerHeight(): void {
    const el = container.value;
    if (!el) return;
    containerHeight.value = el.clientHeight;
  }

  watch(container, (el) => {
    if (!el) return;
    containerHeight.value = el.clientHeight;
    const ro = new ResizeObserver(() => {
      containerHeight.value = el.clientHeight;
    });
    ro.observe(el);
  }, { immediate: true });

  return {
    shouldVirtualize,
    visibleItems,
    spacerTop,
    spacerBottom,
    totalHeight,
    onScroll,
    measureItem,
    updateContainerHeight,
  };
}
