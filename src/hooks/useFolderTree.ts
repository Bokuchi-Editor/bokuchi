import { useState, useCallback, useEffect } from 'react';
import { FolderTreeNode } from '../types/folderTree';
import { desktopApi } from '../api/desktopApi';
import { storeApi } from '../api/storeApi';
import { findNodeInTree, updateTreeNode, toggleNodeExpand } from '../utils/folderTreeUtils';
import { extractFolderNameFromPath } from '../utils/pathUtils';

export const useFolderTree = (showAllFiles: boolean) => {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load a single directory level and return nodes
  const loadDirectory = useCallback(async (dirPath: string): Promise<FolderTreeNode[]> => {
    const entries = await desktopApi.readDirectory(dirPath, showAllFiles);
    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDirectory: entry.is_directory,
      children: entry.is_directory ? null : [],
      isExpanded: false,
      isLoading: false,
    }));
  }, [showAllFiles]);

  // Load tree from a root path
  const loadTree = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const nodes = await loadDirectory(path);
      setTree(nodes);
    } catch (error) {
      console.error('Failed to load folder tree:', error);
      setTree([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadDirectory]);

  // Open folder via dialog
  const openFolder = useCallback(async (): Promise<string | null> => {
    const selected = await desktopApi.openFolder();
    if (!selected) return null;

    setRootPath(selected);
    await loadTree(selected);
    await storeApi.saveFolderTreeRoot(selected);
    return selected;
  }, [loadTree]);

  // Close folder
  const closeFolder = useCallback(async () => {
    setRootPath(null);
    setTree([]);
    await storeApi.saveFolderTreeRoot(null);
  }, []);

  // Toggle expand/collapse for a directory node
  const toggleExpand = useCallback(async (nodePath: string) => {
    // First pass: mark loading or toggle
    setTree(prev => updateTreeNode(prev, nodePath, toggleNodeExpand));

    // Find the node and load children if needed
    const targetNode = findNodeInTree(tree, nodePath);
    if (targetNode && !targetNode.isExpanded && targetNode.children === null) {
      // Load children
      try {
        const children = await loadDirectory(nodePath);
        setTree(prev => updateTreeNode(prev, nodePath, (node) => ({
          ...node, children, isExpanded: true, isLoading: false,
        })));
      } catch (error) {
        console.error('Failed to load directory children:', error);
        setTree(prev => updateTreeNode(prev, nodePath, (node) => ({
          ...node, children: [], isExpanded: false, isLoading: false,
        })));
      }
    }
  }, [tree, loadDirectory]);

  // Refresh the entire tree
  const refreshTree = useCallback(async () => {
    if (rootPath) {
      await loadTree(rootPath);
    }
  }, [rootPath, loadTree]);

  // Restore root path on mount
  useEffect(() => {
    const restore = async () => {
      const savedRoot = await storeApi.loadFolderTreeRoot();
      if (savedRoot) {
        setRootPath(savedRoot);
        await loadTree(savedRoot);
      }
    };
    restore();
  }, [loadTree]);

  // Reload tree when showAllFiles changes
  useEffect(() => {
    if (rootPath) {
      loadTree(rootPath);
    }
  }, [showAllFiles]);

  const rootFolderName = extractFolderNameFromPath(rootPath);

  return {
    rootPath,
    rootFolderName,
    tree,
    isLoading,
    openFolder,
    closeFolder,
    toggleExpand,
    refreshTree,
  };
};
