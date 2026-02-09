<script setup lang="ts">
import { ref } from "vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Select from "../ui/Select.vue";
import Toggle from "../ui/Toggle.vue";

export interface IPSConfig {
	enabled: boolean;
	mode: "detect" | "prevent";
	sensitivity: "low" | "medium" | "high";
	auto_update: boolean;
	block_on_threat: boolean;
}

const props = defineProps<{
	config: IPSConfig;
	loading?: boolean;
}>();

const emit = defineEmits<{
	save: [config: IPSConfig];
}>();

const localConfig = ref<IPSConfig>({ ...props.config });

const modeOptions = [
	{ value: "detect", label: "Detect Only (Log threats)" },
	{ value: "prevent", label: "Prevent (Block threats)" },
];

const sensitivityOptions = [
	{ value: "low", label: "Low (Fewer false positives)" },
	{ value: "medium", label: "Medium (Balanced)" },
	{ value: "high", label: "High (Maximum protection)" },
];

const handleSave = () => {
	emit("save", localConfig.value);
};
</script>

<template>
  <Card title="IPS Configuration">
    <div class="space-y-4">
      <Toggle
        v-model="localConfig.enabled"
        label="Enable Intrusion Prevention System"
      />

      <template v-if="localConfig.enabled">
        <Select
          v-model="localConfig.mode"
          label="Operating Mode"
          :options="modeOptions"
        />

        <Select
          v-model="localConfig.sensitivity"
          label="Detection Sensitivity"
          :options="sensitivityOptions"
        />

        <Toggle
          v-model="localConfig.auto_update"
          label="Auto-update Signatures"
        />

        <Toggle
          v-model="localConfig.block_on_threat"
          label="Block IP on Critical Threat"
        />
      </template>

      <div class="flex gap-3 pt-4">
        <Button @click="handleSave" :disabled="loading">
          Save Configuration
        </Button>
      </div>
    </div>
  </Card>
</template>
