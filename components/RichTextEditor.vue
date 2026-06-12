<template>
  <div class="border border-gray-200 rounded-xl overflow-hidden focus-within:border-peach-300 transition-colors">
    <!-- ツールバー -->
    <div class="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-100">
      <button type="button" title="見出し" @mousedown.prevent @click="exec('formatBlock', 'H3')" class="toolbar-btn font-bold">見出し</button>
      <span class="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" title="太字" @mousedown.prevent @click="exec('bold')" class="toolbar-btn font-bold">B</button>
      <button type="button" title="斜体" @mousedown.prevent @click="exec('italic')" class="toolbar-btn italic">I</button>
      <button type="button" title="下線" @mousedown.prevent @click="exec('underline')" class="toolbar-btn underline">U</button>
      <span class="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" title="箇条書き" @mousedown.prevent @click="exec('insertUnorderedList')" class="toolbar-btn">• リスト</button>
      <button type="button" title="番号付きリスト" @mousedown.prevent @click="exec('insertOrderedList')" class="toolbar-btn">1. リスト</button>
      <span class="w-px h-5 bg-gray-200 mx-1" />
      <button type="button" title="リンク" @mousedown.prevent @click="addLink" class="toolbar-btn">🔗 リンク</button>
      <button type="button" title="書式を解除" @mousedown.prevent @click="clearFormat" class="toolbar-btn text-gray-400">書式解除</button>
    </div>

    <!-- 編集エリア -->
    <div
      ref="editor"
      contenteditable="true"
      class="rich-editor-body px-4 py-3 min-h-[200px] max-h-[480px] overflow-y-auto text-sm text-gray-800 leading-relaxed outline-none"
      :data-placeholder="placeholder"
      @input="onInput"
      @blur="onInput"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const editor = ref<HTMLElement>()

const exec = (command: string, value?: string) => {
  editor.value?.focus()
  document.execCommand(command, false, value)
  onInput()
}

const addLink = () => {
  const url = window.prompt('リンク先のURLを入力してください', 'https://')
  if (url && url !== 'https://') exec('createLink', url)
}

const clearFormat = () => {
  exec('removeFormat')
  exec('formatBlock', 'DIV')
}

const onInput = () => {
  emit('update:modelValue', editor.value?.innerHTML ?? '')
}

// 既存データ読み込み時（編集画面）に反映。編集中の上書きは避ける
watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.innerHTML !== val && document.activeElement !== editor.value) {
    editor.value.innerHTML = val ?? ''
  }
})

onMounted(() => {
  if (editor.value) editor.value.innerHTML = props.modelValue ?? ''
})
</script>

<style scoped>
.toolbar-btn {
  @apply text-xs px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-peach-100 hover:text-peach-600 transition-colors;
}
.rich-editor-body:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}
.rich-editor-body :deep(h3),
.rich-editor-body h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0.5em 0 0.25em;
}
.rich-editor-body ul {
  list-style: disc;
  padding-left: 1.5em;
}
.rich-editor-body ol {
  list-style: decimal;
  padding-left: 1.5em;
}
.rich-editor-body a {
  color: #FF8C61;
  text-decoration: underline;
}
</style>
