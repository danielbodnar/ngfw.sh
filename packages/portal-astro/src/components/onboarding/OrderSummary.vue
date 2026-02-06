<script setup lang="ts">
import { ref } from 'vue';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';

interface RouterOption {
  id: string;
  name: string;
  manufacturer: string;
  price: number;
  image: string;
}

interface OnboardingConfig {
  deviceName: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    phoneNumber: string;
  };
  wifiConfig: {
    ssid: string;
    password: string;
    hideSsid: boolean;
  };
  wanType: string;
  securityPreset: string;
  enableIPS: boolean;
  enableDNSFilter: boolean;
  enableAutoUpdates: boolean;
}

const props = defineProps<{
  router: RouterOption;
  config: OnboardingConfig;
}>();

const emit = defineEmits<{
  submit: [];
  edit: [section: 'router' | 'config'];
}>();

const submitting = ref(false);

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    emit('submit');
  } finally {
    submitting.value = false;
  }
};

const wanTypeLabels: Record<string, string> = {
  dhcp: 'DHCP (Automatic)',
  static: 'Static IP',
  pppoe: 'PPPoE',
  lte: 'LTE/Mobile',
};

const securityPresetLabels: Record<string, string> = {
  standard: 'Standard',
  strict: 'Strict',
  custom: 'Custom',
};
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Review Your Order
      </h2>
      <p class="text-slate-600 dark:text-slate-400">
        Please review your configuration before placing the order
      </p>
    </div>

    <div class="space-y-6">
      <!-- Router Selection -->
      <Card title="Selected Router">
        <template #actions>
          <button
            @click="emit('edit', 'router')"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Change
          </button>
        </template>
        <div class="flex items-center gap-6">
          <img
            :src="router.image"
            :alt="`${router.manufacturer} ${router.name}`"
            class="w-32 h-24 object-cover rounded-lg bg-slate-100 dark:bg-slate-800"
          />
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ router.manufacturer }} {{ router.name }}
            </h3>
            <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              ${{ router.price }}
            </p>
          </div>
        </div>
      </Card>

      <!-- Configuration Summary -->
      <Card title="Configuration">
        <template #actions>
          <button
            @click="emit('edit', 'config')"
            class="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit
          </button>
        </template>
        <div class="space-y-6">
          <!-- Device Name -->
          <div>
            <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Device Identity
            </h4>
            <p class="text-slate-900 dark:text-slate-100">{{ config.deviceName }}</p>
          </div>

          <!-- Shipping Address -->
          <div>
            <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Shipping Address
            </h4>
            <div class="text-slate-900 dark:text-slate-100 space-y-1">
              <p>{{ config.shippingAddress.fullName }}</p>
              <p>{{ config.shippingAddress.addressLine1 }}</p>
              <p v-if="config.shippingAddress.addressLine2">
                {{ config.shippingAddress.addressLine2 }}
              </p>
              <p>
                {{ config.shippingAddress.city }}, {{ config.shippingAddress.state }}
                {{ config.shippingAddress.zipCode }}
              </p>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ config.shippingAddress.phoneNumber }}
              </p>
            </div>
          </div>

          <!-- WiFi Network -->
          <div>
            <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              WiFi Network
            </h4>
            <div class="space-y-1">
              <p class="text-slate-900 dark:text-slate-100">
                <span class="text-slate-600 dark:text-slate-400">Network:</span>
                {{ config.wifiConfig.ssid }}
                <Badge v-if="config.wifiConfig.hideSsid" variant="default" class="ml-2">
                  Hidden
                </Badge>
              </p>
              <p class="text-slate-600 dark:text-slate-400 text-sm">
                Password: ••••••••
              </p>
            </div>
          </div>

          <!-- WAN Connection -->
          <div>
            <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Internet Connection
            </h4>
            <p class="text-slate-900 dark:text-slate-100">
              {{ wanTypeLabels[config.wanType] || config.wanType }}
            </p>
          </div>

          <!-- Security Settings -->
          <div>
            <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Security Settings
            </h4>
            <div class="space-y-2">
              <p class="text-slate-900 dark:text-slate-100">
                <span class="text-slate-600 dark:text-slate-400">Preset:</span>
                {{ securityPresetLabels[config.securityPreset] }}
              </p>
              <div class="flex flex-wrap gap-2">
                <Badge v-if="config.enableIPS" variant="success">IPS Enabled</Badge>
                <Badge v-if="config.enableDNSFilter" variant="success">DNS Filter Enabled</Badge>
                <Badge v-if="config.enableAutoUpdates" variant="success">Auto Updates Enabled</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Order Total -->
      <Card>
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Order Total
            </p>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Free shipping • 7-10 business days
            </p>
          </div>
          <div class="text-right">
            <p class="text-3xl font-bold text-slate-900 dark:text-slate-100">
              ${{ router.price }}
            </p>
          </div>
        </div>
      </Card>

      <!-- Submit Button -->
      <div class="flex justify-end gap-4">
        <button
          @click="emit('edit', 'config')"
          class="px-6 py-3 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
          :disabled="submitting"
        >
          Go Back
        </button>
        <button
          @click="handleSubmit"
          :disabled="submitting"
          :class="[
            'px-8 py-3 rounded-lg font-medium transition-colors',
            submitting
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          ]"
        >
          {{ submitting ? 'Processing...' : 'Place Order' }}
        </button>
      </div>

      <!-- Terms Notice -->
      <div class="text-center text-sm text-slate-600 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-800">
        <p>
          By placing this order, you agree to our
          <a href="/terms" class="text-blue-600 hover:text-blue-700">Terms of Service</a>
          and
          <a href="/privacy" class="text-blue-600 hover:text-blue-700">Privacy Policy</a>
        </p>
      </div>
    </div>
  </div>
</template>
