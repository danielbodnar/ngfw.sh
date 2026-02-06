<script setup lang="ts">
import { ref } from 'vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Select from '../ui/Select.vue';
import Toggle from '../ui/Toggle.vue';
import Card from '../ui/Card.vue';

export interface RadioSettings {
  enabled: boolean;
  channel: number;
  channel_width: string;
  tx_power: number;
  mode: string;
}

const props = defineProps<{
  band: '2.4GHz' | '5GHz';
  settings: RadioSettings;
  loading?: boolean;
}>();

const emit = defineEmits<{
  save: [settings: RadioSettings];
}>();

const localSettings = ref<RadioSettings>({ ...props.settings });

const channelOptions = props.band === '2.4GHz'
  ? [
      { value: 1, label: 'Channel 1' },
      { value: 6, label: 'Channel 6' },
      { value: 11, label: 'Channel 11' },
    ]
  : [
      { value: 36, label: 'Channel 36' },
      { value: 40, label: 'Channel 40' },
      { value: 44, label: 'Channel 44' },
      { value: 48, label: 'Channel 48' },
      { value: 149, label: 'Channel 149' },
      { value: 153, label: 'Channel 153' },
      { value: 157, label: 'Channel 157' },
      { value: 161, label: 'Channel 161' },
    ];

const channelWidthOptions = props.band === '2.4GHz'
  ? [
      { value: '20MHz', label: '20 MHz' },
      { value: '40MHz', label: '40 MHz' },
    ]
  : [
      { value: '20MHz', label: '20 MHz' },
      { value: '40MHz', label: '40 MHz' },
      { value: '80MHz', label: '80 MHz' },
      { value: '160MHz', label: '160 MHz' },
    ];

const modeOptions = props.band === '2.4GHz'
  ? [
      { value: '802.11b', label: '802.11b' },
      { value: '802.11g', label: '802.11g' },
      { value: '802.11n', label: '802.11n (WiFi 4)' },
      { value: '802.11ax', label: '802.11ax (WiFi 6)' },
    ]
  : [
      { value: '802.11a', label: '802.11a' },
      { value: '802.11n', label: '802.11n (WiFi 4)' },
      { value: '802.11ac', label: '802.11ac (WiFi 5)' },
      { value: '802.11ax', label: '802.11ax (WiFi 6)' },
    ];

const handleSave = () => {
  emit('save', localSettings.value);
};
</script>

<template>
  <Card :title="`${band} Radio Settings`">
    <div class="space-y-4">
      <Toggle
        v-model="localSettings.enabled"
        :label="`Enable ${band} Radio`"
      />

      <template v-if="localSettings.enabled">
        <Select
          v-model="localSettings.channel"
          label="Channel"
          :options="channelOptions"
        />

        <Select
          v-model="localSettings.channel_width"
          label="Channel Width"
          :options="channelWidthOptions"
        />

        <Input
          v-model="localSettings.tx_power"
          label="Transmit Power (dBm)"
          type="number"
          :min="1"
          :max="30"
          help="Maximum transmit power (lower values reduce range)"
        />

        <Select
          v-model="localSettings.mode"
          label="Wireless Mode"
          :options="modeOptions"
        />
      </template>

      <div class="flex gap-3 pt-4">
        <Button @click="handleSave" :disabled="loading">
          Save Settings
        </Button>
      </div>
    </div>
  </Card>
</template>
