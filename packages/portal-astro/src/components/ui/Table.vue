<script setup lang="ts" generic="T extends Record<string, unknown>">
import { ref, computed } from 'vue';

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  sortKey?: keyof T;
  sortOrder?: 'asc' | 'desc';
  hoverable?: boolean;
}

const props = withDefaults(defineProps<TableProps<T>>(), {
  hoverable: true,
});

const emit = defineEmits<{
  rowClick: [row: T];
  sort: [key: keyof T, order: 'asc' | 'desc'];
}>();

const currentSortKey = ref<keyof T | undefined>(props.sortKey);
const currentSortOrder = ref<'asc' | 'desc'>(props.sortOrder || 'asc');

const sortedData = computed(() => {
  if (!currentSortKey.value) {
    return props.data;
  }

  return [...props.data].sort((a, b) => {
    const aVal = a[currentSortKey.value!];
    const bVal = b[currentSortKey.value!];

    let comparison = 0;
    if (aVal > bVal) comparison = 1;
    if (aVal < bVal) comparison = -1;

    return currentSortOrder.value === 'asc' ? comparison : -comparison;
  });
});

const handleSort = (column: TableColumn<T>) => {
  if (!column.sortable) return;

  if (currentSortKey.value === column.key) {
    currentSortOrder.value = currentSortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortKey.value = column.key;
    currentSortOrder.value = 'asc';
  }

  emit('sort', currentSortKey.value, currentSortOrder.value);
};

const handleRowClick = (row: T) => {
  emit('rowClick', row);
};

const getAlignment = (align?: 'left' | 'center' | 'right') => {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
};
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-800">
          <th
            v-for="column in columns"
            :key="String(column.key)"
            :class="[
              'px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100',
              getAlignment(column.align),
              column.sortable ? 'cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50' : '',
            ]"
            :style="column.width ? { width: column.width } : undefined"
            @click="handleSort(column)"
          >
            <div class="flex items-center gap-2" :class="getAlignment(column.align)">
              <span>{{ column.label }}</span>
              <span v-if="column.sortable && currentSortKey === column.key" class="text-slate-500">
                {{ currentSortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in sortedData"
          :key="index"
          :class="[
            'border-b border-slate-200 dark:border-slate-800 last:border-0',
            hoverable ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer' : '',
          ]"
          @click="handleRowClick(row)"
        >
          <td
            v-for="column in columns"
            :key="String(column.key)"
            :class="['px-4 py-3 text-sm text-slate-700 dark:text-slate-300', getAlignment(column.align)]"
          >
            <slot :name="`cell-${String(column.key)}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="data.length === 0" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      No data available
    </div>
  </div>
</template>
