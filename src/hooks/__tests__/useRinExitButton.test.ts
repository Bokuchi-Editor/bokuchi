import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { useRinExitButton } from '../useRinExitButton';

const dispatchKeyDown = (key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    document.dispatchEvent(event);
  });
  return event;
};

describe('useRinExitButton', () => {
  let onExit: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onExit = vi.fn<() => void>();
  });

  afterEach(() => {
    // Remove any overlay elements a test appended so cases stay isolated.
    document.body.innerHTML = '';
  });

  // T-RIN-01: while Rin is inactive nothing must react — no button, and Escape
  // must not exit (the listener is only installed when rinActive is true).
  it('T-RIN-01: inactive Rin shows no button and ignores Escape', () => {
    const { result } = renderHook(() => useRinExitButton(false, onExit));

    expect(result.current.exitVisible).toBe(false);

    const event = dispatchKeyDown('Escape');
    expect(onExit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  // T-RIN-02: on entering Rin the button starts visible so the way out is
  // discoverable (per the hook's contract).
  it('T-RIN-02: button is visible immediately when Rin activates', () => {
    const { result } = renderHook(() => useRinExitButton(true, onExit));
    expect(result.current.exitVisible).toBe(true);
  });

  // T-RIN-03: with nothing layered on top, Escape is Rin's to consume — it must
  // exit and preventDefault so Monaco/others do not also process the key.
  it('T-RIN-03: Escape with no overlay calls onExit and prevents default', () => {
    renderHook(() => useRinExitButton(true, onExit));

    const event = dispatchKeyDown('Escape');

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  // T-RIN-04 (#375 regression): with a MUI dialog open, Escape belongs to the
  // dialog — exiting Rin here was the actual bug. The event must be left
  // untouched (no preventDefault) so the dialog's own Esc handler can fire.
  it('T-RIN-04: Escape is ignored while a .MuiModal-root is in the DOM (#375)', () => {
    const modal = document.createElement('div');
    modal.className = 'MuiModal-root';
    document.body.appendChild(modal);

    renderHook(() => useRinExitButton(true, onExit));

    const event = dispatchKeyDown('Escape');

    expect(onExit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  // T-RIN-05 (#375 regression): same priority rule for the in-editor search
  // panel, which is marked with data-bokuchi-overlay instead of a MUI class.
  it('T-RIN-05: Escape is ignored while a [data-bokuchi-overlay] is in the DOM (#375)', () => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-bokuchi-overlay', '');
    document.body.appendChild(overlay);

    renderHook(() => useRinExitButton(true, onExit));

    dispatchKeyDown('Escape');

    expect(onExit).not.toHaveBeenCalled();
  });

  // T-RIN-06: once the overlay that swallowed Escape is gone, the next Escape
  // must exit Rin — Esc is processed front-to-back and Rin is last (#375).
  it('T-RIN-06: Escape exits Rin again after the overlay is removed', () => {
    const modal = document.createElement('div');
    modal.className = 'MuiModal-root';
    document.body.appendChild(modal);

    renderHook(() => useRinExitButton(true, onExit));

    dispatchKeyDown('Escape');
    expect(onExit).not.toHaveBeenCalled();

    modal.remove();
    dispatchKeyDown('Escape');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  // T-RIN-07: any non-Escape keydown means the user is typing, which starts the
  // fade-out (exitVisible false; the ~3s fade itself is CSS, not hook state).
  it('T-RIN-07: typing hides the exit button', () => {
    const { result } = renderHook(() => useRinExitButton(true, onExit));
    expect(result.current.exitVisible).toBe(true);

    dispatchKeyDown('a');

    expect(result.current.exitVisible).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
  });

  // T-RIN-08: moving the mouse reveals the button instantly so the exit is
  // always one gesture away after it faded out.
  it('T-RIN-08: mousemove shows the button again after typing hid it', () => {
    const { result } = renderHook(() => useRinExitButton(true, onExit));

    dispatchKeyDown('a');
    expect(result.current.exitVisible).toBe(false);

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    expect(result.current.exitVisible).toBe(true);
  });

  // T-RIN-09: leaving Rin must hide the button and detach the listeners —
  // otherwise a later Escape would call onExit for a mode that is already off.
  it('T-RIN-09: deactivating Rin hides the button and stops handling Escape', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useRinExitButton(active, onExit),
      { initialProps: { active: true } }
    );
    expect(result.current.exitVisible).toBe(true);

    rerender({ active: false });

    expect(result.current.exitVisible).toBe(false);
    dispatchKeyDown('Escape');
    expect(onExit).not.toHaveBeenCalled();
  });
});
