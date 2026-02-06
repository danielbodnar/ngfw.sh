<script setup lang="ts">
import { computed } from 'vue';
import Button from '../ui/Button.vue';
import Badge from '../ui/Badge.vue';
import Card from '../ui/Card.vue';
import Toggle from '../ui/Toggle.vue';

export interface QoSRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  source?: string;
  destination?: string;
  protocol?: string;
  port?: string;
  download_limit?: number;
  upload_limit?: number;
  class_type: 'high' | 'medium' | 'low' | 'custom';
}

const props = defineProps<{
  rules: QoSRule[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  add: [];
  edit: [rule: QoSRule];
  delete: [ruleId: string];
  toggle: [ruleId: string, enabled: boolean];
  reorder: [rules: QoSRule[]];
}>();

const formatBandwidth = (mbps?: number) => {
  if (!mbps) return 'Unlimited';
  return `${mbps} Mbps`;
};

const getClassBadge = (classType: QoSRule['class_type']) => {
  const badges = {
    high: { variant: 'success' as const, text: 'High Priority' },
    medium: { variant: 'warning' as const, text: 'Medium Priority' },
    low: { variant: 'default' as const, text: 'Low Priority' },
    custom: { variant: 'default' as const, text: 'Custom' },
  };
  return badges[classType];
};
</script>

<template>
  <Card title="QoS Traffic Shaping Rules">
    <template #actions>
      <Button
        size="sm"
        variant="primary"
        @click="emit('add')"
      >
        Add Rule
      </Button>
    </template>

    <div v-if="loading" class="text-center py-8 text-slate-500">
      Loading rules...
    </div>

    <div v-else-if="rules.length === 0" class="text-center py-8 text-slate-500">
      <p class="mb-2">No QoS rules configured.</p>
      <p class="text-sm">Click "Add Rule" to create traffic shaping rules.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-800">
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Priority</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Name</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Match</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Class</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Limits</th>
            <th class="text-center py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Enabled</th>
            <th class="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="rule in rules"
            :key="rule.id"
            class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <td class="py-3 px-4">
              <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ rule.priority }}</span>
            </td>
            <td class="py-3 px-4">
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ rule.name }}</div>
            </td>
            <td class="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
              <div v-if="rule.source" class="truncate">Src: {{ rule.source }}</div>
              <div v-if="rule.destination" class="truncate">Dst: {{ rule.destination }}</div>
              <div v-if="rule.protocol || rule.port">
                {{ rule.protocol || 'any' }}{{ rule.port ? `:${rule.port}` : '' }}
              </div>
            </td>
            <td class="py-3 px-4">
              <Badge :variant="getClassBadge(rule.class_type).variant">
                {{ getClassBadge(rule.class_type).text }}
              </Badge>
            </td>
            <td class="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
              <div>↓ {{ formatBandwidth(rule.download_limit) }}</div>
              <div>↑ {{ formatBandwidth(rule.upload_limit) }}</div>
            </td>
            <td class="py-3 px-4 text-center">
              <Toggle
                :model-value="rule.enabled"
                @update:model-value="emit('toggle', rule.id, $event)"
              />
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  @click="emit('edit', rule)"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  @click="emit('delete', rule.id)"
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="rules.length > 0" class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
      <p class="font-medium">Priority Order</p>
      <p>Rules are evaluated in priority order (1 = highest). Lower priority rules are evaluated first.</p>
    </div>
  </Card>
</template>
