import { describe, it, expect } from 'vitest';
import { findNodeInTree, updateTreeNode, toggleNodeExpand } from '../folderTreeUtils';
import type { FolderTreeNode } from '../../types/folderTree';

const createNode = (
  name: string,
  path: string,
  isDir: boolean,
  children: FolderTreeNode[] | null = null,
  isExpanded = false
): FolderTreeNode => ({
  name,
  path,
  isDirectory: isDir,
  children,
  isExpanded,
  isLoading: false,
});

const sampleTree: FolderTreeNode[] = [
  createNode('src', '/project/src', true, [
    createNode('index.ts', '/project/src/index.ts', false, []),
    createNode('utils', '/project/src/utils', true, [
      createNode('helper.ts', '/project/src/utils/helper.ts', false, []),
    ], true),
  ], true),
  createNode('README.md', '/project/README.md', false, []),
];

describe('findNodeInTree', () => {
  // T-FTU-01
  it('T-FTU-01: finds root-level node', () => {
    const result = findNodeInTree(sampleTree, '/project/README.md');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('README.md');
  });

  // T-FTU-02
  it('T-FTU-02: finds deeply nested node', () => {
    const result = findNodeInTree(sampleTree, '/project/src/utils/helper.ts');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('helper.ts');
  });

  // T-FTU-03
  it('T-FTU-03: returns null for non-existent path', () => {
    expect(findNodeInTree(sampleTree, '/project/missing')).toBeNull();
  });

  // T-FTU-04
  it('T-FTU-04: returns null for empty tree', () => {
    expect(findNodeInTree([], '/any')).toBeNull();
  });
});

describe('updateTreeNode', () => {
  // T-FTU-05
  it('T-FTU-05: updates a root-level node', () => {
    const result = updateTreeNode(sampleTree, '/project/README.md', (node) => ({
      ...node,
      name: 'UPDATED.md',
    }));
    expect(result[1].name).toBe('UPDATED.md');
    // Original unchanged
    expect(sampleTree[1].name).toBe('README.md');
  });

  // T-FTU-06
  it('T-FTU-06: updates a nested node', () => {
    const result = updateTreeNode(sampleTree, '/project/src/utils/helper.ts', (node) => ({
      ...node,
      isLoading: true,
    }));
    const helperNode = findNodeInTree(result, '/project/src/utils/helper.ts');
    expect(helperNode!.isLoading).toBe(true);
  });

  // T-FTU-07
  it('T-FTU-07: returns unchanged tree when path not found', () => {
    const result = updateTreeNode(sampleTree, '/missing', (node) => ({
      ...node,
      name: 'changed',
    }));
    expect(result[0].name).toBe('src');
    expect(result[1].name).toBe('README.md');
  });
});

describe('toggleNodeExpand', () => {
  // T-FTU-08
  it('T-FTU-08: collapses an expanded node', () => {
    const node = createNode('src', '/src', true, [], true);
    const result = toggleNodeExpand(node);
    expect(result.isExpanded).toBe(false);
  });

  // T-FTU-09
  it('T-FTU-09: marks loading when children are null (not yet loaded)', () => {
    const node = createNode('src', '/src', true, null, false);
    const result = toggleNodeExpand(node);
    expect(result.isLoading).toBe(true);
    expect(result.isExpanded).toBe(false);
  });

  // T-FTU-10
  it('T-FTU-10: expands when children are loaded but collapsed', () => {
    const node = createNode('src', '/src', true, [
      createNode('file.ts', '/src/file.ts', false, []),
    ], false);
    const result = toggleNodeExpand(node);
    expect(result.isExpanded).toBe(true);
  });
});
