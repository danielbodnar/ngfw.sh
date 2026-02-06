<script setup lang="ts">
import { computed } from 'vue';
import Card from '../ui/Card.vue';
import Table from '../ui/Table.vue';
import Badge from '../ui/Badge.vue';
import Button from '../ui/Button.vue';

export interface IPSAlert {
  id: string;
  timestamp: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source_ip: string;
  destination_ip: string;
  action: 'blocked' | 'logged';
  details: string;
}

const props = defineProps<{
  alerts: IPSAlert[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  dismiss: [alertId: string];
}>();

const columns = [
  { key: 'timestamp', label: 'Time' },
  { key: 'rule', label: 'Rule' },
  { key: 'severity', label: 'Severity' },
  { key: 'source_ip', label: 'Source' },
  { key: 'destination_ip', label: 'Destination' },
  { key: 'action', label: 'Action' },
  { key: 'actions_col', label: 'Actions' },
];

const getSeverityVariant = (severity: string) => {
  const variants = {
    low: 'secondary',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  };
  return variants[severity as keyof typeof variants] || 'secondary';
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};
</script>

<template>
  <Card title="Recent IPS Alerts">
    <Table :columns="columns" :data="alerts" :loading="loading">
      <template #cell-timestamp="{ row }">
        <span class="text-sm text-[--color-text-secondary]">
          {{ formatTime(row.timestamp) }}
        </span>
      </template>

      <template #cell-rule="{ row }">
        <div>
          <div class="font-medium text-[--color-text-primary]">{{ row.rule }}</div>
          <div class="text-xs text-[--color-text-secondary]">{{ row.details }}</div>
        </div>
      </template>

      <template #cell-severity="{ row }">
        <Badge :variant="getSeverityVariant(row.severity)">
          {{ row.severity }}
        </Badge>
      </template>

      <template #cell-source_ip="{ row }">
        <code class="text-xs bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.source_ip }}
        </code>
      </template>

      <template #cell-destination_ip="{ row }">
        <code class="text-xs bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.destination_ip }}
        </code>
      </template>

      <template #cell-action="{ row }">
        <Badge :variant="row.action === 'blocked' ? 'error' : 'warning'">
          {{ row.action }}
        </Badge>
      </template>

      <template #cell-actions_col="{ row }">
        <Button variant="secondary" size="sm" @click="emit('dismiss', row.id)">
          Dismiss
        </Button>
      </template>
    </Table>
  </Card>
</template>
