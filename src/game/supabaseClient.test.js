// src/game/supabaseClient.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the supabase factory so no real client is constructed.
const createClientMock = vi.fn((url, key) => ({ __client: true, url, key }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (url, key) => createClientMock(url, key),
}));

import { getSupabase } from './supabaseClient.js';

afterEach(() => {
  vi.unstubAllEnvs();
  createClientMock.mockClear();
});

describe('getSupabase', () => {
  it('returns null when both env vars are missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(getSupabase()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns null when only the URL is present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(getSupabase()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('creates and returns a client when both env vars are present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
    const client = getSupabase();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      'https://demo.supabase.co',
      'anon-key-123',
    );
    expect(client).toEqual({
      __client: true,
      url: 'https://demo.supabase.co',
      key: 'anon-key-123',
    });
  });
});
