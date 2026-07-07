import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { usePreviewScrollSync } from './usePreviewScrollSync';

function sizeEl(el: HTMLElement) {
  Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 200, configurable: true });
  let _t = 0;
  Object.defineProperty(el, 'scrollTop', { get: () => _t, set: (v) => { _t = v; }, configurable: true });
}

// Mirrors Preview.tsx: attach the hook's returned callback ref to the scroll
// container, which is conditionally rendered. When `show` is false the container
// is replaced by a different element type (as Marp mode swaps in <MarpPreview>),
// forcing React to unmount it and mount a brand-new node on return.
function Host({
  show,
  scrollFraction,
  onScrollChange,
}: {
  show: boolean;
  scrollFraction?: number;
  onScrollChange: (f: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const setScrollContainer = usePreviewScrollSync(ref, scrollFraction, onScrollChange);
  return show ? <div data-testid="sc" ref={setScrollContainer} /> : <p data-testid="marp">marp</p>;
}

describe('usePreviewScrollSync', () => {
  it('reports a user scroll back through onScrollChange', () => {
    const onScrollChange = vi.fn();
    const { getByTestId } = render(<Host show={true} onScrollChange={onScrollChange} />);
    const sc = getByTestId('sc');
    sizeEl(sc);
    act(() => { sc.scrollTop = 400; sc.dispatchEvent(new Event('scroll')); });
    expect(onScrollChange).toHaveBeenCalledWith(0.5); // 400 / (1000-200)
  });

  // Regression: switching to a Marp tab and back replaced the preview scroll
  // container; the report listener stayed bound to the detached old node, so
  // preview→editor scroll sync silently died (even back on a Markdown tab).
  it('still reports after the scroll container is remounted (Marp round-trip)', () => {
    const onScrollChange = vi.fn();
    const { rerender, getByTestId } = render(<Host show={true} onScrollChange={onScrollChange} />);
    sizeEl(getByTestId('sc'));

    rerender(<Host show={false} onScrollChange={onScrollChange} />); // -> "Marp": container unmounts
    rerender(<Host show={true} onScrollChange={onScrollChange} />);  // -> back to MD: NEW container node
    const sc = getByTestId('sc');
    sizeEl(sc);

    act(() => { sc.scrollTop = 600; sc.dispatchEvent(new Event('scroll')); });
    expect(onScrollChange).toHaveBeenCalledWith(0.75); // 600 / (1000-200)
  });

  // editor→preview direction: an incoming scrollFraction from the editor is
  // applied to the container as fraction * (scrollHeight - clientHeight).
  it('applies an incoming scrollFraction to the container', () => {
    const onScrollChange = vi.fn();
    const { rerender, getByTestId } = render(
      <Host show={true} onScrollChange={onScrollChange} />,
    );
    const sc = getByTestId('sc');
    sizeEl(sc);

    rerender(<Host show={true} scrollFraction={0.5} onScrollChange={onScrollChange} />);

    expect(sc.scrollTop).toBe(400); // 0.5 * (1000-200)
  });

  // Feedback-loop guard: the programmatic scroll above makes the browser fire
  // a scroll event on the container. That event must NOT be reported back
  // through onScrollChange, otherwise editor→preview sync would echo into
  // preview→editor sync and the two panes would fight each other. The guard is
  // released on the next animation frame so real user scrolls still report.
  it('does not report the scroll event caused by a programmatic scroll', () => {
    const rafCallbacks: Array<(time: number) => void> = [];
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: (time: number) => void) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });
    try {
      const onScrollChange = vi.fn();
      const { rerender, getByTestId } = render(
        <Host show={true} onScrollChange={onScrollChange} />,
      );
      const sc = getByTestId('sc');
      sizeEl(sc);

      // Editor drives the preview to 0.5 (programmatic scroll)
      rerender(<Host show={true} scrollFraction={0.5} onScrollChange={onScrollChange} />);
      expect(sc.scrollTop).toBe(400);

      // The scroll event produced by our own scrollTop assignment fires before
      // the next animation frame — it must be swallowed by the guard.
      act(() => { sc.dispatchEvent(new Event('scroll')); });
      expect(onScrollChange).not.toHaveBeenCalled();

      // After the animation frame the guard is released: a genuine user scroll
      // is reported again.
      act(() => { rafCallbacks.forEach((cb) => cb(0)); });
      act(() => { sc.scrollTop = 600; sc.dispatchEvent(new Event('scroll')); });
      expect(onScrollChange).toHaveBeenCalledWith(0.75);
    } finally {
      rafSpy.mockRestore();
    }
  });
});
