<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Toggle from '../ui/Toggle.vue';
import Card from '../ui/Card.vue';

export interface DhcpConfig {
  enabled: boolean;
  interface: string;
  start_ip: string;
  end_ip: string;
  lease_time: number;
  dns_servers: string[];
  domain_name: string;
  gateway: string;
}

const props = defineProps<{
  config: DhcpConfig;
  loading?: boolean;
}>();

const emit = defineEmits<{
  save: [config: DhcpConfig];
}>();

const localConfig = ref<DhcpConfig>({ ...props.config });
const dnsServersString = ref(localConfig.value.dns_servers.join(', '));

const updateDnsServers = (value: string) => {
  dnsServersString.value = value;
  localConfig.value.dns_servers = value.split(',').map(s => s.trim()).filter(Boolean);
};

const handleSave = () => {
  emit('save', localConfig.value);
};
</script>

<template>
  <Card title="DHCP Server Configuration">
    <div class="space-y-4">
      <Toggle
        v-model="localConfig.enabled"
        label="Enable DHCP Server"
      />

      <template v-if="localConfig.enabled">
        <Input
          v-model="localConfig.interface"
          label="Interface"
          placeholder="br0"
          help="Bridge interface to serve DHCP on"
          readonly
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model="localConfig.start_ip"
            label="Start IP Address"
            placeholder="192.168.1.100"
            required
          />

          <Input
            v-model="localConfig.end_ip"
            label="End IP Address"
            placeholder="192.168.1.200"
            required
          />
        </div>

        <Input
          v-model="localConfig.lease_time"
          label="Lease Time (seconds)"
          type="number"
          placeholder="86400"
          help="Default: 86400 (24 hours)"
        />

        <Input
          v-model="localConfig.gateway"
          label="Default Gateway"
          placeholder="192.168.1.1"
          required
        />

        <Input
          :model-value="dnsServersString"
          label="DNS Servers"
          placeholder="192.168.1.1, 1.1.1.1"
          help="Comma-separated list of DNS servers"
          @update:model-value="updateDnsServers"
        />

        <Input
          v-model="localConfig.domain_name"
          label="Domain Name"
          placeholder="home.local"
          help="Local domain name for DHCP clients"
        />
      </template>

      <div class="flex gap-3 pt-4">
        <Button @click="handleSave" :disabled="loading">
          Save Configuration
        </Button>
      </div>
    </div>
  </Card>
</template>
