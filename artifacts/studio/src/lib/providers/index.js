import { getAdapter, getAdapterForModel, Capability, PROVIDERS, getProviderMeta } from './registry.js';

export { Capability, PROVIDERS, getProviderMeta, getAdapter, getAdapterForModel };

// Normalized, provider-agnostic media client. The studios call this instead of
// a provider's client directly; each call is dispatched to the adapter that
// owns the selected model's provider. Today only MuAPI is registered, so every
// call routes to the MuAPI adapter — behaviour is identical to before.
class AIClient {
    generateImage(params) { return getAdapterForModel(params.model).generateImage(params); }
    generateVideo(params) { return getAdapterForModel(params.model).generateVideo(params); }
    generateI2I(params) { return getAdapterForModel(params.model).generateI2I(params); }
    generateI2V(params) { return getAdapterForModel(params.model).generateI2V(params); }
    processV2V(params) { return getAdapterForModel(params.model).processV2V(params); }
    processLipSync(params) { return getAdapterForModel(params.model).processLipSync(params); }

    // Uploads aren't tied to a specific model, so the caller names the provider
    // (defaults to MuAPI, matching the previous direct muapi.uploadFile calls).
    uploadFile(file, { provider = 'muapi' } = {}) {
        return getAdapter(provider).uploadFile(file);
    }

    // Poll an in-flight job. Pending-job reconciliation is MuAPI-only today.
    pollForResult(requestId, key, maxAttempts, interval, { provider = 'muapi' } = {}) {
        return getAdapter(provider).pollForResult(requestId, key, maxAttempts, interval);
    }

    getDimensionsFromAR(ar) {
        return getAdapter('muapi').getDimensionsFromAR(ar);
    }
}

export const ai = new AIClient();
