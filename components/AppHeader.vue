<template>
  <header class="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
    <div>
      <h1 class="text-lg font-semibold text-gray-800">{{ pageTitle }}</h1>
      <p class="text-xs text-gray-400">{{ currentDate }}</p>
    </div>
  </header>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/ja'
dayjs.locale('ja')

const route = useRoute()

const pageTitles: Record<string, string> = {
  '/': 'ダッシュボード',
  '/users': 'ユーザー管理',
  '/chat': 'チャット管理',
  '/contents': 'コンテンツ管理',
  '/segments': 'セグメント管理',
  '/broadcasts': '配信管理',
  '/settings/onboarding': 'オンボーディング設定',
  '/settings/admins': '管理者設定',
}

const pageTitle = computed(() => {
  const path = route.path
  if (pageTitles[path]) return pageTitles[path]
  if (path.startsWith('/users/')) return 'ユーザー詳細'
  if (path.startsWith('/contents/')) return 'コンテンツ編集'
  return 'こっこナビ管理画面'
})

const currentDate = computed(() => dayjs().format('YYYY年M月D日 (ddd)'))
</script>
