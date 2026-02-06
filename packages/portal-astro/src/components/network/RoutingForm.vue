<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Select from '../ui/Select.vue';
import Card from '../ui/Card.vue';
import type { Route } from './RoutingTable.vue';

const props = defineProps<{
  route?: Route | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  save: [route: Route];
  cancel: [];
}>();

const destination = ref(props.route?.destination || '');
const gateway = ref(props.route?.gateway || '');
const interfaceName = ref(props.route?.interface || 'eth0');
const metric = ref(props.route?.metric || 10);
const description = ref(props.route?.description || '');

const interfaceOptions = [
  { value: 'eth0', label: 'eth0 - WAN' },
  { value: 'eth1', label: 'eth1 - LAN1' },
  { value: 'eth2', label: 'eth2 - LAN2' },
  { value: 'br0', label: 'br0 - Bridge' },
  { value: 'wg0', label: 'wg0 - VPN' },
];

const handleSave = () => {
  const route: Route = {
    id: props.route?.id || Date.now().toString(),
    destination: destination.value,
    gateway: gateway.value,
    interface: interfaceName.value,
    metric: Number(metric.value),
    description: description.value,
  };
  emit('save', route);
};
</script>

<template>
  <Card :title="route ? 'Edit Route' : 'Add Route'">
    <div class="space-y-4">
      <Input
        v-model="destination"
        label="Destination Network"
        placeholder="192.168.100.0/24"
        help="CIDR notation (e.g., 192.168.100.0/24)"
        required
      />

      <Input
        v-model="gateway"
        label="Gateway IP"
        placeholder="192.168.1.254"
        help="IP address of the gateway/next hop"
        required
      />

      <Select
        v-model="interfaceName"
        label="Interface"
        :options="interfaceOptions"
        help="Network interface to use"
      />

      <Input
        v-model="metric"
        label="Metric"
        type="number"
        placeholder="10"
        help="Route priority (lower values take precedence)"
      />

      <Input
        v-model="description"
        label="Description"
        placeholder="Remote office network"
        help="Optional description for this route"
      />

      <div class="flex gap-3 pt-2">
        <Button @click="handleSave" :disabled="!destination || !gateway || loading">
          {{ route ? 'Update Route' : 'Add Route' }}
        </Button>
        <Button variant="secondary" @click="emit('cancel')">Cancel</Button>
      </div>
    </div>
  </Card>
</template>
