<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Toggle from '../ui/Toggle.vue';
import Card from '../ui/Card.vue';

export interface VPNServerConfig {
  enabled: boolean;
  port: number;
  listen_address: string;
  subnet: string;
  dns_servers: string[];
  persistent_keepalive: number;
  mtu: number;
}

const props = defineProps<{
  config: VPNServerConfig;
  loading?: boolean;
}>();

const emit = defineEmits<{
  save: [config: VPNServerConfig];
}>();

const localConfig = ref<VPNServerConfig>({ ...props.config });

const handleSave = () => {
  emit('save', localConfig.value);
};

const dnsServersString = ref(localConfig.value.dns_servers.join(', '));

const updateDnsServers = (value: string) => {
  dnsServersString.value = value;
  localConfig.value.dns_servers = value.split(',').map(s => s.trim()).filter(Boolean);
};
</script>

<template>
  <Card title="WireGuard Server Configuration">
    <div class="space-y-4">
      <Toggle
        v-model="localConfig.enabled"
        label="Enable VPN Server"
      />

      <Input
        v-model="localConfig.port"
        label="Listen Port"
        type="number"
        placeholder="51820"
      />

      <Input
        v-model="localConfig.listen_address"
        label="Listen Address"
        placeholder="0.0.0.0"
        help="IP address to bind to (0.0.0.0 for all interfaces)"
      />

      <Input
        v-model="localConfig.subnet"
        label="VPN Subnet"
        placeholder="10.0.0.0/24"
        help="IP range for VPN clients"
      />

      <Input
        :model-value="dnsServersString"
        label="DNS Servers"
        placeholder="1.1.1.1, 8.8.8.8"
        help="Comma-separated list of DNS servers"
        @update:model-value="updateDnsServers"
      />

      <Input
        v-model="localConfig.persistent_keepalive"
        label="Persistent Keepalive (seconds)"
        type="number"
        placeholder="25"
        help="Keep NAT mappings alive (recommended: 25)"
      />

      <Input
        v-model="localConfig.mtu"
        label="MTU"
        type="number"
        placeholder="1420"
        help="Maximum transmission unit"
      />

      <div class="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="primary"
          :disabled="loading"
          @click="handleSave"
        >
          {{ loading ? 'Saving...' : 'Save Configuration' }}
        </Button>
      </div>
    </div>
  </Card>
</template>
