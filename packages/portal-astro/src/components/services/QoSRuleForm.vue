<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Select from '../ui/Select.vue';
import Toggle from '../ui/Toggle.vue';

export interface QoSRuleFormData {
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
  isOpen: boolean;
  rule?: QoSRuleFormData | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [rule: QoSRuleFormData];
}>();

const formData = ref<QoSRuleFormData>({
  name: '',
  enabled: true,
  priority: 10,
  source: '',
  destination: '',
  protocol: '',
  port: '',
  download_limit: undefined,
  upload_limit: undefined,
  class_type: 'medium',
});

const classOptions = [
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' },
  { value: 'custom', label: 'Custom Limits' },
];

const protocolOptions = [
  { value: '', label: 'Any' },
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
  { value: 'icmp', label: 'ICMP' },
];

watch(() => props.rule, (newRule) => {
  if (newRule) {
    formData.value = { ...newRule };
  } else {
    formData.value = {
      name: '',
      enabled: true,
      priority: 10,
      source: '',
      destination: '',
      protocol: '',
      port: '',
      download_limit: undefined,
      upload_limit: undefined,
      class_type: 'medium',
    };
  }
}, { immediate: true });

const handleSubmit = () => {
  emit('save', formData.value);
};

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="handleClose"
  >
    <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {{ rule ? 'Edit QoS Rule' : 'Add QoS Rule' }}
        </h2>
        <button
          @click="handleClose"
          class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div class="p-6 space-y-4">
        <Input
          v-model="formData.name"
          label="Rule Name"
          placeholder="e.g., Prioritize Video Calls"
          required
        />

        <Input
          v-model="formData.priority"
          label="Priority"
          type="number"
          placeholder="10"
          help="Lower numbers = higher priority (1-100)"
          required
        />

        <Select
          v-model="formData.class_type"
          label="Traffic Class"
          :options="classOptions"
        />

        <div class="grid grid-cols-2 gap-4">
          <Input
            v-model="formData.source"
            label="Source IP/Network"
            placeholder="192.168.1.0/24 or any"
          />

          <Input
            v-model="formData.destination"
            label="Destination IP/Network"
            placeholder="0.0.0.0/0 or any"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <Select
            v-model="formData.protocol"
            label="Protocol"
            :options="protocolOptions"
          />

          <Input
            v-model="formData.port"
            label="Port"
            placeholder="80, 443, 5060-5061"
          />
        </div>

        <div v-if="formData.class_type === 'custom'" class="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <Input
            v-model="formData.download_limit"
            label="Download Limit (Mbps)"
            type="number"
            placeholder="Unlimited"
            help="Leave empty for no limit"
          />

          <Input
            v-model="formData.upload_limit"
            label="Upload Limit (Mbps)"
            type="number"
            placeholder="Unlimited"
            help="Leave empty for no limit"
          />
        </div>

        <Toggle
          v-model="formData.enabled"
          label="Enable Rule"
        />

        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <p class="font-medium mb-1">QoS Classes:</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li><strong>High Priority:</strong> VoIP, video conferencing, gaming (low latency)</li>
            <li><strong>Medium Priority:</strong> Web browsing, streaming video (balanced)</li>
            <li><strong>Low Priority:</strong> Downloads, backups, bulk transfers</li>
            <li><strong>Custom:</strong> Set specific bandwidth limits</li>
          </ul>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="ghost"
          @click="handleClose"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          :disabled="!formData.name || loading"
          @click="handleSubmit"
        >
          {{ loading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule' }}
        </Button>
      </div>
    </div>
  </div>
</template>
