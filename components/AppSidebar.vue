<template>
  <aside
    :class="[
      'bg-white border-r border-gray-100 flex flex-col shadow-soft transition-all duration-200',
      collapsed ? 'w-16' : 'w-64'
    ]"
  >
    <!-- ロゴ -->
    <div :class="['py-5 border-b border-gray-100', collapsed ? 'px-3' : 'px-6']">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-peach-400 to-peach-600 rounded-xl flex items-center justify-center shadow-peach flex-shrink-0">
          <span class="text-white text-lg font-bold">こ</span>
        </div>
        <div v-if="!collapsed">
          <p class="font-bold text-gray-800 text-sm">こっこナビ</p>
          <p class="text-xs text-gray-400">管理画面</p>
        </div>
      </div>
    </div>

    <!-- ナビゲーション -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="sidebar-link"
        :class="[{ active: isActive(item.path) }, collapsed ? 'justify-center px-0' : '']"
        :title="collapsed ? item.label : ''"
      >
        <span class="text-xl">{{ item.icon }}</span>
        <span v-if="!collapsed" class="text-sm">{{ item.label }}</span>
      </NuxtLink>

      <div class="divider" />

      <p v-if="!collapsed" class="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">設定</p>

      <NuxtLink
        v-for="item in settingsItems"
        :key="item.path"
        :to="item.path"
        class="sidebar-link"
        :class="[{ active: isActive(item.path) }, collapsed ? 'justify-center px-0' : '']"
        :title="collapsed ? item.label : ''"
      >
        <span class="text-xl">{{ item.icon }}</span>
        <span v-if="!collapsed" class="text-sm">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- ユーザー情報 -->
    <div :class="['py-4 border-t border-gray-100', collapsed ? 'px-2' : 'px-4']">
      <div class="flex items-center gap-3" :class="{ 'justify-center': collapsed }">
        <div class="w-8 h-8 bg-peach-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span class="text-peach-600 text-sm font-medium">
            {{ adminProfile?.name?.charAt(0) ?? '管' }}
          </span>
        </div>
        <template v-if="!collapsed">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ adminProfile?.name ?? '管理者' }}</p>
            <p class="text-xs text-gray-400 truncate">{{ user?.email }}</p>
          </div>
          <button @click="logout" class="text-gray-400 hover:text-peach-500 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </template>
      </div>
    </div>

    <!-- 折りたたみボタン（最下部） -->
    <button
      @click="collapsed = !collapsed"
      class="flex items-center justify-center gap-2 py-2.5 text-gray-400 hover:text-peach-500 hover:bg-peach-50 transition-colors border-t border-gray-100"
      :title="collapsed ? 'メニューを開く' : 'メニューをたたむ'"
    >
      <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': collapsed }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
      <span v-if="!collapsed" class="text-xs">たたむ</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
const route = useRoute()
const { user, adminProfile, logout } = useAuth()

// 折りたたみ状態（ページ遷移後も維持、リロード後も復元）
const collapsed = useState('sidebar-collapsed', () => {
  if (import.meta.client) return localStorage.getItem('sidebar-collapsed') === '1'
  return false
})
watch(collapsed, (val) => {
  if (import.meta.client) localStorage.setItem('sidebar-collapsed', val ? '1' : '0')
})

const navItems = [
  { path: '/', label: 'ダッシュボード', icon: '🏠' },
  { path: '/users', label: 'ユーザー管理', icon: '👥' },
  { path: '/chat', label: 'チャット', icon: '💬' },
  { path: '/contents', label: 'コンテンツ管理', icon: '📝' },
  { path: '/events', label: 'イベント管理', icon: '📅' },
  { path: '/segments', label: 'セグメント管理', icon: '🎯' },
  { path: '/broadcasts', label: '配信管理', icon: '📢' },
  { path: '/diagnostics', label: '診断履歴', icon: '🧭' },
]

const settingsItems = [
  { path: '/settings/categories', label: '種別管理', icon: '📂' },
  { path: '/settings/tags', label: 'タグ管理', icon: '🏷️' },
  { path: '/settings/faq', label: 'FAQ管理', icon: '❓' },
  { path: '/settings/richmenu', label: 'リッチメニュー', icon: '📱' },
  { path: '/settings/onboarding', label: 'オンボーディング設定', icon: '🔧' },
  { path: '/settings/diagnosis', label: 'おすすめ診断設定', icon: '🧭' },
  { path: '/settings/admins', label: '管理者設定', icon: '👤' },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
