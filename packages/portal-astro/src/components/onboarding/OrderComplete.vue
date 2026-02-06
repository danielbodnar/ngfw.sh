<script setup lang="ts">
import Badge from '../ui/Badge.vue';
import Card from '../ui/Card.vue';

interface OrderDetails {
  orderId: string;
  deviceId: string;
  estimatedDelivery: string;
  setupInstructions: string;
}

const props = defineProps<{
  order: OrderDetails;
}>();

const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>

<template>
  <div class="text-center">
    <!-- Success Icon -->
    <div class="mb-6">
      <div class="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-12 h-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        Order Placed Successfully!
      </h2>
      <p class="text-lg text-slate-600 dark:text-slate-400">
        Your router is being prepared and will ship soon
      </p>
    </div>

    <!-- Order Details Card -->
    <Card class="text-left max-w-2xl mx-auto mb-6">
      <div class="space-y-6">
        <!-- Order ID -->
        <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Order Number</p>
            <p class="text-xl font-semibold text-slate-900 dark:text-slate-100 font-mono">
              {{ order.orderId }}
            </p>
          </div>
          <Badge variant="success">Confirmed</Badge>
        </div>

        <!-- Device ID -->
        <div class="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div>
            <p class="text-sm text-blue-700 dark:text-blue-300 mb-1">Pre-provisioned Device ID</p>
            <p class="text-lg font-semibold text-blue-900 dark:text-blue-100 font-mono">
              {{ order.deviceId }}
            </p>
          </div>
        </div>

        <!-- Estimated Delivery -->
        <div>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Estimated Delivery</p>
          <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {{ formatDate(order.estimatedDelivery) }}
          </p>
        </div>

        <!-- Next Steps -->
        <div class="pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            What's Next?
          </h3>
          <ol class="space-y-3">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div>
                <p class="font-medium text-slate-900 dark:text-slate-100">We'll prepare your router</p>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Your router will be configured with your settings and tested before shipping
                </p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div>
                <p class="font-medium text-slate-900 dark:text-slate-100">Track your shipment</p>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  You'll receive an email with tracking information once your order ships
                </p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div>
                <p class="font-medium text-slate-900 dark:text-slate-100">Simple setup</p>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Just plug in your router and connect - everything is already configured
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </Card>

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a
        :href="order.setupInstructions"
        target="_blank"
        class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        View Setup Guide
      </a>
      <a
        href="/dashboard"
        class="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
      >
        Go to Dashboard
      </a>
    </div>

    <!-- Email Notice -->
    <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-2xl mx-auto">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p class="text-sm text-blue-900 dark:text-blue-100">
          A confirmation email has been sent to your registered email address with all order details and setup instructions.
        </p>
      </div>
    </div>
  </div>
</template>
