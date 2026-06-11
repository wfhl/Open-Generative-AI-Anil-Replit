// Per-provider API key store (BYOK — bring your own key).
//
// Each provider's key is persisted in localStorage. MuAPI keeps using the
// legacy `muapi_key` slot so that everything that already reads it (AuthModal,
// the studios' pre-generation gating checks, the upload pickers) keeps working
// unchanged — that mapping IS the migration of the previously saved MuAPI key.
// Any other provider stores its key under `og_key_<provider>`.

const LEGACY_MUAPI_SLOT = 'muapi_key';
const STORAGE_PREFIX = 'og_key_';

// Providers whose key lives in a legacy / well-known slot rather than the
// prefixed one. Lets us migrate without touching existing reads/writes.
const LEGACY_SLOTS = { muapi: LEGACY_MUAPI_SLOT };

export const slotFor = (provider) => LEGACY_SLOTS[provider] || `${STORAGE_PREFIX}${provider}`;

/**
 * Returns the stored key for a provider, or '' if none is set.
 * For MuAPI, an injected `window.__MUAPI_KEY__` (used by some hosts) wins.
 */
export function getProviderKey(provider) {
    if (provider === 'muapi' && typeof window !== 'undefined' && window.__MUAPI_KEY__) {
        return window.__MUAPI_KEY__;
    }
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(slotFor(provider)) || '';
}

/** Persists (or clears, when empty) a provider's key. */
export function setProviderKey(provider, key) {
    const value = (key || '').trim();
    if (value) localStorage.setItem(slotFor(provider), value);
    else localStorage.removeItem(slotFor(provider));
}

/** True when a non-empty key is stored for the provider. */
export function hasProviderKey(provider) {
    return !!getProviderKey(provider);
}

/** Removes a provider's stored key. */
export function removeProviderKey(provider) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(slotFor(provider));
}
