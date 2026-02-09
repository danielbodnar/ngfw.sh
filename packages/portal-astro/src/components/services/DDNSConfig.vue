<script setup lang="ts">
import { computed, ref } from "vue";
import Badge from "../ui/Badge.vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";
import Toggle from "../ui/Toggle.vue";

export interface DDNSConfig {
	enabled: boolean;
	provider: string;
	hostname: string;
	username: string;
	password: string;
	update_interval: number;
	force_ipv4: boolean;
	force_ipv6: boolean;
}

export interface DDNSStatus {
	last_update: number;
	last_ip: string;
	status: "success" | "failed" | "pending";
	message?: string;
}

const props = defineProps<{
	config: DDNSConfig;
	status?: DDNSStatus | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	save: [config: DDNSConfig];
	forceUpdate: [];
}>();

const localConfig = ref<DDNSConfig>({ ...props.config });

const providers = [
	{ value: "cloudflare", label: "Cloudflare" },
	{ value: "duckdns", label: "DuckDNS" },
	{ value: "noip", label: "No-IP" },
	{ value: "dyndns", label: "Dyn DNS" },
	{ value: "namecheap", label: "Namecheap" },
	{ value: "google", label: "Google Domains" },
	{ value: "afraid", label: "FreeDNS (afraid.org)" },
	{ value: "custom", label: "Custom Provider" },
];

const intervalOptions = [
	{ value: "300", label: "5 minutes" },
	{ value: "600", label: "10 minutes" },
	{ value: "1800", label: "30 minutes" },
	{ value: "3600", label: "1 hour" },
	{ value: "7200", label: "2 hours" },
	{ value: "86400", label: "24 hours" },
];

const getStatusBadge = computed(() => {
	if (!props.status) return { variant: "default" as const, text: "Unknown" };
	const badges = {
		success: { variant: "success" as const, text: "Up to Date" },
		failed: { variant: "danger" as const, text: "Update Failed" },
		pending: { variant: "warning" as const, text: "Update Pending" },
	};
	return badges[props.status.status];
});

const formatTimestamp = (timestamp?: number) => {
	if (!timestamp) return "Never";
	const date = new Date(timestamp * 1000);
	return date.toLocaleString();
};

const handleSave = () => {
	emit("save", localConfig.value);
};

const handleForceUpdate = () => {
	emit("forceUpdate");
};
</script>

<template>
  <div class="space-y-6">
    <Card title="Dynamic DNS Configuration">
      <div class="space-y-4">
        <Toggle
          v-model="localConfig.enabled"
          label="Enable Dynamic DNS"
        />

        <Select
          v-model="localConfig.provider"
          label="DDNS Provider"
          :options="providers"
          :disabled="!localConfig.enabled"
        />

        <Input
          v-model="localConfig.hostname"
          label="Hostname"
          placeholder="myrouter.duckdns.org"
          :disabled="!localConfig.enabled"
          help="Your dynamic DNS hostname"
          required
        />

        <Input
          v-model="localConfig.username"
          label="Username / API Token"
          placeholder="Username or API token"
          :disabled="!localConfig.enabled"
          help="Provider-specific authentication"
        />

        <Input
          v-model="localConfig.password"
          label="Password / API Key"
          type="password"
          placeholder="Password or API key"
          :disabled="!localConfig.enabled"
          help="Provider-specific authentication"
        />

        <Select
          v-model="localConfig.update_interval"
          label="Update Interval"
          :options="intervalOptions"
          :disabled="!localConfig.enabled"
          help="How often to check for IP changes"
        />

        <div class="space-y-2">
          <Toggle
            v-model="localConfig.force_ipv4"
            label="Force IPv4 Update"
            :disabled="!localConfig.enabled"
          />
          <Toggle
            v-model="localConfig.force_ipv6"
            label="Force IPv6 Update"
            :disabled="!localConfig.enabled"
          />
        </div>

        <div class="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="primary"
            :disabled="!localConfig.enabled || loading"
            @click="handleSave"
          >
            {{ loading ? 'Saving...' : 'Save Configuration' }}
          </Button>
        </div>
      </div>
    </Card>

    <Card title="DDNS Status">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">Current Status</div>
            <Badge :variant="getStatusBadge.variant">
              {{ getStatusBadge.text }}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="primary"
            :disabled="!localConfig.enabled || loading"
            @click="handleForceUpdate"
          >
            Force Update
          </Button>
        </div>

        <div v-if="status" class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">Last Update</div>
            <div class="text-slate-900 dark:text-slate-100">{{ formatTimestamp(status.last_update) }}</div>
          </div>
          <div>
            <div class="text-sm text-slate-600 dark:text-slate-400 mb-1">Last IP Address</div>
            <div class="text-slate-900 dark:text-slate-100 font-mono">{{ status.last_ip || 'N/A' }}</div>
          </div>
        </div>

        <div v-if="status?.message" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300">
          {{ status.message }}
        </div>

        <div v-if="!status" class="text-center py-8 text-slate-500">
          No update history available
        </div>
      </div>
    </Card>

    <Card title="Provider Information">
      <div class="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-800 dark:text-blue-200">
          <p class="font-medium mb-1">About Dynamic DNS</p>
          <p class="text-xs">
            Dynamic DNS automatically updates DNS records when your WAN IP address changes, allowing you to access your router using a hostname instead of remembering IP addresses.
          </p>
        </div>

        <div v-if="localConfig.provider === 'cloudflare'" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p class="font-medium mb-1">Cloudflare Setup</p>
          <ul class="list-disc list-inside text-xs space-y-1">
            <li>Username: Your Cloudflare email</li>
            <li>Password: Global API Key (not API Token)</li>
            <li>Hostname: Full domain name (e.g., home.example.com)</li>
          </ul>
        </div>

        <div v-else-if="localConfig.provider === 'duckdns'" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p class="font-medium mb-1">DuckDNS Setup</p>
          <ul class="list-disc list-inside text-xs space-y-1">
            <li>Username: Leave empty (not required)</li>
            <li>Password: Your DuckDNS token</li>
            <li>Hostname: Your subdomain (e.g., myrouter.duckdns.org)</li>
          </ul>
        </div>

        <div v-else-if="localConfig.provider === 'noip'" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p class="font-medium mb-1">No-IP Setup</p>
          <ul class="list-disc list-inside text-xs space-y-1">
            <li>Username: Your No-IP account email</li>
            <li>Password: Your No-IP account password</li>
            <li>Hostname: Your No-IP hostname</li>
          </ul>
        </div>
      </div>
    </Card>
  </div>
</template>
