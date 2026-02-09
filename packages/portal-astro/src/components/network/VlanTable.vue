<script setup lang="ts">
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";

export interface Vlan {
	id: string;
	vlan_id: number;
	name: string;
	interface: string;
	ip_address: string;
	netmask: string;
	dhcp_enabled: boolean;
	isolated: boolean;
}

const props = defineProps<{
	vlans: Vlan[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	add: [];
	edit: [vlan: Vlan];
	delete: [vlanId: string];
}>();

const columns = [
	{ key: "vlan_id", label: "VLAN ID" },
	{ key: "name", label: "Name" },
	{ key: "interface", label: "Interface" },
	{ key: "ip_address", label: "IP Address" },
	{ key: "dhcp_enabled", label: "DHCP" },
	{ key: "isolated", label: "Isolated" },
	{ key: "actions", label: "Actions" },
];
</script>

<template>
  <Card title="VLANs">
    <template #actions>
      <Button @click="emit('add')">Add VLAN</Button>
    </template>

    <Table :columns="columns" :data="vlans" :loading="loading">
      <template #cell-vlan_id="{ row }">
        <span class="font-mono text-sm font-medium text-[--color-text-primary]">
          {{ row.vlan_id }}
        </span>
      </template>

      <template #cell-name="{ row }">
        <span class="font-medium text-[--color-text-primary]">{{ row.name }}</span>
      </template>

      <template #cell-interface="{ row }">
        <code class="text-xs bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.interface }}
        </code>
      </template>

      <template #cell-ip_address="{ row }">
        <code class="text-sm bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.ip_address }}/{{ row.netmask }}
        </code>
      </template>

      <template #cell-dhcp_enabled="{ row }">
        <Badge :variant="row.dhcp_enabled ? 'success' : 'secondary'">
          {{ row.dhcp_enabled ? 'Enabled' : 'Disabled' }}
        </Badge>
      </template>

      <template #cell-isolated="{ row }">
        <Badge :variant="row.isolated ? 'warning' : 'secondary'">
          {{ row.isolated ? 'Yes' : 'No' }}
        </Badge>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex gap-2">
          <Button variant="secondary" size="sm" @click="emit('edit', row)">Edit</Button>
          <Button variant="danger" size="sm" @click="emit('delete', row.id)">Delete</Button>
        </div>
      </template>
    </Table>
  </Card>
</template>
