<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface User {
  id: string;
  primaryEmailAddress?: {
    emailAddress: string;
  };
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

const isOpen = ref(false);
const user = ref<User | null>(null);

onMounted(async () => {
  // Fetch user data from Clerk
  try {
    const response = await fetch('/api/user');
    if (response.ok) {
      user.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch user:', error);
  }
});

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const signOut = async () => {
  try {
    await fetch('/api/sign-out', { method: 'POST' });
    window.location.href = '/sign-in';
  } catch (error) {
    console.error('Failed to sign out:', error);
  }
};

const getUserInitials = () => {
  if (user.value?.firstName && user.value?.lastName) {
    return `${user.value.firstName.charAt(0)}${user.value.lastName.charAt(0)}`.toUpperCase();
  }
  if (user.value?.primaryEmailAddress?.emailAddress) {
    return user.value.primaryEmailAddress.emailAddress.charAt(0).toUpperCase();
  }
  return 'U';
};

const getUserDisplayName = () => {
  if (user.value?.firstName && user.value?.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`;
  }
  if (user.value?.primaryEmailAddress?.emailAddress) {
    return user.value.primaryEmailAddress.emailAddress;
  }
  return 'User';
};
</script>

<template>
  <div class="relative">
    <button
      type="button"
      @click="toggleMenu"
      class="flex items-center gap-3"
      aria-label="User menu"
    >
      <div v-if="user" class="text-right hidden sm:block">
        <p class="text-sm font-medium text-[--color-text-primary]">
          {{ getUserDisplayName() }}
        </p>
        <p class="text-xs text-[--color-text-muted]">
          {{ user.primaryEmailAddress?.emailAddress }}
        </p>
      </div>
      <div
        class="w-9 h-9 rounded-full bg-[--color-primary] flex items-center justify-center text-white font-medium hover:opacity-80 transition-opacity"
      >
        <img
          v-if="user?.imageUrl"
          :src="user.imageUrl"
          :alt="getUserDisplayName()"
          class="w-full h-full rounded-full object-cover"
        />
        <span v-else>{{ getUserInitials() }}</span>
      </div>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-56 bg-[--color-surface] border border-[--color-border] rounded-lg shadow-lg py-1 z-50"
    >
      <div class="px-4 py-3 border-b border-[--color-border]">
        <p class="text-sm font-medium text-[--color-text-primary]">
          {{ getUserDisplayName() }}
        </p>
        <p class="text-xs text-[--color-text-muted] truncate">
          {{ user?.primaryEmailAddress?.emailAddress }}
        </p>
      </div>

      <a
        href="/settings/profile"
        class="block px-4 py-2 text-sm text-[--color-text-primary] hover:bg-[--color-surface-hover] transition-colors"
      >
        Profile Settings
      </a>
      <a
        href="/settings/security"
        class="block px-4 py-2 text-sm text-[--color-text-primary] hover:bg-[--color-surface-hover] transition-colors"
      >
        Security
      </a>

      <div class="border-t border-[--color-border] mt-1 pt-1">
        <button
          @click="signOut"
          class="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[--color-surface-hover] transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
</template>
