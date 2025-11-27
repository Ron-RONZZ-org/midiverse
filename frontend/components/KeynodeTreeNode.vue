<template>
  <div class="tree-node" :style="{ paddingLeft: depth * 20 + 'px' }">
    <div class="node-content">
      <span 
        v-if="childNodes.length > 0" 
        class="expand-toggle" 
        @click="expanded = !expanded"
      >
        {{ expanded ? '▼' : '▶' }}
      </span>
      <span v-else class="expand-placeholder">•</span>
      
      <span class="node-name">{{ node.name }}</span>
      
      <span v-if="node.referenceCount > 0" class="reference-count" :title="`Referenced by ${node.referenceCount} markmap(s)`">
        ({{ node.referenceCount }})
      </span>
      
      <div class="node-actions">
        <button @click.stop="$emit('edit', node)" class="action-btn edit-btn" title="Edit">
          ✏️
        </button>
        <button @click.stop="$emit('add-child', node.id)" class="action-btn add-btn" title="Add Child">
          ➕
        </button>
        <button @click.stop="$emit('move', node)" class="action-btn move-btn" title="Move">
          ↔️
        </button>
        <button @click.stop="$emit('delete', node)" class="action-btn delete-btn" title="Delete">
          🗑️
        </button>
      </div>
    </div>
    
    <div v-if="expanded && childNodes.length > 0" class="child-nodes">
      <KeynodeTreeNode 
        v-for="child in childNodes" 
        :key="child.id" 
        :node="child" 
        :all-nodes="allNodes"
        :depth="depth + 1"
        @edit="$emit('edit', $event)"
        @add-child="$emit('add-child', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
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
  referenceCount: number
}

const props = defineProps<{
  node: TreeNode
  allNodes: TreeNode[]
  depth: number
}>()

defineEmits(['edit', 'add-child', 'delete', 'move'])

const expanded = ref(true)

const childNodes = computed(() => {
  return props.allNodes
    .filter(n => n.parentId === props.node.id)
    .sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<style scoped>
.tree-node {
  user-select: none;
  min-height: 32px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  transition: background 0.1s;
  min-height: 32px;
  background: var(--node-bg, rgba(255, 255, 255, 0.05));
  margin-bottom: 2px;
}

.node-content:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.1));
}

.expand-toggle {
  cursor: pointer;
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary, #aaa);
}

.expand-placeholder {
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-secondary, #aaa);
}

.node-name {
  flex: 1;
  font-weight: 500;
  color: var(--text-primary, #fff);
}

.reference-count {
  font-size: 0.8rem;
  color: var(--text-secondary, #aaa);
  background: var(--bg-secondary, rgba(255, 255, 255, 0.1));
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
}

.node-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.35rem;
  border-radius: 3px;
  font-size: 0.85rem;
  transition: background 0.1s;
}

.action-btn:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.1));
}

.edit-btn:hover {
  background: #e3f2fd;
}

.add-btn:hover {
  background: #e8f5e9;
}

.move-btn:hover {
  background: #fff3e0;
}

.delete-btn:hover {
  background: #ffebee;
}

.child-nodes {
  margin-left: 0.5rem;
  border-left: 1px dashed var(--border-color, #ddd);
}
</style>
