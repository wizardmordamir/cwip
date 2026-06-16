import type { LayoutNode } from './types';

// Pure tree operations for a layout editor's node trees (one level of section
// nesting). Kept separate from any hook so they're unit-testable + framework-free.

export const findInTree = (nodes: LayoutNode[], id: string): LayoutNode | null => {
  for (const n of nodes) {
    if (n.id === id) return n;
    const child = n.children?.find((c) => c.id === id);
    if (child) return child;
  }
  return null;
};

export const updateInTree = (nodes: LayoutNode[], id: string, patch: Partial<LayoutNode>): LayoutNode[] =>
  nodes.map((n) =>
    n.id === id
      ? { ...n, ...patch }
      : n.children
        ? { ...n, children: n.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) }
        : n,
  );

export const removeInTree = (nodes: LayoutNode[], id: string): LayoutNode[] =>
  nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: n.children.filter((c) => c.id !== id) } : n));

export const addInTree = (nodes: LayoutNode[], node: LayoutNode, containerId: string | null): LayoutNode[] =>
  containerId
    ? nodes.map((n) => (n.id === containerId ? { ...n, children: [...(n.children ?? []), node] } : n))
    : [...nodes, node];

const reorderArr = (arr: LayoutNode[], ids: string[]): LayoutNode[] => {
  const m = new Map(arr.map((n) => [n.id, n]));
  return ids.map((i) => m.get(i)).filter((n): n is LayoutNode => Boolean(n));
};

export const reorderInContainer = (nodes: LayoutNode[], ids: string[], containerId: string | null): LayoutNode[] =>
  containerId
    ? nodes.map((n) => (n.id === containerId ? { ...n, children: reorderArr(n.children ?? [], ids) } : n))
    : reorderArr(nodes, ids);

export const containerOf = (nodes: LayoutNode[], id: string | null): string | null => {
  if (!id) return null;
  for (const n of nodes) if (n.children?.some((c) => c.id === id)) return n.id;
  return null;
};

// Move a node to a target container (or top level), preserving the node.
export const moveInTree = (nodes: LayoutNode[], id: string, toContainerId: string | null): LayoutNode[] => {
  const node = findInTree(nodes, id);
  if (!node) return nodes;
  return addInTree(removeInTree(nodes, id), node, toContainerId);
};
