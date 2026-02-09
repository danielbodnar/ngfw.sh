<script setup lang="ts">
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";

export interface DhcpLease {
	id: string;
	hostname: string;
	ip_address: string;
	mac_address: string;
	expires: string;
	static: boolean;
}

const props = defineProps<{
	leases: DhcpLease[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	makeStatic: [leaseId: string];
	release: [leaseId: string];
}>();

const columns = [
	{ key: "hostname", label: "Hostname" },
	{ key: "ip_address", label: "IP Address" },
	{ key: "mac_address", label: "MAC Address" },
	{ key: "expires", label: "Expires" },
	{ key: "type", label: "Type" },
	{ key: "actions", label: "Actions" },
];

const formatExpires = (expires: string): string => {
	if (expires === "Never") return "Never";

	const date = new Date(expires);
	const now = new Date();
	const diff = date.getTime() - now.getTime();

	if (diff < 0) return "Expired";

	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 24) {
		const days = Math.floor(hours / 24);
		return `${days}d ${hours % 24}h`;
	}

	return `${hours}h ${minutes}m`;
};
</script>

<template>
  <Card title="DHCP Leases">
    <Table :columns="columns" :data="leases" :loading="loading">
      <template #cell-hostname="{ row }">
        <span class="font-medium text-[--color-text-primary]">{{ row.hostname }}</span>
      </template>

      <template #cell-ip_address="{ row }">
        <code class="text-sm bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.ip_address }}
        </code>
      </template>

      <template #cell-mac_address="{ row }">
        <code class="text-xs bg-[--color-surface-secondary] px-2 py-1 rounded font-mono">
          {{ row.mac_address }}
        </code>
      </template>

      <template #cell-expires="{ row }">
        <span class="text-sm text-[--color-text-secondary]">
          {{ formatExpires(row.expires) }}
        </span>
      </template>

      <template #cell-type="{ row }">
        <Badge :variant="row.static ? 'success' : 'secondary'">
          {{ row.static ? 'Static' : 'Dynamic' }}
        </Badge>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex gap-2">
          <Button
            v-if="!row.static"
            variant="secondary"
            size="sm"
            @click="emit('makeStatic', row.id)"
          >
            Make Static
          </Button>
          <Button
            variant="danger"
            size="sm"
            @click="emit('release', row.id)"
          >
            Release
          </Button>
        </div>
      </template>
    </Table>
  </Card>
</template>
