import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { variableApi } from '../variableApi';

vi.mock('@tauri-apps/api/core');

beforeEach(() => {
  vi.mocked(invoke).mockReset();
});

describe('variableApi.setGlobalVariable', () => {
  it('returns success when invoke resolves', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const result = await variableApi.setGlobalVariable('key', 'value');
    expect(result).toEqual({ success: true });
    expect(invoke).toHaveBeenCalledWith('set_global_variable', { name: 'key', value: 'value' });
  });

  it('returns error message when invoke rejects with Error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('backend failure'));
    const result = await variableApi.setGlobalVariable('key', 'value');
    expect(result.success).toBe(false);
    expect(result.error).toBe('backend failure');
  });

  it('returns stringified error for non-Error rejection', async () => {
    vi.mocked(invoke).mockRejectedValue('string error');
    const result = await variableApi.setGlobalVariable('key', 'value');
    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('returns "Unknown error" when rejection value is null', async () => {
    vi.mocked(invoke).mockRejectedValue(null);
    const result = await variableApi.setGlobalVariable('key', 'value');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });
});

describe('variableApi.getGlobalVariables', () => {
  it('returns variables on success', async () => {
    const vars = { foo: 'bar', baz: 'qux' };
    vi.mocked(invoke).mockResolvedValue(vars);
    const result = await variableApi.getGlobalVariables();
    expect(result).toEqual(vars);
  });

  it('returns empty object when invoke returns null', async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const result = await variableApi.getGlobalVariables();
    expect(result).toEqual({});
  });

  it('returns empty object on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('fail'));
    const result = await variableApi.getGlobalVariables();
    expect(result).toEqual({});
  });
});

describe('variableApi.loadVariablesFromYAML', () => {
  it('returns success when invoke resolves', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const result = await variableApi.loadVariablesFromYAML('key: value');
    expect(result).toEqual({ success: true });
    expect(invoke).toHaveBeenCalledWith('load_variables_from_yaml', { yamlContent: 'key: value' });
  });

  it('returns error on invalid YAML', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('invalid yaml'));
    const result = await variableApi.loadVariablesFromYAML(':::');
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid yaml');
  });

  it('returns "Unknown error" when rejection value is null', async () => {
    vi.mocked(invoke).mockRejectedValue(null);
    const result = await variableApi.loadVariablesFromYAML(':::');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });
});

describe('variableApi.exportVariablesToYAML', () => {
  it('returns YAML string on success', async () => {
    vi.mocked(invoke).mockResolvedValue('foo: bar\n');
    const result = await variableApi.exportVariablesToYAML();
    expect(result).toBe('foo: bar\n');
  });

  it('returns empty string when invoke returns null', async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const result = await variableApi.exportVariablesToYAML();
    expect(result).toBe('');
  });

  it('returns empty string on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('fail'));
    const result = await variableApi.exportVariablesToYAML();
    expect(result).toBe('');
  });
});

describe('variableApi.processMarkdown', () => {
  it('returns processed content on success', async () => {
    vi.mocked(invoke).mockResolvedValue('expanded content');
    const result = await variableApi.processMarkdown('{{var}}', { var: 'expanded content' });
    expect(result).toEqual({ processedContent: 'expanded content' });
  });

  it('returns original content with error message on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('process failed'));
    const result = await variableApi.processMarkdown('raw content');
    expect(result.processedContent).toBe('raw content');
    expect(result.error).toBe('process failed');
  });

  it('returns "Unknown error" when rejection value is null', async () => {
    vi.mocked(invoke).mockRejectedValue(null);
    const result = await variableApi.processMarkdown('raw content');
    expect(result.processedContent).toBe('raw content');
    expect(result.error).toBe('Unknown error');
  });
});

// T-VA-01: YAML round-trip: export then load preserves variables
describe('variableApi YAML round-trip', () => {
  it('T-VA-01: exported YAML can be loaded back', async () => {
    const yamlContent = 'name: Alice\ngreeting: Hello World\n';

    // export returns YAML string
    vi.mocked(invoke).mockResolvedValueOnce(yamlContent);
    const exported = await variableApi.exportVariablesToYAML();
    expect(exported).toBe(yamlContent);

    // load accepts the same YAML string
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    const loadResult = await variableApi.loadVariablesFromYAML(exported);
    expect(loadResult.success).toBe(true);
    expect(invoke).toHaveBeenCalledWith('load_variables_from_yaml', { yamlContent: exported });
  });
});

describe('variableApi.getExpandedMarkdown', () => {
  it('returns expanded content on success', async () => {
    vi.mocked(invoke).mockResolvedValue('fully expanded');
    const result = await variableApi.getExpandedMarkdown('{{var}}', { var: 'val' });
    expect(result).toBe('fully expanded');
  });

  it('throws on error', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('expand failed'));
    await expect(variableApi.getExpandedMarkdown('content')).rejects.toThrow('expand failed');
  });
});
