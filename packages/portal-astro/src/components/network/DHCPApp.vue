<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePolling } from '../../composables/usePolling';
import Spinner from '../ui/Spinner.vue';
import Button from '../ui/Button.vue';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';
import Input from '../ui/Input.vue';
import { z } from 'zod';

/**
 * DHCP configuration schema for validation.
 */
const DHCPConfigSchema = z.object({
  enabled: z.boolean(),
  start_ip: z.string().ip(),
  end_ip: z.string().ip(),
  lease_time: z.number().min(60).max(86400),
  domain: z.string().optional(),
  dns_servers: z.array(z.string().ip()),
  gateway: z.string().ip(),
  ntp_servers: z.array(z.string().ip()).optional(),
});

type DHCPConfig = z.infer<typeof DHCPConfigSchema>;

interface DHCPLease {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string | null;
  expiry: number;
  status: 'active' | 'expired' | 'static';
}

const loading = ref(true);
const error = ref<string | null>(null);
const config = ref<DHCPConfig>({
  enabled: true,
  start_ip: '192.168.1.100',
  end_ip: '192.168.1.200',
  lease_time: 86400,
  domain: 'lan',
  dns_servers: ['192.168.1.1'],
  gateway: '192.168.1.1',
  ntp_servers: [],
});
const leases = ref<DHCPLease[]>([]);

const saving = ref(false);
const validationErrors = ref<Record<string, string>>({});
const filterQuery = ref('');

/**
 * Fetch DHCP configuration and leases.
 * Uses mock data as backend endpoints don't exist yet.
 */
async function fetchData(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    // TODO: Replace with real API call when backend is ready
    // const api = useApi();
    // const [configData, leasesData] = await Promise.all([
    //   api.getDHCPConfig(),
    //   api.getDHCPLeases(),
    // ]);
    // config.value = configData;
    // leases.value = leasesData;

    // Mock data for now
    await new Promise(resolve => setTimeout(resolve, 500));

    config.value = {
      enabled: true,
      start_ip: '192.168.1.100',
      end_ip: '192.168.1.200',
      lease_time: 86400,
      domain: 'lan',
      dns_servers: ['192.168.1.1', '1.1.1.1'],
      gateway: '192.168.1.1',
      ntp_servers: ['0.pool.ntp.org', '1.pool.ntp.org'],
    };

    const now = Date.now();
    leases.value = [
      {
        ip: '192.168.1.10',
        mac: '00:11:22:33:44:55',
        hostname: 'desktop-pc',
        vendor: 'Intel',
        expiry: now + 86400000,
        status: 'static',
      },
      {
        ip: '192.168.1.20',
        mac: 'AA:BB:CC:DD:EE:FF',
        hostname: 'server-01',
        vendor: 'Dell',
        expiry: now + 86400000,
        status: 'static',
      },
      {
        ip: '192.168.1.50',
        mac: '11:22:33:44:55:66',
        hostname: 'nas-storage',
        vendor: 'Synology',
        expiry: now + 86400000,
        status: 'static',
      },
      {
        ip: '192.168.1.100',
        mac: 'A1:B2:C3:D4:E5:F6',
        hostname: 'laptop-01',
        vendor: 'Apple',
        expiry: now + 43200000,
        status: 'active',
      },
      {
        ip: '192.168.1.101',
        mac: 'B2:C3:D4:E5:F6:A7',
        hostname: 'phone-android',
        vendor: 'Samsung',
        expiry: now + 21600000,
        status: 'active',
      },
      {
        ip: '192.168.1.102',
        mac: 'C3:D4:E5:F6:A7:B8',
        hostname: 'tablet-ipad',
        vendor: 'Apple',
        expiry: now + 32400000,
        status: 'active',
      },
      {
        ip: '192.168.1.103',
        mac: 'D4:E5:F6:A7:B8:C9',
        hostname: 'smart-tv',
        vendor: 'LG',
        expiry: now + 54000000,
        status: 'active',
      },
      {
        ip: '192.168.1.104',
        mac: 'E5:F6:A7:B8:C9:DA',
        hostname: 'printer-hp',
        vendor: 'HP',
        expiry: now + 12600000,
        status: 'active',
      },
      {
        ip: '192.168.1.105',
        mac: 'F6:A7:B8:C9:DA:EB',
        hostname: 'camera-01',
        vendor: 'Hikvision',
        expiry: now + 64800000,
        status: 'active',
      },
      {
        ip: '192.168.1.106',
        mac: 'A7:B8:C9:DA:EB:FC',
        hostname: 'speaker-sonos',
        vendor: 'Sonos',
        expiry: now + 25200000,
        status: 'active',
      },
      {
        ip: '192.168.1.107',
        mac: 'B8:C9:DA:EB:FC:0D',
        hostname: 'thermostat',
        vendor: 'Nest',
        expiry: now + 18000000,
        status: 'active',
      },
      {
        ip: '192.168.1.108',
        mac: 'C9:DA:EB:FC:0D:1E',
        hostname: 'doorbell',
        vendor: 'Ring',
        expiry: now + 39600000,
        status: 'active',
      },
    ];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch DHCP data';
  } finally {
    loading.value = false;
  }
}

/**
 * Save DHCP configuration.
 */
async function saveConfig(): Promise<void> {
  validationErrors.value = {};

  const result = DHCPConfigSchema.safeParse(config.value);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        validationErrors.value[err.path[0] as string] = err.message;
      }
    });
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    // TODO: Replace with real API call when backend is ready
    // const api = useApi();
    // await api.updateDHCPConfig(config.value);

    await new Promise(resolve => setTimeout(resolve, 1000));
    await fetchData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save DHCP configuration';
  } finally {
    saving.value = false;
  }
}

/**
 * Format expiry time to human-readable format.
 */
function formatExpiry(expiry: number): string {
  const now = Date.now();
  const diff = expiry - now;

  if (diff < 0) return 'Expired';

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get status badge variant.
 */
function getStatusVariant(status: string): 'success' | 'warning' | 'primary' {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'warning';
  return 'primary';
}

/**
 * Filtered leases based on search query.
 */
const filteredLeases = computed(() => {
  if (!filterQuery.value) return leases.value;

  const query = filterQuery.value.toLowerCase();
  return leases.value.filter(lease =>
    lease.ip.toLowerCase().includes(query) ||
    lease.mac.toLowerCase().includes(query) ||
    lease.hostname.toLowerCase().includes(query) ||
    (lease.vendor && lease.vendor.toLowerCase().includes(query))
  );
});

/**
 * Static and active lease counts.
 */
const leaseStats = computed(() => {
  return {
    static: leases.value.filter(l => l.status === 'static').length,
    active: leases.value.filter(l => l.status === 'active').length,
    total: leases.value.length,
  };
});

onMounted(() => {
  void fetchData();
});

// Auto-refresh every 30 seconds
usePolling({
  fetcher: fetchData,
  interval: 30000,
  immediate: false,
});
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex flex-col justify-center items-center h-64 space-y-4"
    >
      <Spinner size="lg" />
      <span class="text-sm text-[--color-text-secondary]"
        >Loading DHCP configuration...</span
      >
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
    >
      <div class="flex items-start">
        <svg
          class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="ml-3 flex-1">
          <h3 class="text-red-800 dark:text-red-200 font-medium">
            Failed to load DHCP configuration
          </h3>
          <p class="text-red-700 dark:text-red-300 mt-1 text-sm">{{ error }}</p>
          <Button variant="danger" size="sm" class="mt-3" @click="fetchData">
            Retry
          </Button>
        </div>
      </div>
    </div>

    <!-- Success State with Data -->
    <div v-else class="space-y-6">
      <!-- DHCP Server Configuration -->
      <Card>
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            DHCP Server Configuration
          </h2>
        </div>

        <form @submit.prevent="saveConfig" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              v-model="config.start_ip"
              label="DHCP Start IP"
              type="text"
              placeholder="192.168.1.100"
              :error="validationErrors.start_ip"
              required
            />
            <Input
              v-model="config.end_ip"
              label="DHCP End IP"
              type="text"
              placeholder="192.168.1.200"
              :error="validationErrors.end_ip"
              required
            />
            <Input
              v-model.number="config.lease_time"
              label="Lease Time (seconds)"
              type="number"
              :min="60"
              :max="86400"
              :error="validationErrors.lease_time"
              required
            />
            <Input
              v-model="config.domain"
              label="Domain Name"
              type="text"
              placeholder="lan"
              :error="validationErrors.domain"
            />
            <Input
              v-model="config.gateway"
              label="Gateway"
              type="text"
              placeholder="192.168.1.1"
              :error="validationErrors.gateway"
              required
            />
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" @click="fetchData">
              Cancel
            </Button>
            <Button type="submit" variant="primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Configuration' }}
            </Button>
          </div>
        </form>
      </Card>

      <!-- DHCP Leases -->
      <Card>
        <template #actions>
          <Button size="sm" @click="fetchData">
            <svg
              class="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </template>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              DHCP Leases
            </h2>
            <div class="flex items-center space-x-4 text-sm">
              <span class="text-slate-600 dark:text-slate-400">
                Static: <span class="font-medium text-slate-900 dark:text-slate-100">{{ leaseStats.static }}</span>
              </span>
              <span class="text-slate-600 dark:text-slate-400">
                Active: <span class="font-medium text-slate-900 dark:text-slate-100">{{ leaseStats.active }}</span>
              </span>
              <span class="text-slate-600 dark:text-slate-400">
                Total: <span class="font-medium text-slate-900 dark:text-slate-100">{{ leaseStats.total }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <Input
            v-model="filterQuery"
            type="text"
            placeholder="Filter by IP, MAC, hostname, or vendor..."
            label=""
          />
        </div>

        <div v-if="filteredLeases.length === 0" class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
            No leases found
          </h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Try adjusting your filter or refresh the list.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  MAC Address
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Hostname
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Vendor
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Expiry
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr
                v-for="lease in filteredLeases"
                :key="lease.mac"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ lease.ip }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 dark:text-slate-400">
                  {{ lease.mac }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ lease.hostname }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ lease.vendor || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {{ lease.status === 'static' ? 'Permanent' : formatExpiry(lease.expiry) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :variant="getStatusVariant(lease.status)">
                    {{ lease.status }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>
</template>
