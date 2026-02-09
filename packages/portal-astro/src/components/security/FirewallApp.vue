<script setup lang="ts">
import { ref } from "vue";
import Badge from "../ui/Badge.vue";
import Card from "../ui/Card.vue";

// Mock firewall rules for display purposes
// In production, this would come from a useFirewall composable
const mockRules = ref([
	{
		id: "1",
		name: "Allow HTTP/HTTPS",
		zone_from: "WAN",
		zone_to: "LAN",
		protocol: "tcp",
		ports: "80,443",
		action: "accept",
		enabled: true,
	},
	{
		id: "2",
		name: "Block Telnet",
		zone_from: "ANY",
		zone_to: "ANY",
		protocol: "tcp",
		ports: "23",
		action: "reject",
		enabled: true,
	},
	{
		id: "3",
		name: "Allow DNS",
		zone_from: "LAN",
		zone_to: "WAN",
		protocol: "udp",
		ports: "53",
		action: "accept",
		enabled: true,
	},
	{
		id: "4",
		name: "Allow SSH",
		zone_from: "LAN",
		zone_to: "WAN",
		protocol: "tcp",
		ports: "22",
		action: "accept",
		enabled: true,
	},
	{
		id: "5",
		name: "Block SMB",
		zone_from: "WAN",
		zone_to: "ANY",
		protocol: "tcp",
		ports: "445",
		action: "reject",
		enabled: true,
	},
]);

// Get action badge variant
const getActionVariant = (action: string): "success" | "danger" | "warning" => {
	if (action === "accept") return "success";
	if (action === "reject" || action === "drop") return "danger";
	return "warning";
};

// Get protocol display
const getProtocolDisplay = (protocol: string): string => {
	return protocol.toUpperCase();
};
</script>

<template>
  <div class="space-y-6">
    <!-- Info Banner -->
    <div
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
    >
      <div class="flex items-start">
        <svg
          class="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="ml-3">
          <h3 class="text-blue-800 dark:text-blue-200 font-medium text-sm">
            Firewall API Integration Coming Soon
          </h3>
          <p class="text-blue-700 dark:text-blue-300 mt-1 text-sm">
            The firewall rules API endpoint is currently under development. The table below shows example rules for demonstration purposes.
          </p>
        </div>
      </div>
    </div>

    <!-- Firewall Rules Card -->
    <Card>
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Firewall Rules
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure firewall rules, zones, and policies
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead
            class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
          >
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                From Zone
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                To Zone
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Protocol
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Ports
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Action
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr
              v-for="rule in mockRules"
              :key="rule.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                {{ rule.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge variant="info">
                  {{ rule.zone_from }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge variant="info">
                  {{ rule.zone_to }}
                </Badge>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
              >
                {{ getProtocolDisplay(rule.protocol) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <code
                  class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300"
                >
                  {{ rule.ports }}
                </code>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="getActionVariant(rule.action)">
                  {{ rule.action.toUpperCase() }}
                </Badge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <Badge :variant="rule.enabled ? 'success' : 'secondary'">
                  {{ rule.enabled ? 'Enabled' : 'Disabled' }}
                </Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
