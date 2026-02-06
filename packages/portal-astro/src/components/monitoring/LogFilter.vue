<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Select from '../ui/Select.vue';
import Input from '../ui/Input.vue';
import Card from '../ui/Card.vue';

export interface LogFilters {
  level: string;
  category: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

const props = defineProps<{
  filters: LogFilters;
}>();

const emit = defineEmits<{
  update: [filters: Partial<LogFilters>];
  export: [];
}>();

const levelOptions = [
  { value: 'all', label: 'All Levels' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'system', label: 'System' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'wan', label: 'WAN' },
  { value: 'dhcp', label: 'DHCP' },
  { value: 'security', label: 'Security' },
  { value: 'vpn', label: 'VPN' },
];

const updateFilter = (key: keyof LogFilters, value: string) => {
  emit('update', { [key]: value });
};
</script>

<template>
  <Card title="Filter Logs">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Select
        :model-value="filters.level"
        label="Log Level"
        :options="levelOptions"
        @update:model-value="(value) => updateFilter('level', value)"
      />

      <Select
        :model-value="filters.category"
        label="Category"
        :options="categoryOptions"
        @update:model-value="(value) => updateFilter('category', value)"
      />

      <Input
        :model-value="filters.search"
        label="Search Message"
        placeholder="Search logs..."
        @update:model-value="(value) => updateFilter('search', value)"
      />

      <Input
        :model-value="filters.dateFrom"
        label="From Date"
        type="date"
        @update:model-value="(value) => updateFilter('dateFrom', value)"
      />

      <Input
        :model-value="filters.dateTo"
        label="To Date"
        type="date"
        @update:model-value="(value) => updateFilter('dateTo', value)"
      />

      <div class="flex items-end">
        <Button @click="emit('export')" class="w-full">Export Logs</Button>
      </div>
    </div>
  </Card>
</template>
