<script setup lang="ts">
import { reactive, ref } from "vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";
import Toggle from "../ui/Toggle.vue";

interface OnboardingConfig {
	deviceName: string;
	shippingAddress: {
		fullName: string;
		addressLine1: string;
		addressLine2?: string;
		city: string;
		state: string;
		zipCode: string;
		country: string;
		phoneNumber: string;
	};
	wifiConfig: {
		ssid: string;
		password: string;
		hideSsid: boolean;
	};
	wanType: "dhcp" | "static" | "pppoe" | "lte";
	wanConfig?: {
		username?: string;
		password?: string;
		ipAddress?: string;
		subnet?: string;
		gateway?: string;
		dns1?: string;
		dns2?: string;
	};
	adminPassword: string;
	adminPasswordConfirm?: string;
	securityPreset: "standard" | "strict" | "custom";
	enableIPS: boolean;
	enableDNSFilter: boolean;
	enableAutoUpdates: boolean;
}

const emit = defineEmits<{
	submit: [config: OnboardingConfig];
}>();

const config = reactive<OnboardingConfig>({
	deviceName: "",
	shippingAddress: {
		fullName: "",
		addressLine1: "",
		addressLine2: "",
		city: "",
		state: "",
		zipCode: "",
		country: "US",
		phoneNumber: "",
	},
	wifiConfig: {
		ssid: "",
		password: "",
		hideSsid: false,
	},
	wanType: "dhcp",
	wanConfig: {},
	adminPassword: "",
	adminPasswordConfirm: "",
	securityPreset: "standard",
	enableIPS: true,
	enableDNSFilter: true,
	enableAutoUpdates: true,
});

const errors = ref<Record<string, string>>({});

const stateOptions = [
	"AL",
	"AK",
	"AZ",
	"AR",
	"CA",
	"CO",
	"CT",
	"DE",
	"FL",
	"GA",
	"HI",
	"ID",
	"IL",
	"IN",
	"IA",
	"KS",
	"KY",
	"LA",
	"ME",
	"MD",
	"MA",
	"MI",
	"MN",
	"MS",
	"MO",
	"MT",
	"NE",
	"NV",
	"NH",
	"NJ",
	"NM",
	"NY",
	"NC",
	"ND",
	"OH",
	"OK",
	"OR",
	"PA",
	"RI",
	"SC",
	"SD",
	"TN",
	"TX",
	"UT",
	"VT",
	"VA",
	"WA",
	"WV",
	"WI",
	"WY",
];

const wanTypeOptions = [
	{ value: "dhcp", label: "DHCP (Automatic)" },
	{ value: "static", label: "Static IP" },
	{ value: "pppoe", label: "PPPoE" },
	{ value: "lte", label: "LTE/Mobile" },
];

const securityPresetOptions = [
	{ value: "standard", label: "Standard - Balanced security and usability" },
	{ value: "strict", label: "Strict - Maximum security" },
	{ value: "custom", label: "Custom - Configure manually" },
];

const validateForm = (): boolean => {
	errors.value = {};

	if (!config.deviceName || config.deviceName.length < 3) {
		errors.value.deviceName = "Device name must be at least 3 characters";
	}

	if (!config.shippingAddress.fullName) {
		errors.value.fullName = "Full name is required";
	}

	if (!config.shippingAddress.addressLine1) {
		errors.value.addressLine1 = "Address is required";
	}

	if (!config.shippingAddress.city) {
		errors.value.city = "City is required";
	}

	if (!config.shippingAddress.state) {
		errors.value.state = "State is required";
	}

	if (
		!config.shippingAddress.zipCode ||
		!/^\d{5}(-\d{4})?$/.test(config.shippingAddress.zipCode)
	) {
		errors.value.zipCode = "Valid ZIP code is required";
	}

	if (
		!config.shippingAddress.phoneNumber ||
		!/^\d{10,}$/.test(config.shippingAddress.phoneNumber.replace(/\D/g, ""))
	) {
		errors.value.phoneNumber = "Valid phone number is required";
	}

	if (!config.wifiConfig.ssid || config.wifiConfig.ssid.length > 32) {
		errors.value.ssid = "WiFi name must be 1-32 characters";
	}

	if (!config.wifiConfig.password || config.wifiConfig.password.length < 8) {
		errors.value.wifiPassword = "WiFi password must be at least 8 characters";
	}

	if (!config.adminPassword || config.adminPassword.length < 8) {
		errors.value.adminPassword = "Admin password must be at least 8 characters";
	}

	if (config.adminPassword !== config.adminPasswordConfirm) {
		errors.value.adminPasswordConfirm = "Passwords do not match";
	}

	// WAN-specific validation
	if (config.wanType === "pppoe") {
		if (!config.wanConfig?.username) {
			errors.value.pppoeUsername = "PPPoE username is required";
		}
		if (!config.wanConfig?.password) {
			errors.value.pppoePassword = "PPPoE password is required";
		}
	}

	if (config.wanType === "static") {
		if (!config.wanConfig?.ipAddress) {
			errors.value.staticIp = "Static IP address is required";
		}
		if (!config.wanConfig?.gateway) {
			errors.value.gateway = "Gateway is required";
		}
	}

	return Object.keys(errors.value).length === 0;
};

const handleSubmit = () => {
	if (validateForm()) {
		const submitConfig = { ...config };
		delete submitConfig.adminPasswordConfirm;
		emit("submit", submitConfig);
	}
};
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Configure Your Router
      </h2>
      <p class="text-slate-600 dark:text-slate-400">
        Provide configuration details for your new router. We'll set everything up before shipping.
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Device Name -->
      <Card title="Device Identity">
        <div class="space-y-4">
          <Input
            v-model="config.deviceName"
            label="Device Name"
            placeholder="My Router"
            :error="errors.deviceName"
            required
          />
          <p class="text-sm text-slate-600 dark:text-slate-400">
            A friendly name to identify this router in your fleet
          </p>
        </div>
      </Card>

      <!-- Shipping Address -->
      <Card title="Shipping Address">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <Input
              v-model="config.shippingAddress.fullName"
              label="Full Name"
              placeholder="John Doe"
              :error="errors.fullName"
              required
            />
          </div>
          <div class="md:col-span-2">
            <Input
              v-model="config.shippingAddress.addressLine1"
              label="Street Address"
              placeholder="123 Main St"
              :error="errors.addressLine1"
              required
            />
          </div>
          <div class="md:col-span-2">
            <Input
              v-model="config.shippingAddress.addressLine2"
              label="Apartment, Suite, etc. (optional)"
              placeholder="Apt 4B"
            />
          </div>
          <Input
            v-model="config.shippingAddress.city"
            label="City"
            placeholder="San Francisco"
            :error="errors.city"
            required
          />
          <Select
            v-model="config.shippingAddress.state"
            label="State"
            :options="stateOptions.map(s => ({ value: s, label: s }))"
            :error="errors.state"
            required
          />
          <Input
            v-model="config.shippingAddress.zipCode"
            label="ZIP Code"
            placeholder="94102"
            :error="errors.zipCode"
            required
          />
          <Input
            v-model="config.shippingAddress.phoneNumber"
            label="Phone Number"
            placeholder="(415) 555-0100"
            type="tel"
            :error="errors.phoneNumber"
            required
          />
        </div>
      </Card>

      <!-- WiFi Configuration -->
      <Card title="WiFi Network">
        <div class="space-y-4">
          <Input
            v-model="config.wifiConfig.ssid"
            label="Network Name (SSID)"
            placeholder="MyNetwork"
            :error="errors.ssid"
            maxlength="32"
            required
          />
          <Input
            v-model="config.wifiConfig.password"
            label="WiFi Password"
            type="password"
            placeholder="Minimum 8 characters"
            :error="errors.wifiPassword"
            required
          />
          <Toggle
            v-model="config.wifiConfig.hideSsid"
            label="Hide network name (SSID)"
            description="Your network won't appear in WiFi lists"
          />
        </div>
      </Card>

      <!-- WAN Configuration -->
      <Card title="Internet Connection (WAN)">
        <div class="space-y-4">
          <Select
            v-model="config.wanType"
            label="Connection Type"
            :options="wanTypeOptions"
            required
          />

          <!-- PPPoE Config -->
          <div v-if="config.wanType === 'pppoe'" class="space-y-4 pt-4">
            <Input
              v-model="config.wanConfig!.username"
              label="PPPoE Username"
              placeholder="username@isp.com"
              :error="errors.pppoeUsername"
              required
            />
            <Input
              v-model="config.wanConfig!.password"
              label="PPPoE Password"
              type="password"
              :error="errors.pppoePassword"
              required
            />
          </div>

          <!-- Static IP Config -->
          <div v-if="config.wanType === 'static'" class="space-y-4 pt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                v-model="config.wanConfig!.ipAddress"
                label="IP Address"
                placeholder="192.168.1.100"
                :error="errors.staticIp"
                required
              />
              <Input
                v-model="config.wanConfig!.subnet"
                label="Subnet Mask"
                placeholder="255.255.255.0"
              />
              <Input
                v-model="config.wanConfig!.gateway"
                label="Gateway"
                placeholder="192.168.1.1"
                :error="errors.gateway"
                required
              />
              <Input
                v-model="config.wanConfig!.dns1"
                label="Primary DNS"
                placeholder="8.8.8.8"
              />
              <Input
                v-model="config.wanConfig!.dns2"
                label="Secondary DNS"
                placeholder="8.8.4.4"
              />
            </div>
          </div>
        </div>
      </Card>

      <!-- Admin Access -->
      <Card title="Admin Password">
        <div class="space-y-4">
          <Input
            v-model="config.adminPassword"
            label="Admin Password"
            type="password"
            placeholder="Minimum 8 characters"
            :error="errors.adminPassword"
            required
          />
          <Input
            v-model="config.adminPasswordConfirm"
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            :error="errors.adminPasswordConfirm"
            required
          />
        </div>
      </Card>

      <!-- Security Settings -->
      <Card title="Security Settings">
        <div class="space-y-4">
          <Select
            v-model="config.securityPreset"
            label="Security Preset"
            :options="securityPresetOptions"
            required
          />
          <Toggle
            v-model="config.enableIPS"
            label="Enable Intrusion Prevention System (IPS)"
            description="Block malicious network traffic and known attack patterns"
          />
          <Toggle
            v-model="config.enableDNSFilter"
            label="Enable DNS Filtering"
            description="Block ads, trackers, and malicious domains"
          />
          <Toggle
            v-model="config.enableAutoUpdates"
            label="Enable Automatic Updates"
            description="Automatically install security updates and patches"
          />
        </div>
      </Card>

      <!-- Submit Button -->
      <div class="flex justify-end">
        <button
          type="submit"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue to Review
        </button>
      </div>
    </form>
  </div>
</template>
