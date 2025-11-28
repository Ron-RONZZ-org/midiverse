<template>
  <div class="tree-selector-node" :style="{ paddingLeft: depth * 16 + 'px' }">
    <div 
      class="selector-node-content"
      :class="{ selected: selectedId === node.id }"
      @click.stop="$emit('select', node.id)"
    >
      <span 
        v-if="childNodes.length > 0" 
        class="expand-toggle" 
        @click.stop="expanded = !expanded"
      >
        {{ expanded ? '▼' : '▶' }}
      </span>
      <span v-else class="expand-placeholder">•</span>
      
      <span class="selector-node-name">{{ node.name }}</span>
      <span class="selector-node-category">({{ formatCategoryName(node.category) }})</span>
    </div>
    
    <div v-if="expanded && childNodes.length > 0" class="selector-children">
      <KeynodeTreeSelector 
        v-for="child in childNodes" 
        :key="child.id" 
        :node="child" 
        :all-nodes="allNodes"
        :selected-id="selectedId"
        :depth="depth + 1"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface TreeNode {
  id: string
  name: string
  category: string
  parentId: string | null
}

const props = defineProps<{
  node: TreeNode
  allNodes: TreeNode[]
  selectedId: string | null
  depth: number
}>()

defineEmits(['select'])

const expanded = ref(true)

const childNodes = computed(() => {
  return props.allNodes
    .filter(n => n.parentId === props.node.id)
    .sort((a, b) => a.name.localeCompare(b.name))
})

const formatCategoryName = (category: string) => {
  return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
</script>

<style scoped>
.tree-selector-node {
  user-select: none;
}

.selector-node-content {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
  margin-bottom: 1px;
}

.selector-node-content:hover {
  background: var(--bg-hover, rgba(0, 123, 255, 0.1));
}

.selector-node-content.selected {
  background: var(--selected-bg, rgba(0, 123, 255, 0.2));
  color: #007bff;
}

.expand-toggle {
  width: 1rem;
  text-align: center;
  font-size: 0.65rem;
  color: var(--text-secondary, #6c757d);
  flex-shrink: 0;
}

.expand-placeholder {
  width: 1rem;
  text-align: center;
  font-size: 0.65rem;
  color: var(--text-secondary, #6c757d);
  flex-shrink: 0;
}

.selector-node-name {
  font-weight: 500;
  color: var(--text-primary, #212529);
}

.selector-node-category {
  font-size: 0.8rem;
  color: var(--text-secondary, #6c757d);
}

.selector-children {
  border-left: 1px dashed var(--border-color, #dee2e6);
  margin-left: 0.5rem;
}
</style>
