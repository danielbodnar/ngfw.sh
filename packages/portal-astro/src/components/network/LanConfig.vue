<script setup lang="ts">
import { ref } from "vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Toggle from "../ui/Toggle.vue";

export interface LanConfig {
	interface: string;
	ip_address: string;
	netmask: string;
	dhcp_enabled: boolean;
	dhcp_start: string;
	dhcp_end: string;
	lease_time: number;
}

const props = defineProps<{
	config: LanConfig;
	loading?: boolean;
}>();

const emit = defineEmits<{
	save: [config: LanConfig];
}>();

const localConfig = ref<LanConfig>({ ...props.config });

const handleSave = () => {
	emit("save", localConfig.value);
};
</script>

<template>
  <Card title="LAN Configuration">
    <div class="space-y-4">
      <Input
        v-model="localConfig.interface"
        label="Interface"
        placeholder="br0"
        help="Bridge interface name"
        readonly
      />

      <Input
        v-model="localConfig.ip_address"
        label="IP Address"
        placeholder="192.168.1.1"
        required
      />

      <Input
        v-model="localConfig.netmask"
        label="Subnet Mask"
        placeholder="255.255.255.0"
        required
      />

      <div class="border-t border-[--color-border] pt-4 mt-4">
        <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">DHCP Server</h4>

        <div class="space-y-4">
          <Toggle
            v-model="localConfig.dhcp_enabled"
            label="Enable DHCP Server"
          />

          <template v-if="localConfig.dhcp_enabled">
            <Input
              v-model="localConfig.dhcp_start"
              label="DHCP Start Address"
              placeholder="192.168.1.100"
              required
            />

            <Input
              v-model="localConfig.dhcp_end"
              label="DHCP End Address"
              placeholder="192.168.1.200"
              required
            />

            <Input
              v-model="localConfig.lease_time"
              label="Lease Time (seconds)"
              type="number"
              placeholder="86400"
              help="Default: 86400 (24 hours)"
            />
          </template>
        </div>
      </div>

      <div class="flex gap-3 pt-4">
        <Button @click="handleSave" :disabled="loading">
          Save Configuration
        </Button>
      </div>
    </div>
  </Card>
</template>
