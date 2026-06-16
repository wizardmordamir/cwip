import { useState } from 'react';
import {
  addInTree,
  containerOf,
  findInTree,
  type LayoutNode,
  type LayoutView,
  moveInTree,
  removeInTree,
  reorderInContainer,
  updateInTree,
} from '../../../core/layout';

// Editor state for a set of layout views (e.g. a list's card/detail/dashboard, or a
// single 'page'), with undo/redo history that coalesces consecutive same-tag edits.
// Generic over the surface keys; the host supplies the initial views map.

type Views = Record<string, LayoutView>;
type Hist = { stack: Views[]; ptr: number; tag: string | null };

const emptyView = (): LayoutView => ({ enabled: false, nodes: [] });

export type UseLayoutEditorOptions = {
  // Which view tab is active first; defaults to the first key of `initialViews`.
  initialTab?: string;
};

export const useLayoutEditor = (initialViews: Views, opts: UseLayoutEditorOptions = {}) => {
  const tabs = Object.keys(initialViews);
  const [tab, setTab] = useState<string>(opts.initialTab ?? tabs[0] ?? 'card');
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  // A narrowed setter (not the raw Dispatch) so the hook's inferred return type is
  // portable across a consumer that has its own @types/react (bun-linked cwip).
  const setSelectedId = (id: string | null) => setSelectedIdState(id);
  const [hist, setHist] = useState<Hist>(() => ({ stack: [{ ...initialViews }], ptr: 0, tag: null }));

  const views = hist.stack[hist.ptr];
  const view = views[tab] ?? emptyView();
  const dirty = hist.ptr > 0;
  const canUndo = hist.ptr > 0;
  const canRedo = hist.ptr < hist.stack.length - 1;

  // Push a new snapshot; consecutive commits with the same `tag` coalesce (so a
  // text field's keystrokes are one undo step, not many).
  const commit = (producer: (cur: Views) => Views, tag: string | null = null) =>
    setHist((h) => {
      const next = producer(h.stack[h.ptr]);
      const coalesce = tag !== null && tag === h.tag && h.ptr === h.stack.length - 1;
      if (coalesce) {
        const stack = [...h.stack.slice(0, h.ptr), next];
        return { stack, ptr: h.ptr, tag };
      }
      const stack = [...h.stack.slice(0, h.ptr + 1), next];
      return { stack, ptr: stack.length - 1, tag };
    });

  const setActiveNodes = (fn: (nodes: LayoutNode[]) => LayoutNode[], tag: string | null = null) =>
    commit(
      (cur) => ({ ...cur, [tab]: { ...(cur[tab] ?? emptyView()), nodes: fn((cur[tab] ?? emptyView()).nodes) } }),
      tag,
    );

  const undo = () => setHist((h) => ({ ...h, ptr: Math.max(0, h.ptr - 1), tag: null }));
  const redo = () => setHist((h) => ({ ...h, ptr: Math.min(h.stack.length - 1, h.ptr + 1), tag: null }));

  const selectTab = (next: string) => {
    setTab(next);
    setSelectedId(null);
  };

  const setEnabled = (enabled: boolean) =>
    commit((cur) => ({ ...cur, [tab]: { ...(cur[tab] ?? emptyView()), enabled } }), `enabled:${tab}`);

  // Replace one or more views at once (applying a suggested or saved design).
  const applyViews = (next: Partial<Views>) => {
    commit((cur) => ({ ...cur, ...next }) as Views);
    setSelectedId(null);
  };

  const addNode = (node: LayoutNode, containerId: string | null = null) => {
    setActiveNodes((ns) => addInTree(ns, node, containerId));
    setSelectedId(node.id);
  };
  const removeNode = (id: string) => {
    setActiveNodes((ns) => removeInTree(ns, id));
    setSelectedIdState((s) => (s === id ? null : s));
  };
  const updateNode = (id: string, patch: Partial<LayoutNode>) =>
    setActiveNodes((ns) => updateInTree(ns, id, patch), `update:${id}`);
  const reorder = (ids: string[], containerId: string | null = null) =>
    setActiveNodes((ns) => reorderInContainer(ns, ids, containerId));
  // Move a node between top level and a section.
  const moveNode = (id: string, toContainerId: string | null) =>
    setActiveNodes((ns) => moveInTree(ns, id, toContainerId));

  const selectedNode = findInTree(view.nodes, selectedId ?? '');
  const selectedContainer = containerOf(view.nodes, selectedId);
  // Sections available as move targets / the "add into" container.
  const sections = view.nodes.filter((n) => n.type === 'section');
  // Adds go where you're working: the selected section, or the section holding the
  // selected node, else top level.
  const activeContainerId = selectedNode?.type === 'section' ? selectedNode.id : selectedContainer;

  return {
    tab,
    tabs,
    selectTab,
    view,
    setEnabled,
    applyViews,
    addNode,
    removeNode,
    updateNode,
    reorder,
    moveNode,
    selectedId,
    setSelectedId,
    selectedNode,
    selectedContainer,
    sections,
    activeContainerId,
    dirty,
    undo,
    redo,
    canUndo,
    canRedo,
    payload: views,
  };
};

export type LayoutEditorState = ReturnType<typeof useLayoutEditor>;
