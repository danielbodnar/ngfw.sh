<script setup lang="ts">
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";

export interface VPNClientProfile {
	id: string;
	name: string;
	endpoint: string;
	allowed_ips: string[];
	enabled: boolean;
	status: "connected" | "disconnected" | "connecting";
	connected_since?: number;
	rx_bytes?: number;
	tx_bytes?: number;
}

const props = defineProps<{
	profiles: VPNClientProfile[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	add: [];
	edit: [profile: VPNClientProfile];
	delete: [profileId: string];
	connect: [profileId: string];
	disconnect: [profileId: string];
}>();

const formatBytes = (bytes?: number) => {
	if (bytes == null) return "N/A";
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
	if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
	if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
	return `${bytes} B`;
};

const formatDuration = (timestamp?: number) => {
	if (!timestamp) return "N/A";
	const now = Date.now() / 1000;
	const diff = now - timestamp;
	const hours = Math.floor(diff / 3600);
	const minutes = Math.floor((diff % 3600) / 60);
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

const getStatusBadge = (status: VPNClientProfile["status"]) => {
	const badges = {
		connected: { variant: "success" as const, text: "Connected" },
		disconnected: { variant: "default" as const, text: "Disconnected" },
		connecting: { variant: "warning" as const, text: "Connecting..." },
	};
	return badges[status];
};
</script>

<template>
  <Card title="VPN Client Profiles">
    <template #actions>
      <Button
        size="sm"
        variant="primary"
        @click="emit('add')"
      >
        Add Profile
      </Button>
    </template>

    <div v-if="loading" class="text-center py-8 text-slate-500">
      Loading profiles...
    </div>

    <div v-else-if="profiles.length === 0" class="text-center py-8 text-slate-500">
      No VPN profiles configured. Click "Add Profile" to connect to a VPN server.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="profile in profiles"
        :key="profile.id"
        class="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h3 class="font-medium text-slate-900 dark:text-slate-100">{{ profile.name }}</h3>
            <Badge :variant="getStatusBadge(profile.status).variant">
              {{ getStatusBadge(profile.status).text }}
            </Badge>
          </div>
          <div class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <div>Endpoint: {{ profile.endpoint }}</div>
            <div>Allowed IPs: {{ profile.allowed_ips.join(', ') }}</div>
            <div v-if="profile.status === 'connected'" class="flex gap-4">
              <span>Connected for: {{ formatDuration(profile.connected_since) }}</span>
              <span>↓ {{ formatBytes(profile.rx_bytes) }}</span>
              <span>↑ {{ formatBytes(profile.tx_bytes) }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 ml-4">
          <Button
            v-if="profile.status === 'disconnected'"
            size="sm"
            variant="primary"
            :disabled="!profile.enabled"
            @click="emit('connect', profile.id)"
          >
            Connect
          </Button>
          <Button
            v-else-if="profile.status === 'connected'"
            size="sm"
            variant="danger"
            @click="emit('disconnect', profile.id)"
          >
            Disconnect
          </Button>
          <Button
            v-else
            size="sm"
            variant="ghost"
            disabled
          >
            Connecting...
          </Button>
          <Button
            size="sm"
            variant="ghost"
            @click="emit('edit', profile)"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            :disabled="profile.status === 'connected'"
            @click="emit('delete', profile.id)"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  </Card>
</template>
