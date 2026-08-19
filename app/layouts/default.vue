<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { AppConfigResponse } from '#shared/types/volume'

const route = useRoute()
const { data: appConfig } = await useFetch<AppConfigResponse>('/api/config')

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Volumes',
    icon: 'i-lucide-container',
    to: '/',
    active: route.path === '/'
  }
])

useHead({
  titleTemplate: title => title ? `${title} · Harbour` : 'Harbour'
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <div v-if="!collapsed" class="min-w-0">
          <p class="font-display text-lg tracking-tight text-highlighted">
            Harbour
          </p>
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted">
            Volume manager
          </p>
          <div class="wordmark-rule mt-3 w-16" />
        </div>
        <UIcon
          v-else
          name="i-lucide-anchor"
          class="mx-auto size-5 text-primary"
        />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="items"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <div v-if="!collapsed" class="space-y-2 px-1 text-xs text-muted">
          <p class="flex items-center gap-2">
            <UChip
              :color="appConfig?.docker.ok ? 'success' : 'error'"
              inset
              standalone
            />
            <span>{{ appConfig?.docker.ok ? `Engine ${appConfig.docker.version}` : 'Engine unreachable' }}</span>
          </p>
          <p v-if="appConfig?.volumeBind" class="truncate font-mono">
            Bound: {{ appConfig.volumeBind }}
          </p>
          <p v-else>
            No VOLUME_BIND set
          </p>
        </div>
        <UIcon
          v-else
          :name="appConfig?.docker.ok ? 'i-lucide-unplug' : 'i-lucide-plug-zap'"
          class="mx-auto size-4"
          :class="appConfig?.docker.ok ? 'text-success' : 'text-error'"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarToggle />
          </template>
          <template #right>
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4 sm:p-6">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
