<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Select from '../ui/Select.vue';
import Input from '../ui/Input.vue';
import Card from '../ui/Card.vue';

export interface ReportConfig {
  name: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  format: string;
}

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  generate: [config: ReportConfig];
  cancel: [];
}>();

const name = ref('');
const type = ref('security');
const dateFrom = ref('');
const dateTo = ref('');
const format = ref('pdf');

const reportTypes = [
  { value: 'security', label: 'Security Summary' },
  { value: 'traffic', label: 'Traffic Analysis' },
  { value: 'wifi', label: 'WiFi Performance' },
  { value: 'dns', label: 'DNS Analytics' },
  { value: 'system', label: 'System Health' },
];

const formatOptions = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

const handleGenerate = () => {
  const config: ReportConfig = {
    name: name.value,
    type: type.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    format: format.value,
  };
  emit('generate', config);
};
</script>

<template>
  <Card title="Generate Report">
    <div class="space-y-4">
      <Input
        v-model="name"
        label="Report Name"
        placeholder="Weekly Security Summary"
        required
      />

      <Select
        v-model="type"
        label="Report Type"
        :options="reportTypes"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          v-model="dateFrom"
          label="From Date"
          type="date"
          required
        />

        <Input
          v-model="dateTo"
          label="To Date"
          type="date"
          required
        />
      </div>

      <Select
        v-model="format"
        label="Output Format"
        :options="formatOptions"
      />

      <div class="flex gap-3 pt-4">
        <Button
          @click="handleGenerate"
          :disabled="!name || !dateFrom || !dateTo || loading"
        >
          Generate Report
        </Button>
        <Button variant="secondary" @click="emit('cancel')">Cancel</Button>
      </div>
    </div>
  </Card>
</template>
