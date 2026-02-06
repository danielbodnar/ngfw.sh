<script setup lang="ts">
import Card from '../ui/Card.vue';

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const props = defineProps<{
  dashboards: Dashboard[];
}>();

const navigateToDashboard = (id: string) => {
  window.location.href = `/monitoring/dashboards/${id}`;
};
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="dashboard in dashboards"
      :key="dashboard.id"
      @click="navigateToDashboard(dashboard.id)"
      class="cursor-pointer"
    >
      <Card>
        <div class="p-2">
          <h3 class="text-lg font-semibold text-[--color-text-primary] mb-2">
            {{ dashboard.name }}
          </h3>
          <p class="text-sm text-[--color-text-secondary]">
            {{ dashboard.description }}
          </p>
        </div>
      </Card>
    </div>
  </div>
</template>
