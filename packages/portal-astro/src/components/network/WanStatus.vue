<script setup lang="ts">
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Card from "../ui/Card.vue";
import Stat from "../ui/Stat.vue";

export interface WanStatus {
	connected: boolean;
	uptime: string;
	interface: string;
	ip_address: string;
	gateway: string;
	dns_servers: string[];
	rx_bytes: number;
	tx_bytes: number;
	rx_packets: number;
	tx_packets: number;
}

const props = defineProps<{
	status: WanStatus;
}>();

const formatBytes = (bytes: number): string => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	return `${value.toFixed(2)} ${units[unitIndex]}`;
};

const statusBadge = computed(() => {
	return props.status.connected
		? { variant: "success" as const, label: "Connected" }
		: { variant: "error" as const, label: "Disconnected" };
});
</script>

<template>
  <Card title="WAN Status">
    <template #actions>
      <Badge :variant="statusBadge.variant">{{ statusBadge.label }}</Badge>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Stat label="Uptime" :value="status.uptime" />
      <Stat label="Interface" :value="status.interface" />
      <Stat label="IP Address" :value="status.ip_address" />
      <Stat label="Gateway" :value="status.gateway" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 class="text-sm font-medium text-[--color-text-secondary] mb-3">Traffic Statistics</h4>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-sm text-[--color-text-secondary]">Downloaded:</span>
            <span class="text-sm font-medium text-[--color-text-primary]">
              {{ formatBytes(status.rx_bytes) }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-[--color-text-secondary]">Uploaded:</span>
            <span class="text-sm font-medium text-[--color-text-primary]">
              {{ formatBytes(status.tx_bytes) }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-[--color-text-secondary]">RX Packets:</span>
            <span class="text-sm font-medium text-[--color-text-primary]">
              {{ status.rx_packets.toLocaleString() }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-[--color-text-secondary]">TX Packets:</span>
            <span class="text-sm font-medium text-[--color-text-primary]">
              {{ status.tx_packets.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-sm font-medium text-[--color-text-secondary] mb-3">DNS Servers</h4>
        <div class="space-y-2">
          <div
            v-for="(dns, index) in status.dns_servers"
            :key="index"
            class="text-sm text-[--color-text-primary]"
          >
            <code class="bg-[--color-surface-secondary] px-2 py-1 rounded">{{ dns }}</code>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
