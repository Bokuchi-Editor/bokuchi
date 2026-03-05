export type FolderTreeDisplayMode = 'persistent' | 'overlay' | 'off';

export interface FolderTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FolderTreeNode[] | null;
  isExpanded: boolean;
  isLoading: boolean;
}
