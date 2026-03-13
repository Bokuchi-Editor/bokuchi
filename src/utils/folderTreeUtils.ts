import { FolderTreeNode } from '../types/folderTree';

/**
 * Recursively find a node in the tree by path.
 */
export const findNodeInTree = (nodes: FolderTreeNode[], targetPath: string): FolderTreeNode | null => {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Recursively update a node in the tree by path using an update function.
 */
export const updateTreeNode = (
  nodes: FolderTreeNode[],
  targetPath: string,
  updateFn: (node: FolderTreeNode) => FolderTreeNode
): FolderTreeNode[] => {
  return nodes.map(node => {
    if (node.path === targetPath) {
      return updateFn(node);
    } else if (node.children && node.children.length > 0) {
      return { ...node, children: updateTreeNode(node.children, targetPath, updateFn) };
    }
    return node;
  });
};

/**
 * Toggle expand state of a node synchronously.
 * If expanded, collapse. If children are null, mark loading. Otherwise expand.
 */
export const toggleNodeExpand = (node: FolderTreeNode): FolderTreeNode => {
  if (node.isExpanded) {
    return { ...node, isExpanded: false };
  } else if (node.children === null) {
    return { ...node, isLoading: true };
  } else {
    return { ...node, isExpanded: true };
  }
};
