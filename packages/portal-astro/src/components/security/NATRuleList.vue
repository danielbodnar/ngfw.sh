<script setup lang="ts">
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";
import Toggle from "../ui/Toggle.vue";

export interface NATRule {
	id: string;
	name: string;
	type: "port_forward" | "snat" | "dnat" | "masquerade";
	protocol?: string;
	external_port?: number;
	internal_ip?: string;
	internal_port?: number;
	source_ip?: string;
	target_ip?: string;
	enabled: boolean;
}

const props = defineProps<{
	rules: NATRule[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	add: [];
	edit: [rule: NATRule];
	delete: [ruleId: string];
	toggle: [ruleId: string];
}>();

const columns = [
	{ key: "name", label: "Name" },
	{ key: "type", label: "Type" },
	{ key: "details", label: "Details" },
	{ key: "status", label: "Status" },
	{ key: "actions", label: "Actions" },
];

const formatRuleDetails = (rule: NATRule): string => {
	if (rule.type === "port_forward") {
		return `${rule.protocol?.toUpperCase()}:${rule.external_port} → ${rule.internal_ip}:${rule.internal_port}`;
	}
	if (rule.type === "snat") {
		return `${rule.source_ip} → ${rule.target_ip}`;
	}
	if (rule.type === "dnat") {
		return `${rule.external_port} → ${rule.internal_ip}`;
	}
	return rule.type;
};
</script>

<template>
  <Card title="NAT Rules">
    <template #actions>
      <Button @click="emit('add')">Add Rule</Button>
    </template>

    <Table :columns="columns" :data="rules" :loading="loading">
      <template #cell-name="{ row }">
        <span class="font-medium text-[--color-text-primary]">{{ row.name }}</span>
      </template>

      <template #cell-type="{ row }">
        <Badge variant="info">{{ row.type.replace('_', ' ').toUpperCase() }}</Badge>
      </template>

      <template #cell-details="{ row }">
        <code class="text-sm bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ formatRuleDetails(row) }}
        </code>
      </template>

      <template #cell-status="{ row }">
        <Toggle
          :model-value="row.enabled"
          @update:model-value="emit('toggle', row.id)"
        />
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
