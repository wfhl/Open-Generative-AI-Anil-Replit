// User's preferred default models, chosen during onboarding. Studios read these
// on mount and fall back to the first catalog entry when unset or stale.

const KEYS = {
  image: 'og_default_image_model',
  video: 'og_default_video_model',
};

export function getDefaultModelId(kind) {
  try { return localStorage.getItem(KEYS[kind]) || null; } catch { return null; }
}

export function setDefaultModelId(kind, id) {
  try {
    if (id) localStorage.setItem(KEYS[kind], id);
    else localStorage.removeItem(KEYS[kind]);
  } catch { /* ignore */ }
}

const ONBOARDED_KEY = 'og_onboarded';

export function isOnboarded() {
  try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch { return true; }
}

export function markOnboarded() {
  try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch { /* ignore */ }
}
