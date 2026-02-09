<script setup lang="ts">
import { computed } from "vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";

export interface VPNPeer {
	id: string;
	name: string;
	public_key: string;
	allowed_ips: string[];
	enabled: boolean;
	last_handshake?: number;
	rx_bytes?: number;
	tx_bytes?: number;
}

const props = defineProps<{
	peers: VPNPeer[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	add: [];
	edit: [peer: VPNPeer];
	delete: [peerId: string];
	downloadConfig: [peerId: string];
	showQr: [peerId: string];
}>();

const formatBytes = (bytes?: number) => {
	if (!bytes) return "N/A";
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
	if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
	if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
	return `${bytes} B`;
};

const formatLastSeen = (timestamp?: number) => {
	if (!timestamp) return "Never";
	const now = Date.now() / 1000;
	const diff = now - timestamp;
	if (diff < 60) return "Just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
};

const getStatusBadge = (peer: VPNPeer) => {
	if (!peer.enabled) return { variant: "default" as const, text: "Disabled" };
	if (!peer.last_handshake)
		return { variant: "default" as const, text: "Never Connected" };
	const now = Date.now() / 1000;
	const diff = now - peer.last_handshake;
	if (diff < 300) return { variant: "success" as const, text: "Online" };
	return { variant: "warning" as const, text: "Offline" };
};
</script>

<template>
  <Card title="VPN Peers">
    <template #actions>
      <Button
        size="sm"
        variant="primary"
        @click="emit('add')"
      >
        Add Peer
      </Button>
    </template>

    <div v-if="loading" class="text-center py-8 text-slate-500">
      Loading peers...
    </div>

    <div v-else-if="peers.length === 0" class="text-center py-8 text-slate-500">
      No peers configured. Click "Add Peer" to get started.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-800">
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Name</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Allowed IPs</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Status</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Last Seen</th>
            <th class="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Traffic</th>
            <th class="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="peer in peers"
            :key="peer.id"
            class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <td class="py-3 px-4">
              <div class="font-medium text-slate-900 dark:text-slate-100">{{ peer.name }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ peer.public_key.substring(0, 20) }}...</div>
            </td>
            <td class="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
              {{ peer.allowed_ips.join(', ') }}
            </td>
            <td class="py-3 px-4">
              <Badge :variant="getStatusBadge(peer).variant">
                {{ getStatusBadge(peer).text }}
              </Badge>
            </td>
            <td class="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
              {{ formatLastSeen(peer.last_handshake) }}
            </td>
            <td class="py-3 px-4 text-right text-sm text-slate-700 dark:text-slate-300">
              <div>↓ {{ formatBytes(peer.rx_bytes) }}</div>
              <div>↑ {{ formatBytes(peer.tx_bytes) }}</div>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  @click="emit('showQr', peer.id)"
                >
                  QR
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click="emit('downloadConfig', peer.id)"
                >
                  Config
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click="emit('edit', peer)"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  @click="emit('delete', peer.id)"
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
