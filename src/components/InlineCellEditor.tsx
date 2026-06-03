import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { NavDir } from '../utils/tableFormatter';

/** Nearest scrollable ancestor, used to undo any focus-induced scroll. */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

interface InlineCellEditorProps {
  /** Identifies the current cell; changes when navigating to another cell. */
  cellKey: string;
  /** Position within the (relatively-positioned) scroll container, in px. */
  top: number;
  left: number;
  width: number;
  /** The cell's height, used as the editor's minimum height. */
  height: number;
  initialValue: string;
  fontSize: number;
  background: string;
  color: string;
  /** Commit the value. `dir` requests navigation to an adjacent cell. */
  onCommit: (value: string, dir: NavDir | null) => void;
  onCancel: () => void;
}

/** Cap on the editor's auto-grown height; it scrolls internally beyond this. */
const MAX_EDITOR_HEIGHT = 320;

/**
 * A word-wrapping textarea floated over a preview table cell for inline editing
 * (#1). It edits the raw Markdown cell text; the parent maps it back to source.
 * Enter commits and moves down, Tab/Shift+Tab move right/left, Esc cancels.
 *
 * A textarea (not an <input>) is used so long cell text wraps the same way the
 * rendered table wraps it, instead of scrolling out of view on a single line.
 * The box auto-grows downward to fit the wrapped text — starting at the cell's
 * height and capping at MAX_EDITOR_HEIGHT, beyond which it scrolls internally.
 * Note Markdown table cells can't hold a literal newline, so Enter still
 * commits/navigates rather than inserting one.
 *
 * The component stays MOUNTED across cell navigation (the parent only changes
 * its position/value/cellKey). That avoids a focus event per move, which is
 * what made WKWebView run "scroll focused element into view" and jump the
 * preview. Only the first open and the final close fire a focus/blur.
 *
 * IME composition is respected so Japanese conversion (Enter to confirm) is
 * never treated as a commit.
 */
const InlineCellEditor: React.FC<InlineCellEditorProps> = ({
  cellKey,
  top,
  left,
  width,
  height,
  initialValue,
  fontSize,
  background,
  color,
  onCommit,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const [trackedKey, setTrackedKey] = useState(cellKey);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef(false);
  const composingRef = useRef(false);
  // Timestamp of the last composition end. Engines differ on ordering of the
  // confirming Enter vs compositionend; a short window after the end lets us
  // ignore that Enter even when it arrives with isComposing=false.
  const compositionEndedAtRef = useRef(0);
  const firstRunRef = useRef(true);
  const rafIdsRef = useRef<number[]>([]);

  // Reset the editable value when navigating to another cell. Doing it during
  // render (derived-state pattern) means the DOM already holds the new value by
  // the time the layout effect below selects it — no rAF race that sometimes
  // left the caret at the end instead of selecting all.
  if (cellKey !== trackedKey) {
    setTrackedKey(cellKey);
    setValue(initialValue);
    doneRef.current = false;
  }

  // Run `action`, then re-assert the scroll position over the next couple of
  // frames (preventScroll isn't honored everywhere and the scroll-into-view
  // can run asynchronously after our synchronous restore).
  const runPreservingScroll = (action: () => void) => {
    const el = inputRef.current;
    if (!el) return;
    const scroller = getScrollParent(el);
    if (!scroller) {
      action();
      return;
    }
    const st = scroller.scrollTop;
    const sl = scroller.scrollLeft;
    const restore = () => {
      if (scroller.scrollTop !== st || scroller.scrollLeft !== sl) {
        scroller.scrollTop = st;
        scroller.scrollLeft = sl;
      }
    };
    action();
    restore();
    const r1 = requestAnimationFrame(() => {
      restore();
      const r2 = requestAnimationFrame(restore);
      rafIdsRef.current.push(r2);
    });
    rafIdsRef.current.push(r1);
  };

  // Grow the textarea to fit the wrapped text (down to the cell height, up to
  // the cap, scrolling internally beyond it). The CSS minHeight keeps the box
  // at least as tall as the cell even when the content is shorter.
  const autoSize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_EDITOR_HEIGHT)}px`;
  };

  // Focus on first open; select all of the cell text after each cell change.
  // useLayoutEffect runs after the DOM reflects the new value (set during
  // render above) and before paint, so the selection is always the whole cell.
  // Only the first run focuses — navigation keeps the existing focus, so no
  // scroll-into-view fires.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    runPreservingScroll(() => {
      if (firstRunRef.current) {
        el.focus({ preventScroll: true });
        firstRunRef.current = false;
      }
      el.setSelectionRange(0, el.value.length);
      autoSize();
    });
  }, [cellKey]);

  useEffect(() => {
    const ids = rafIdsRef.current;
    return () => ids.forEach((id) => cancelAnimationFrame(id));
  }, []);

  const commit = (dir: NavDir | null) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCommit(value, dir);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ignore keys that belong to an IME composition or its confirming Enter.
    if (
      composingRef.current ||
      e.nativeEvent.isComposing ||
      Date.now() - compositionEndedAtRef.current < 120
    ) {
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      commit('down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commit(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      doneRef.current = true;
      onCancel();
    }
  };

  return (
    <textarea
      ref={inputRef}
      value={value}
      rows={1}
      wrap="soft"
      onChange={(e) => {
        setValue(e.target.value);
        autoSize();
      }}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
        compositionEndedAtRef.current = Date.now();
        autoSize();
      }}
      onBlur={() => commit(null)}
      spellCheck={false}
      style={{
        position: 'absolute',
        top,
        left,
        width,
        minHeight: height,
        maxHeight: MAX_EDITOR_HEIGHT,
        boxSizing: 'border-box',
        margin: 0,
        padding: '4px 6px',
        fontSize: `${fontSize}px`,
        fontFamily: 'inherit',
        lineHeight: 1.4,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        overflowY: 'auto',
        resize: 'none',
        border: '2px solid #1976d2',
        borderRadius: 0,
        outline: 'none',
        background,
        color,
        zIndex: 5,
      }}
    />
  );
};

export default InlineCellEditor;
