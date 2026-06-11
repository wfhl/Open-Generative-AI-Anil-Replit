import { muapiAdapter } from './muapiAdapter.js';
import { getProviderForModelId } from '../models.js';

// Capability constants — the normalized operations an adapter can implement.
// Models are tagged with one of these in models.js.
export const Capability = {
    TEXT_TO_IMAGE: 'text-to-image',
    IMAGE_TO_IMAGE: 'image-to-image',
    TEXT_TO_VIDEO: 'text-to-video',
    IMAGE_TO_VIDEO: 'image-to-video',
    VIDEO_TO_VIDEO: 'video-to-video',
    LIP_SYNC: 'lip-sync',
};

// Provider metadata, consumed by the Settings UI. `id` must match the
// `provider` tag on models so the resolver can dispatch correctly.
export const PROVIDERS = [
    {
        id: 'muapi',
        name: 'MuAPI',
        description: 'Aggregator powering all built-in models (Flux, SDXL, Kling, Veo, and more).',
        keyUrl: 'https://muapi.ai/access-keys',
        placeholder: 'mua_...',
    },
];

export const getProviderMeta = (id) => PROVIDERS.find((p) => p.id === id) || null;

// Adapter registry — provider id → adapter instance implementing the
// normalized capability interface. Downstream work registers more adapters here.
const adapters = {
    muapi: muapiAdapter,
};

/** Returns the adapter for a provider id, defaulting to MuAPI. */
export function getAdapter(provider) {
    return adapters[provider] || muapiAdapter;
}

/** Returns the adapter that owns a given model id. */
export function getAdapterForModel(modelId) {
    return getAdapter(getProviderForModelId(modelId));
}
