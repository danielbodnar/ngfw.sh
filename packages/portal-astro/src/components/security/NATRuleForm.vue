<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "../ui/Button.vue";
import Card from "../ui/Card.vue";
import Input from "../ui/Input.vue";
import Select from "../ui/Select.vue";
import type { NATRule } from "./NATRuleList.vue";

const props = defineProps<{
	rule?: NATRule | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	save: [rule: NATRule];
	cancel: [];
}>();

const name = ref(props.rule?.name || "");
const type = ref(props.rule?.type || "port_forward");
const protocol = ref(props.rule?.protocol || "tcp");
const external_port = ref(props.rule?.external_port || 0);
const internal_ip = ref(props.rule?.internal_ip || "");
const internal_port = ref(props.rule?.internal_port || 0);
const source_ip = ref(props.rule?.source_ip || "");
const target_ip = ref(props.rule?.target_ip || "");

const typeOptions = [
	{ value: "port_forward", label: "Port Forward (DNAT)" },
	{ value: "snat", label: "Source NAT (SNAT)" },
	{ value: "dnat", label: "Destination NAT (DNAT)" },
	{ value: "masquerade", label: "Masquerade" },
];

const protocolOptions = [
	{ value: "tcp", label: "TCP" },
	{ value: "udp", label: "UDP" },
	{ value: "both", label: "Both" },
];

const showPortForwardFields = computed(() => type.value === "port_forward");
const showSnatFields = computed(() => type.value === "snat");
const showDnatFields = computed(() => type.value === "dnat");

const handleSave = () => {
	const rule: NATRule = {
		id: props.rule?.id || Date.now().toString(),
		name: name.value,
		type: type.value as NATRule["type"],
		enabled: props.rule?.enabled ?? true,
	};

	if (showPortForwardFields.value) {
		rule.protocol = protocol.value;
		rule.external_port = Number(external_port.value);
		rule.internal_ip = internal_ip.value;
		rule.internal_port = Number(internal_port.value);
	} else if (showSnatFields.value) {
		rule.source_ip = source_ip.value;
		rule.target_ip = target_ip.value;
	} else if (showDnatFields.value) {
		rule.external_port = Number(external_port.value);
		rule.internal_ip = internal_ip.value;
	}

	emit("save", rule);
};
</script>

<template>
  <Card :title="rule ? 'Edit NAT Rule' : 'Add NAT Rule'">
    <div class="space-y-4">
      <Input
        v-model="name"
        label="Rule Name"
        placeholder="Web Server Port Forward"
        required
      />

      <Select
        v-model="type"
        label="NAT Type"
        :options="typeOptions"
      />

      <!-- Port Forward Fields -->
      <template v-if="showPortForwardFields">
        <div class="border-t border-[--color-border] pt-4 mt-4">
          <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">Port Forward Configuration</h4>
          <div class="space-y-4">
            <Select
              v-model="protocol"
              label="Protocol"
              :options="protocolOptions"
            />

            <Input
              v-model="external_port"
              label="External Port"
              type="number"
              placeholder="80"
              required
            />

            <Input
              v-model="internal_ip"
              label="Internal IP Address"
              placeholder="192.168.1.100"
              required
            />

            <Input
              v-model="internal_port"
              label="Internal Port"
              type="number"
              placeholder="80"
              required
            />
          </div>
        </div>
      </template>

      <!-- SNAT Fields -->
      <template v-if="showSnatFields">
        <div class="border-t border-[--color-border] pt-4 mt-4">
          <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">Source NAT Configuration</h4>
          <div class="space-y-4">
            <Input
              v-model="source_ip"
              label="Source IP/Network"
              placeholder="10.0.0.0/24"
              help="CIDR notation supported"
              required
            />

            <Input
              v-model="target_ip"
              label="Target IP"
              placeholder="192.168.1.1"
              required
            />
          </div>
        </div>
      </template>

      <!-- DNAT Fields -->
      <template v-if="showDnatFields">
        <div class="border-t border-[--color-border] pt-4 mt-4">
          <h4 class="text-sm font-medium text-[--color-text-primary] mb-4">Destination NAT Configuration</h4>
          <div class="space-y-4">
            <Input
              v-model="external_port"
              label="External Port"
              type="number"
              placeholder="8080"
              required
            />

            <Input
              v-model="internal_ip"
              label="Internal IP Address"
              placeholder="192.168.1.50"
              required
            />
          </div>
        </div>
      </template>

      <div class="flex gap-3 pt-4">
        <Button @click="handleSave" :disabled="!name || loading">
          {{ rule ? 'Update Rule' : 'Add Rule' }}
        </Button>
        <Button variant="secondary" @click="emit('cancel')">Cancel</Button>
      </div>
    </div>
  </Card>
</template>
