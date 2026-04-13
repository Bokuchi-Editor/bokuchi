import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAutoSave } from '../useAutoSave';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';
import type { Tab } from '../../types/tab';
import { asMock } from '../../test-utils';

describe('useAutoSave', () => {
  let saveTab: ReturnType<typeof vi.fn>;
  let showSaveStatus: ReturnType<typeof vi.fn>;
  const t = (key: string) => key;

  const activeTab: Tab = {
    id: 'tab1',
    title: 'test.md',
    content: '# Hello',
    filePath: '/path/test.md',
    isModified: true,
    isNew: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    saveTab = vi.fn().mockResolvedValue(true);
    showSaveStatus = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultParams = () => ({
    activeTab,
    appSettings: { ...DEFAULT_APP_SETTINGS, advanced: { ...DEFAULT_APP_SETTINGS.advanced, autoSave: true } },
    isSettingsLoaded: true,
    isInitialized: true,
    saveTab: asMock<(tabId: string) => Promise<boolean>>(saveTab),
    showSaveStatus: asMock<(message: string) => void>(showSaveStatus),
    t,
  });

  // T-AS-01: triggers save after 3 seconds
  it('T-AS-01: triggers save after 3 seconds of inactivity', async () => {
    renderHook(() => useAutoSave(defaultParams()));

    // Before 3 seconds, saveTab should not be called
    await vi.advanceTimersByTimeAsync(2999);
    expect(saveTab).not.toHaveBeenCalled();

    // After 3 seconds
    await vi.advanceTimersByTimeAsync(1);
    expect(saveTab).toHaveBeenCalledWith('tab1');
  });

  // T-AS-02: does not trigger when autoSave is disabled
  it('T-AS-02: does not trigger when autoSave is disabled', async () => {
    const params = defaultParams();
    params.appSettings = { ...params.appSettings, advanced: { ...params.appSettings.advanced, autoSave: false } };
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(5000);
    expect(saveTab).not.toHaveBeenCalled();
  });

  // T-AS-03: does not trigger for new tabs
  it('T-AS-03: does not trigger for new (unsaved) tabs', async () => {
    const params = defaultParams();
    params.activeTab = { ...activeTab, isNew: true, filePath: undefined };
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(5000);
    expect(saveTab).not.toHaveBeenCalled();
  });

  // T-AS-04: does not trigger for unmodified tabs
  it('T-AS-04: does not trigger for unmodified tabs', async () => {
    const params = defaultParams();
    params.activeTab = { ...activeTab, isModified: false };
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(5000);
    expect(saveTab).not.toHaveBeenCalled();
  });

  // T-AS-05: does not trigger when not initialized
  it('T-AS-05: does not trigger when not initialized', async () => {
    const params = defaultParams();
    params.isInitialized = false;
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(5000);
    expect(saveTab).not.toHaveBeenCalled();
  });

  // T-AS-06: shows save status on successful save
  it('T-AS-06: shows save status on successful save', async () => {
    renderHook(() => useAutoSave(defaultParams()));

    await vi.advanceTimersByTimeAsync(3000);
    expect(showSaveStatus).toHaveBeenCalledWith('statusBar.saved');
  });

  // T-AS-07: does not trigger when tab has no filePath
  it('T-AS-07: does not trigger for tab without filePath', async () => {
    const params = defaultParams();
    params.activeTab = { ...activeTab, filePath: undefined, isNew: false };
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(5000);
    expect(saveTab).not.toHaveBeenCalled();
  });

  // T-AS-08: does not trigger when isSettingsLoaded is false
  it('T-AS-08: does not trigger when settings not loaded', async () => {
    const params = defaultParams();
    params.isSettingsLoaded = false;
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(5000);
    expect(saveTab).not.toHaveBeenCalled();
  });

  // T-AS-09: content change resets the 3-second timer
  it('T-AS-09: resets timer on content change, only saves once', async () => {
    const params = defaultParams();
    const { rerender } = renderHook(
      (props) => useAutoSave(props),
      { initialProps: params },
    );

    // Wait 2 seconds (timer running)
    await vi.advanceTimersByTimeAsync(2000);
    expect(saveTab).not.toHaveBeenCalled();

    // Content changes -> timer should reset
    rerender({
      ...params,
      activeTab: { ...activeTab, content: '# Updated' },
    });

    // Wait another 2 seconds (only 2s since reset, should not save yet)
    await vi.advanceTimersByTimeAsync(2000);
    expect(saveTab).not.toHaveBeenCalled();

    // Wait 1 more second (3s since reset, should save now)
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveTab).toHaveBeenCalledTimes(1);
  });

  // T-AS-10: does not show status when save fails
  it('T-AS-10: does not show save status when save fails', async () => {
    const params = defaultParams();
    saveTab.mockRejectedValue(new Error('save error'));
    renderHook(() => useAutoSave(params));

    await vi.advanceTimersByTimeAsync(3000);
    expect(showSaveStatus).not.toHaveBeenCalled();
  });
});
