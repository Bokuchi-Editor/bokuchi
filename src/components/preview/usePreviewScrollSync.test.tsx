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
function Host({ show, onScrollChange }: { show: boolean; onScrollChange: (f: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const setScrollContainer = usePreviewScrollSync(ref, undefined, onScrollChange);
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
});
