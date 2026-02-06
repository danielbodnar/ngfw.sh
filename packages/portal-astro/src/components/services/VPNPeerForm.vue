<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Toggle from '../ui/Toggle.vue';

export interface VPNPeerFormData {
  name: string;
  allowed_ips: string[];
  persistent_keepalive: number;
  enabled: boolean;
}

const props = defineProps<{
  isOpen: boolean;
  peer?: VPNPeerFormData | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [peer: VPNPeerFormData];
}>();

const formData = ref<VPNPeerFormData>({
  name: '',
  allowed_ips: [],
  persistent_keepalive: 25,
  enabled: true,
});

const allowedIpsString = ref('10.0.0.2/32');

watch(() => props.peer, (newPeer) => {
  if (newPeer) {
    formData.value = { ...newPeer };
    allowedIpsString.value = newPeer.allowed_ips.join(', ');
  } else {
    formData.value = {
      name: '',
      allowed_ips: [],
      persistent_keepalive: 25,
      enabled: true,
    };
    allowedIpsString.value = '10.0.0.2/32';
  }
}, { immediate: true });

const handleSubmit = () => {
  formData.value.allowed_ips = allowedIpsString.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  emit('save', formData.value);
};

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="handleClose"
  >
    <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {{ peer ? 'Edit Peer' : 'Add Peer' }}
        </h2>
        <button
          @click="handleClose"
          class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div class="p-6 space-y-4">
        <Input
          v-model="formData.name"
          label="Peer Name"
          placeholder="e.g., Phone, Laptop"
          required
        />

        <Input
          v-model="allowedIpsString"
          label="Allowed IPs"
          placeholder="10.0.0.2/32"
          help="Comma-separated list of IP addresses/ranges"
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
          label="Enable Peer"
        />

        <div v-if="!peer" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <p class="font-medium mb-1">After saving:</p>
          <p>A configuration file and QR code will be generated for this peer. Save them securely as the private key cannot be recovered.</p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="ghost"
          @click="handleClose"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          :disabled="!formData.name || loading"
          @click="handleSubmit"
        >
          {{ loading ? 'Saving...' : peer ? 'Update Peer' : 'Create Peer' }}
        </Button>
      </div>
    </div>
  </div>
</template>
