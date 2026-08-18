import { describe, expect, it } from 'vitest';
import { isPinPromptRequired } from '../src/lib/auth';
import { normalizePhone, toInternalAuthEmail } from '../src/lib/supabaseService';

describe('authentication helpers', () => {
  it('normalizes Egyptian local and international phone numbers', () => {
    expect(normalizePhone('01501600192').local).toBe('01501600192');
    expect(normalizePhone('+201501600192').local).toBe('01501600192');
    expect(normalizePhone('201501600192').e164).toBe('+201501600192');
  });

  it('creates deterministic internal auth emails', () => {
    expect(toInternalAuthEmail('01501600192')).toBe('u_201501600192@talabak.internal.net');
    expect(toInternalAuthEmail('+201501600192')).toBe('u_201501600192@talabak.internal.net');
  });

  it('requires PIN prompt when missing or expired', () => {
    expect(isPinPromptRequired()).toBe(true);
    expect(isPinPromptRequired(Date.now() - 49 * 60 * 60 * 1000)).toBe(true);
    expect(isPinPromptRequired(Date.now() - 1 * 60 * 60 * 1000)).toBe(false);
  });
});
