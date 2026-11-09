import { describe, it, expect } from 'vitest';
import { buildDiagramErrorHtml, createSerialLock } from '../diagramCommon';

describe('createSerialLock', () => {
  it('runs tasks one at a time in call order', async () => {
    const lock = createSerialLock();
    const events: string[] = [];
    const task = (name: string, ms: number) => () =>
      new Promise<string>((resolve) => {
        events.push(`start:${name}`);
        setTimeout(() => { events.push(`end:${name}`); resolve(name); }, ms);
      });
    const [a, b] = await Promise.all([lock.run(task('a', 5)), lock.run(task('b', 0))]);
    expect([a, b]).toEqual(['a', 'b']);
    expect(events).toEqual(['start:a', 'end:a', 'start:b', 'end:b']);
  });

  it('releases the lock when a task rejects, and only that caller sees the error', async () => {
    const lock = createSerialLock();
    const failing = lock.run(async () => { throw new Error('boom'); });
    const next = lock.run(async () => 'ok');
    await expect(failing).rejects.toThrow('boom');
    expect(await next).toBe('ok');
  });
});

describe('buildDiagramErrorHtml', () => {
  it('escapes the message and labels the box', () => {
    const html = buildDiagramErrorHtml('x-error', 'X Error', new Error('bad <img src=x onerror=alert(1)>'));
    expect(html).toContain('class="x-error"');
    expect(html).toContain('<strong>X Error:</strong> bad &lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
  });

  it('stringifies non-Error values', () => {
    expect(buildDiagramErrorHtml('x', 'X', 'plain')).toContain('X:</strong> plain');
  });
});
