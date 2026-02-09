<script setup lang="ts">
import { onMounted, ref } from "vue";
import Card from "../ui/Card.vue";
import Spinner from "../ui/Spinner.vue";

const props = defineProps<{
	dashboardId?: string;
}>();

const loading = ref(true);
const dashboardName = ref("");

onMounted(() => {
	// Simulated loading
	setTimeout(() => {
		dashboardName.value = getDashboardName(props.dashboardId || "");
		loading.value = false;
	}, 500);
});

const getDashboardName = (id: string): string => {
	const names: Record<string, string> = {
		"network-overview": "Network Overview",
		"security-events": "Security Events",
		"dns-analytics": "DNS Analytics",
		"wifi-performance": "WiFi Performance",
		"wan-health": "WAN Health",
		"vpn-metrics": "VPN Metrics",
		"system-resources": "System Resources",
		"traffic-analysis": "Traffic Analysis",
		"firewall-rules": "Firewall Rules",
		"qos-metrics": "QoS Metrics",
	};
	return names[id] || "Dashboard";
};
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center py-12">
    <Spinner size="lg" />
  </div>
  <div v-else class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold text-[--color-text-primary] mb-1">
        {{ dashboardName }}
      </h2>
      <p class="text-[--color-text-secondary]">
        Detailed metrics and analytics
      </p>
    </div>

    <Card title="Dashboard Metrics">
      <div class="text-center py-12 text-[--color-text-secondary]">
        Interactive dashboard will be rendered here with Grafana integration
      </div>
    </Card>
  </div>
</template>
