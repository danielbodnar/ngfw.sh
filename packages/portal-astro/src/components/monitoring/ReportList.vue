<script setup lang="ts">
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";

export interface Report {
	id: string;
	name: string;
	type: string;
	date: string;
	status: "completed" | "generating" | "failed";
	fileUrl?: string;
	fileSize?: number;
	progress?: number;
}

const props = defineProps<{
	reports: Report[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	generate: [];
	download: [reportId: string];
	delete: [reportId: string];
}>();

const columns = [
	{ key: "name", label: "Report Name" },
	{ key: "type", label: "Type" },
	{ key: "date", label: "Date" },
	{ key: "status", label: "Status" },
	{ key: "actions", label: "Actions" },
];

const formatFileSize = (bytes?: number): string => {
	if (bytes == null) return "—";
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const getStatusVariant = (status: string) => {
	const variants = {
		completed: "success",
		generating: "warning",
		failed: "error",
	};
	return variants[status as keyof typeof variants] || "secondary";
};
</script>

<template>
  <Card title="Reports">
    <template #actions>
      <Button @click="emit('generate')">Generate Report</Button>
    </template>

    <Table :columns="columns" :data="reports" :loading="loading">
      <template #cell-name="{ row }">
        <span class="font-medium text-[--color-text-primary]">{{ row.name }}</span>
      </template>

      <template #cell-type="{ row }">
        <Badge variant="info">{{ row.type }}</Badge>
      </template>

      <template #cell-date="{ row }">
        <span class="text-sm text-[--color-text-secondary]">{{ row.date }}</span>
      </template>

      <template #cell-status="{ row }">
        <div class="flex items-center gap-2">
          <Badge :variant="getStatusVariant(row.status)">
            {{ row.status }}
          </Badge>
          <span v-if="row.status === 'generating' && row.progress" class="text-xs text-[--color-text-secondary]">
            {{ row.progress }}%
          </span>
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex gap-2">
          <Button
            v-if="row.status === 'completed'"
            variant="secondary"
            size="sm"
            @click="emit('download', row.id)"
          >
            Download ({{ formatFileSize(row.fileSize) }})
          </Button>
          <Button
            variant="danger"
            size="sm"
            @click="emit('delete', row.id)"
          >
            Delete
          </Button>
        </div>
      </template>
    </Table>
  </Card>
</template>
