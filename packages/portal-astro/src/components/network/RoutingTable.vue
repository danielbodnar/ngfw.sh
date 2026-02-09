<script setup lang="ts">
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Table from "../ui/Table.vue";

export interface Route {
	id: string;
	destination: string;
	gateway: string;
	interface: string;
	metric: number;
	description?: string;
}

const props = defineProps<{
	routes: Route[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	add: [];
	edit: [route: Route];
	delete: [routeId: string];
}>();

const columns = [
	{ key: "destination", label: "Destination" },
	{ key: "gateway", label: "Gateway" },
	{ key: "interface", label: "Interface" },
	{ key: "metric", label: "Metric" },
	{ key: "description", label: "Description" },
	{ key: "actions", label: "Actions" },
];
</script>

<template>
  <Card title="Static Routes">
    <template #actions>
      <Button @click="emit('add')">Add Route</Button>
    </template>

    <Table :columns="columns" :data="routes" :loading="loading">
      <template #cell-destination="{ row }">
        <code class="text-sm bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.destination }}
        </code>
      </template>

      <template #cell-gateway="{ row }">
        <code class="text-sm bg-[--color-surface-secondary] px-2 py-1 rounded">
          {{ row.gateway }}
        </code>
      </template>

      <template #cell-interface="{ row }">
        <span class="text-sm text-[--color-text-secondary]">{{ row.interface }}</span>
      </template>

      <template #cell-metric="{ row }">
        <span class="text-sm text-[--color-text-secondary]">{{ row.metric }}</span>
      </template>

      <template #cell-description="{ row }">
        <span class="text-sm text-[--color-text-secondary]">{{ row.description || '—' }}</span>
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
