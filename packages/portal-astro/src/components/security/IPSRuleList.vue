<script setup lang="ts">
import Badge from "../ui/Badge.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";
import Toggle from "../ui/Toggle.vue";

export interface IPSRule {
	id: string;
	name: string;
	category: string;
	severity: "low" | "medium" | "high" | "critical";
	enabled: boolean;
	signatures: number;
}

const props = defineProps<{
	rules: IPSRule[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	toggle: [ruleId: string];
}>();

const columns = [
	{ key: "name", label: "Rule Name" },
	{ key: "category", label: "Category" },
	{ key: "severity", label: "Severity" },
	{ key: "signatures", label: "Signatures" },
	{ key: "enabled", label: "Enabled" },
];

const getSeverityVariant = (severity: string) => {
	const variants = {
		low: "secondary",
		medium: "warning",
		high: "error",
		critical: "error",
	};
	return variants[severity as keyof typeof variants] || "secondary";
};
</script>

<template>
  <Card title="IPS Rules">
    <Table :columns="columns" :data="rules" :loading="loading">
      <template #cell-name="{ row }">
        <span class="font-medium text-[--color-text-primary]">{{ row.name }}</span>
      </template>

      <template #cell-category="{ row }">
        <Badge variant="info">{{ row.category }}</Badge>
      </template>

      <template #cell-severity="{ row }">
        <Badge :variant="getSeverityVariant(row.severity)">
          {{ row.severity }}
        </Badge>
      </template>

      <template #cell-signatures="{ row }">
        <span class="text-sm text-[--color-text-secondary]">
          {{ row.signatures.toLocaleString() }}
        </span>
      </template>

      <template #cell-enabled="{ row }">
        <Toggle
          :model-value="row.enabled"
          @update:model-value="emit('toggle', row.id)"
        />
      </template>
    </Table>
  </Card>
</template>
