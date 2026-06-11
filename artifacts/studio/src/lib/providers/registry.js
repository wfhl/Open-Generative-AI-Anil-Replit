import { muapiAdapter } from './muapiAdapter.js';
import { falAdapter } from './falAdapter.js';
import { replicateAdapter } from './replicateAdapter.js';
import { kieAdapter } from './kieAdapter.js';
import { wavespeedAdapter } from './wavespeedAdapter.js';
import { googleAdapter } from './googleAdapter.js';
import { openaiAdapter } from './openaiAdapter.js';
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

// Provider metadata, consumed by the Settings UI and onboarding. `id` must match
// the `provider` tag on models so the resolver can dispatch correctly.
// `recommended` providers are highlighted in onboarding.
export const PROVIDERS = [
    {
        id: 'muapi',
        name: 'MuAPI',
        description: 'Aggregator powering all built-in models (Flux, SDXL, Kling, Veo, and more).',
        keyUrl: 'https://muapi.ai/access-keys',
        placeholder: 'mua_...',
        recommended: true,
    },
    {
        id: 'fal',
        name: 'fal.ai',
        description: 'Fast aggregator for Flux, Kling, MiniMax, Stable Video, and more.',
        keyUrl: 'https://fal.ai/dashboard/keys',
        placeholder: 'fal-...',
        recommended: true,
    },
    {
        id: 'replicate',
        name: 'Replicate',
        description: 'Run thousands of community and official image/video models.',
        keyUrl: 'https://replicate.com/account/api-tokens',
        placeholder: 'r8_...',
        recommended: true,
    },
    {
        id: 'kie',
        name: 'Kie.ai',
        description: 'Aggregator with Nano Banana, Flux Kontext, Veo, and more.',
        keyUrl: 'https://kie.ai/api-key',
        placeholder: 'kie-...',
    },
    {
        id: 'wavespeed',
        name: 'WaveSpeed',
        description: 'High-throughput image and video generation endpoints.',
        keyUrl: 'https://wavespeed.ai/dashboard/api-keys',
        placeholder: 'ws-...',
    },
    {
        id: 'google',
        name: 'Google AI',
        description: 'Gemini image (Nano Banana), Imagen, and Veo video — direct.',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        placeholder: 'AIza...',
    },
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'GPT Image (gpt-image-1) text-to-image and edits.',
        keyUrl: 'https://platform.openai.com/api-keys',
        placeholder: 'sk-...',
    },
];

export const getProviderMeta = (id) => PROVIDERS.find((p) => p.id === id) || null;

// Adapter registry — provider id → adapter instance implementing the
// normalized capability interface.
const adapters = {
    muapi: muapiAdapter,
    fal: falAdapter,
    replicate: replicateAdapter,
    kie: kieAdapter,
    wavespeed: wavespeedAdapter,
    google: googleAdapter,
    openai: openaiAdapter,
};

/** Returns the adapter for a provider id, defaulting to MuAPI. */
export function getAdapter(provider) {
    return adapters[provider] || muapiAdapter;
}

/** Returns the adapter that owns a given model id. */
export function getAdapterForModel(modelId) {
    return getAdapter(getProviderForModelId(modelId));
}
