<script setup lang="ts">
import { ref, watch } from "vue";
import Button from "../ui/Button.vue";
import Input from "../ui/Input.vue";
import Toggle from "../ui/Toggle.vue";

export interface VPNClientFormData {
	name: string;
	endpoint: string;
	public_key: string;
	private_key: string;
	preshared_key?: string;
	allowed_ips: string[];
	persistent_keepalive: number;
	enabled: boolean;
}

const props = defineProps<{
	isOpen: boolean;
	profile?: VPNClientFormData | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	close: [];
	save: [profile: VPNClientFormData];
	import: [configText: string];
}>();

const formData = ref<VPNClientFormData>({
	name: "",
	endpoint: "",
	public_key: "",
	private_key: "",
	preshared_key: "",
	allowed_ips: ["0.0.0.0/0", "::/0"],
	persistent_keepalive: 25,
	enabled: true,
});

const allowedIpsString = ref("0.0.0.0/0, ::/0");
const configText = ref("");
const showImport = ref(false);

watch(
	() => props.profile,
	(newProfile) => {
		if (newProfile) {
			formData.value = { ...newProfile };
			allowedIpsString.value = newProfile.allowed_ips.join(", ");
		} else {
			formData.value = {
				name: "",
				endpoint: "",
				public_key: "",
				private_key: "",
				preshared_key: "",
				allowed_ips: ["0.0.0.0/0", "::/0"],
				persistent_keepalive: 25,
				enabled: true,
			};
			allowedIpsString.value = "0.0.0.0/0, ::/0";
		}
	},
	{ immediate: true },
);

const handleSubmit = () => {
	formData.value.allowed_ips = allowedIpsString.value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	emit("save", formData.value);
};

const handleImport = () => {
	emit("import", configText.value);
	showImport.value = false;
};

const handleClose = () => {
	emit("close");
	showImport.value = false;
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="handleClose"
  >
    <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {{ profile ? 'Edit Profile' : 'Add VPN Profile' }}
        </h2>
        <button
          @click="handleClose"
          class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div v-if="!showImport" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Manually configure a WireGuard connection
          </p>
          <Button
            size="sm"
            variant="ghost"
            @click="showImport = true"
          >
            Import Config
          </Button>
        </div>

        <Input
          v-model="formData.name"
          label="Profile Name"
          placeholder="e.g., Work VPN"
          required
        />

        <Input
          v-model="formData.endpoint"
          label="Endpoint"
          placeholder="vpn.example.com:51820"
          help="Server address and port"
          required
        />

        <Input
          v-model="formData.public_key"
          label="Server Public Key"
          placeholder="Base64-encoded public key"
          required
        />

        <Input
          v-model="formData.private_key"
          label="Client Private Key"
          type="password"
          placeholder="Base64-encoded private key"
          required
        />

        <Input
          v-model="formData.preshared_key"
          label="Preshared Key (optional)"
          type="password"
          placeholder="Base64-encoded preshared key"
        />

        <Input
          v-model="allowedIpsString"
          label="Allowed IPs"
          placeholder="0.0.0.0/0, ::/0"
          help="Comma-separated list (use 0.0.0.0/0 to route all traffic)"
        />

        <Input
          v-model="formData.persistent_keepalive"
          label="Persistent Keepalive (seconds)"
          type="number"
          placeholder="25"
          help="Keep connection alive through NAT (0 to disable)"
        />

        <Toggle
          v-model="formData.enabled"
          label="Enable Profile"
        />
      </div>

      <div v-else class="p-6 space-y-4">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Paste your WireGuard configuration file
          </p>
          <Button
            size="sm"
            variant="ghost"
            @click="showImport = false"
          >
            Manual Entry
          </Button>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Configuration File
          </label>
          <textarea
            v-model="configText"
            rows="15"
            placeholder="[Interface]&#10;PrivateKey = ...&#10;Address = ...&#10;&#10;[Peer]&#10;PublicKey = ...&#10;Endpoint = ..."
            class="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <Button
          variant="primary"
          :disabled="!configText.trim()"
          @click="handleImport"
        >
          Import Configuration
        </Button>
      </div>

      <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="ghost"
          @click="handleClose"
        >
          Cancel
        </Button>
        <Button
          v-if="!showImport"
          variant="primary"
          :disabled="!formData.name || !formData.endpoint || !formData.public_key || !formData.private_key || loading"
          @click="handleSubmit"
        >
          {{ loading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile' }}
        </Button>
      </div>
    </div>
  </div>
</template>
