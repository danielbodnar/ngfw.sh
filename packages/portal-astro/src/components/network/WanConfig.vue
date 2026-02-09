<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";

export interface WanConfig {
	type: "dhcp" | "static" | "pppoe" | "lte";
	hostname: string;
	mac_clone: string;
	mtu: number;
	// Static IP fields
	ip_address: string;
	netmask: string;
	gateway: string;
	dns_primary: string;
	dns_secondary: string;
	// PPPoE fields
	username: string;
	password: string;
	service_name: string;
	// LTE fields
	apn: string;
	pin: string;
}

const props = defineProps<{
	config: WanConfig;
	loading?: boolean;
}>();

const emit = defineEmits<{
	save: [config: WanConfig];
}>();

const localConfig = ref<WanConfig>({ ...props.config });

const connectionTypes = [
	{ value: "dhcp", label: "DHCP (Automatic)" },
	{ value: "static", label: "Static IP" },
	{ value: "pppoe", label: "PPPoE" },
	{ value: "lte", label: "LTE / Cellular" },
];

const showStaticFields = computed(() => localConfig.value.type === "static");
const showPppoeFields = computed(() => localConfig.value.type === "pppoe");
const showLteFields = computed(() => localConfig.value.type === "lte");

const handleSave = () => {
	emit("save", localConfig.value);
};
</script>

<template>
  <Card title="WAN Configuration">
    <div class="space-y-4">
      <Select
        v-model="localConfig.type"
        label="Connection Type"
        :options="connectionTypes"
      />

      <Input
        v-model="localConfig.hostname"
        label="Hostname"
        placeholder="ngfw-router"
        help="Router hostname for DHCP"
      />

      <Input
        v-model="localConfig.mac_clone"
        label="MAC Address Clone"
        placeholder="00:11:22:33:44:55"
        help="Optional: Clone a specific MAC address"
      />

      <Input
        v-model="localConfig.mtu"
        label="MTU"
        type="number"
        placeholder="1500"
        help="Maximum Transmission Unit"
      />

      <!-- Static IP Fields -->
      <template v-if="showStaticFields">
        <div class="border-t border-[--color-border] pt-4 mt-4">
          <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">Static IP Configuration</h4>
          <div class="space-y-4">
            <Input
              v-model="localConfig.ip_address"
              label="IP Address"
              placeholder="203.0.113.45"
              required
            />
            <Input
              v-model="localConfig.netmask"
              label="Subnet Mask"
              placeholder="255.255.255.0"
              required
            />
            <Input
              v-model="localConfig.gateway"
              label="Gateway"
              placeholder="203.0.113.1"
              required
            />
            <Input
              v-model="localConfig.dns_primary"
              label="Primary DNS"
              placeholder="1.1.1.1"
              required
            />
            <Input
              v-model="localConfig.dns_secondary"
              label="Secondary DNS"
              placeholder="8.8.8.8"
            />
          </div>
        </div>
      </template>

      <!-- PPPoE Fields -->
      <template v-if="showPppoeFields">
        <div class="border-t border-[--color-border] pt-4 mt-4">
          <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">PPPoE Configuration</h4>
          <div class="space-y-4">
            <Input
              v-model="localConfig.username"
              label="Username"
              placeholder="user@isp.com"
              required
            />
            <Input
              v-model="localConfig.password"
              label="Password"
              type="password"
              required
            />
            <Input
              v-model="localConfig.service_name"
              label="Service Name"
              placeholder="Optional"
            />
          </div>
        </div>
      </template>

      <!-- LTE Fields -->
      <template v-if="showLteFields">
        <div class="border-t border-[--color-border] pt-4 mt-4">
          <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">LTE Configuration</h4>
          <div class="space-y-4">
            <Input
              v-model="localConfig.apn"
              label="APN"
              placeholder="internet.carrier.com"
              required
            />
            <Input
              v-model="localConfig.pin"
              label="SIM PIN"
              type="password"
              placeholder="Optional"
            />
          </div>
        </div>
      </template>

      <div class="flex gap-3 pt-4">
        <Button @click="handleSave" :disabled="loading">
          Save Configuration
        </Button>
      </div>
    </div>
  </Card>
</template>
