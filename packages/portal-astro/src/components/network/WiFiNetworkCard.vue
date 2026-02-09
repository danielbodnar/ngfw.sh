<script setup lang="ts">
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Toggle from "../ui/Toggle.vue";

export interface WiFiNetwork {
	id: string;
	ssid: string;
	band: "2.4GHz" | "5GHz";
	channel: number;
	encryption: string;
	password: string;
	hidden: boolean;
	enabled: boolean;
	clients_connected: number;
	vlan_id: number | null;
}

const props = defineProps<{
	network: WiFiNetwork;
}>();

const emit = defineEmits<{
	edit: [network: WiFiNetwork];
	delete: [networkId: string];
	toggle: [networkId: string];
}>();

const statusBadge = computed(() => {
	return props.network.enabled
		? { variant: "success" as const, label: "Active" }
		: { variant: "secondary" as const, label: "Disabled" };
});
</script>

<template>
  <Card>
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <h3 class="text-lg font-semibold text-[--color-text-primary]">
            {{ network.ssid }}
          </h3>
          <Badge :variant="statusBadge.variant">{{ statusBadge.label }}</Badge>
          <Badge v-if="network.hidden" variant="warning">Hidden</Badge>
          <Badge v-if="network.vlan_id" variant="info">VLAN {{ network.vlan_id }}</Badge>
        </div>
        <div class="flex gap-4 text-sm text-[--color-text-secondary]">
          <span>Band: <strong>{{ network.band }}</strong></span>
          <span>Channel: <strong>{{ network.channel }}</strong></span>
          <span>Encryption: <strong>{{ network.encryption }}</strong></span>
          <span>Clients: <strong>{{ network.clients_connected }}</strong></span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Toggle
          :model-value="network.enabled"
          @update:model-value="emit('toggle', network.id)"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <Button variant="secondary" size="sm" @click="emit('edit', network)">
        Edit
      </Button>
      <Button variant="danger" size="sm" @click="emit('delete', network.id)">
        Delete
      </Button>
    </div>
  </Card>
</template>
