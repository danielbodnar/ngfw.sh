<script setup lang="ts">
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";

export interface LogEntry {
	id: string;
	timestamp: string;
	level: "info" | "warning" | "error" | "critical";
	category: string;
	message: string;
}

const props = defineProps<{
	logs: LogEntry[];
	loading?: boolean;
}>();

const columns = [
	{ key: "timestamp", label: "Time" },
	{ key: "level", label: "Level" },
	{ key: "category", label: "Category" },
	{ key: "message", label: "Message" },
];

const getLevelVariant = (level: string) => {
	const variants = {
		info: "secondary",
		warning: "warning",
		error: "error",
		critical: "error",
	};
	return variants[level as keyof typeof variants] || "secondary";
};

const formatTime = (timestamp: string): string => {
	const date = new Date(timestamp);
	return date.toLocaleTimeString();
};
</script>

<template>
  <Card title="System Logs">
    <Table :columns="columns" :data="logs" :loading="loading">
      <template #cell-timestamp="{ row }">
        <span class="text-sm text-[--color-text-secondary] font-mono">
          {{ formatTime(row.timestamp) }}
        </span>
      </template>

      <template #cell-level="{ row }">
        <Badge :variant="getLevelVariant(row.level)">
          {{ row.level.toUpperCase() }}
        </Badge>
      </template>

      <template #cell-category="{ row }">
        <Badge variant="info">{{ row.category }}</Badge>
      </template>

      <template #cell-message="{ row }">
        <span class="text-sm text-[--color-text-primary]">{{ row.message }}</span>
      </template>
    </Table>
  </Card>
</template>
