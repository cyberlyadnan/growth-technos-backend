import {
  decryptSecret,
  encryptSecret,
  isVaultConfigured,
  maskSecret,
  resetVaultKeyCache,
  rewrapSecret,
} from '@core/security/vault-crypto';

describe('vault-crypto', () => {
  afterEach(() => {
    process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION = '1';
    process.env.AGENCY_VAULT_KEYS_JSON =
      '{"1":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","2":"fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"}';
    resetVaultKeyCache();
  });

  it('encrypts and decrypts with AES-256-GCM', () => {
    const bundle = encryptSecret('super-secret-value');
    expect(bundle.algorithm).toBe('aes-256-gcm');
    expect(bundle.keyVersion).toBe('1');
    expect(bundle.ciphertext).toBeTruthy();
    expect(decryptSecret(bundle)).toBe('super-secret-value');
  });

  it('masks secrets without exposing the full value', () => {
    expect(maskSecret('abcdefghij')).toMatch(/•+ghij$/);
  });

  it('rewraps under a new active key version', () => {
    const original = encryptSecret('rotate-me');
    process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION = '2';
    resetVaultKeyCache();
    const rewrapped = rewrapSecret(original);
    expect(rewrapped.keyVersion).toBe('2');
    expect(decryptSecret(rewrapped)).toBe('rotate-me');
  });

  it('reports unconfigured when active key is missing', () => {
    process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION = '';
    process.env.AGENCY_VAULT_KEYS_JSON = '';
    resetVaultKeyCache();
    expect(isVaultConfigured()).toBe(false);
  });

  it('refuses encrypt when vault is not configured', () => {
    process.env.AGENCY_VAULT_ACTIVE_KEY_VERSION = '';
    process.env.AGENCY_VAULT_KEYS_JSON = '';
    resetVaultKeyCache();
    expect(() => encryptSecret('nope')).toThrow(/not configured/i);
  });
});
