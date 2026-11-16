export function buildTree(list, idKey = 'menuId') {
  const nodes = new Map((list || []).map(item => [item[idKey], { ...item, children: [] }]))
  const roots = []
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
