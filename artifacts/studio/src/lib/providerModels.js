// Curated, capability-tagged model catalogs for the BYOK providers.
//
// These mirror the shape of the built-in MuAPI models in models.js (id, name,
// provider, capability, inputs schema, imageField/maxImages for i2i/i2v) so the
// existing dropdowns and `getXForModel` helpers work unchanged. models.js
// imports these and pushes them onto the t2i/i2i/t2v/i2v arrays.
//
// fal.ai and Replicate are additionally augmented at runtime by live discovery
// (see providerStatus.js / main.js); these curated entries are the always-present
// baseline and the fallback when discovery is unavailable.

const IMG_AR = ['1:1', '16:9', '9:16', '4:3', '3:4'];
const VID_AR = ['16:9', '9:16', '1:1'];

const prompt = { type: 'string', title: 'Prompt', name: 'prompt', description: 'Prompt' };

const arInput = (ars = IMG_AR) => ({
  enum: ars, title: 'Aspect Ratio', name: 'aspect_ratio', type: 'string',
  description: 'Aspect ratio of the output.', default: ars[0],
});

const resInput = (vals, name = 'resolution') => ({
  enum: vals, title: name === 'quality' ? 'Quality' : 'Resolution', name, type: 'string',
  description: 'Output resolution.', default: vals[0],
});

const durInput = (vals) => ({
  enum: vals, title: 'Duration', name: 'duration', type: 'int',
  description: 'Duration in seconds.', default: vals[0],
});

const t2i = (id, name, inputs = { prompt, aspect_ratio: arInput() }, extra = {}) =>
  ({ id, name, provider: extra.provider, capability: 'text-to-image', inputs, ...extra });

const i2i = (id, name, inputs = { prompt, aspect_ratio: arInput() }, extra = {}) =>
  ({ id, name, provider: extra.provider, capability: 'image-to-image', imageField: 'image_url', maxImages: extra.maxImages || 1, inputs, ...extra });

const t2v = (id, name, inputs, extra = {}) =>
  ({ id, name, provider: extra.provider, capability: 'text-to-video', inputs, ...extra });

const i2v = (id, name, inputs, extra = {}) =>
  ({ id, name, provider: extra.provider, capability: 'image-to-video', imageField: 'image_url', inputs, ...extra });

const withProvider = (provider, list) => list.map((m) => ({ ...m, provider }));

// ── fal.ai ──────────────────────────────────────────────────────────────────
const FAL_T2I = withProvider('fal', [
  t2i('fal-ai/flux/schnell', 'FLUX.1 [schnell]'),
  t2i('fal-ai/flux/dev', 'FLUX.1 [dev]'),
  t2i('fal-ai/flux-pro/v1.1', 'FLUX1.1 [pro]'),
  t2i('fal-ai/recraft-v3', 'Recraft V3'),
  t2i('fal-ai/ideogram/v2', 'Ideogram V2'),
]);
const FAL_I2I = withProvider('fal', [
  i2i('fal-ai/flux/dev/image-to-image', 'FLUX.1 [dev] Image-to-Image'),
  i2i('fal-ai/flux-pro/kontext', 'FLUX.1 Kontext [pro]'),
]);
const FAL_T2V = withProvider('fal', [
  t2v('fal-ai/kling-video/v1.5/standard/text-to-video', 'Kling 1.5 (T2V)', { prompt, aspect_ratio: arInput(VID_AR), duration: durInput([5, 10]) }),
  t2v('fal-ai/minimax/video-01', 'MiniMax Video-01', { prompt, aspect_ratio: arInput(VID_AR) }),
]);
const FAL_I2V = withProvider('fal', [
  i2v('fal-ai/kling-video/v1.5/standard/image-to-video', 'Kling 1.5 (I2V)', { prompt, aspect_ratio: arInput(VID_AR), duration: durInput([5, 10]) }),
  i2v('fal-ai/stable-video', 'Stable Video Diffusion', { prompt, aspect_ratio: arInput(VID_AR) }),
]);

// ── Replicate ─────────────────────────────────────────────────────────────────
const REPLICATE_T2I = withProvider('replicate', [
  t2i('black-forest-labs/flux-schnell', 'FLUX Schnell'),
  t2i('black-forest-labs/flux-dev', 'FLUX Dev'),
  t2i('stability-ai/sdxl', 'SDXL'),
]);
const REPLICATE_I2I = withProvider('replicate', [
  i2i('black-forest-labs/flux-kontext-pro', 'FLUX Kontext Pro'),
]);
const REPLICATE_T2V = withProvider('replicate', [
  t2v('minimax/video-01', 'MiniMax Video-01', { prompt, aspect_ratio: arInput(VID_AR) }),
  t2v('lightricks/ltx-video', 'LTX Video', { prompt, aspect_ratio: arInput(VID_AR) }),
]);
const REPLICATE_I2V = withProvider('replicate', [
  i2v('stability-ai/stable-video-diffusion', 'Stable Video Diffusion', { prompt, aspect_ratio: arInput(VID_AR) }),
]);

// ── Kie.ai (unified Jobs API; apiModel = kie model string) ─────────────────────
const KIE_T2I = withProvider('kie', [
  t2i('kie/google/nano-banana', 'Nano Banana (Gemini)', { prompt, aspect_ratio: arInput() }, { apiModel: 'google/nano-banana' }),
  t2i('kie/flux-kontext-pro', 'FLUX Kontext Pro', { prompt, aspect_ratio: arInput() }, { apiModel: 'flux-kontext-pro' }),
]);
const KIE_T2V = withProvider('kie', [
  t2v('kie/veo3', 'Veo 3', { prompt, aspect_ratio: arInput(VID_AR) }, { apiModel: 'veo3' }),
]);

// ── WaveSpeed (model path = id, drop the wavespeed/ prefix used for our id) ─────
const WS_T2I = withProvider('wavespeed', [
  t2i('wavespeed-ai/flux-schnell', 'FLUX Schnell'),
  t2i('wavespeed-ai/flux-dev', 'FLUX Dev'),
]);
const WS_T2V = withProvider('wavespeed', [
  t2v('wavespeed-ai/wan-2.1/t2v-480p', 'Wan 2.1 (T2V)', { prompt, aspect_ratio: arInput(VID_AR) }),
]);

// ── Google (Gemini image / Imagen / Veo) ───────────────────────────────────────
const GOOGLE_T2I = withProvider('google', [
  t2i('google/gemini-2.5-flash-image', 'Gemini 2.5 Flash Image (Nano Banana)', { prompt, aspect_ratio: arInput() }, { apiKind: 'gemini', apiModel: 'gemini-2.5-flash-image' }),
  t2i('google/imagen-4.0', 'Imagen 4', { prompt, aspect_ratio: arInput() }, { apiKind: 'imagen', apiModel: 'imagen-4.0-generate-001' }),
]);
const GOOGLE_I2I = withProvider('google', [
  i2i('google/gemini-2.5-flash-image-edit', 'Gemini 2.5 Flash Image (Edit)', { prompt, aspect_ratio: arInput() }, { apiKind: 'gemini', apiModel: 'gemini-2.5-flash-image' }),
]);
const GOOGLE_T2V = withProvider('google', [
  t2v('google/veo-3.0', 'Veo 3', { prompt, aspect_ratio: arInput(['16:9', '9:16']) }, { apiKind: 'veo', apiModel: 'veo-3.0-generate-preview' }),
]);
const GOOGLE_I2V = withProvider('google', [
  i2v('google/veo-3.0-i2v', 'Veo 3 (Image-to-Video)', { prompt, aspect_ratio: arInput(['16:9', '9:16']) }, { apiKind: 'veo', apiModel: 'veo-3.0-generate-preview' }),
]);

// ── OpenAI (gpt-image-1) ────────────────────────────────────────────────────────
const OPENAI_T2I = withProvider('openai', [
  t2i('openai/gpt-image-1', 'GPT Image 1', { prompt, aspect_ratio: arInput(['1:1', '3:2', '2:3']), quality: resInput(['auto', 'low', 'medium', 'high'], 'quality') }, { apiModel: 'gpt-image-1' }),
]);
const OPENAI_I2I = withProvider('openai', [
  i2i('openai/gpt-image-1-edit', 'GPT Image 1 (Edit)', { prompt, aspect_ratio: arInput(['1:1', '3:2', '2:3']) }, { apiModel: 'gpt-image-1' }),
]);

export const PROVIDER_T2I = [...FAL_T2I, ...REPLICATE_T2I, ...KIE_T2I, ...WS_T2I, ...GOOGLE_T2I, ...OPENAI_T2I];
export const PROVIDER_I2I = [...FAL_I2I, ...REPLICATE_I2I, ...GOOGLE_I2I, ...OPENAI_I2I];
export const PROVIDER_T2V = [...FAL_T2V, ...REPLICATE_T2V, ...KIE_T2V, ...WS_T2V, ...GOOGLE_T2V];
export const PROVIDER_I2V = [...FAL_I2V, ...REPLICATE_I2V, ...GOOGLE_I2V];

// Default inputs used when wrapping a live-discovered model into a catalog entry.
export const defaultInputsFor = (capability) => {
  if (capability === 'text-to-video' || capability === 'image-to-video') {
    return { prompt, aspect_ratio: arInput(VID_AR) };
  }
  return { prompt, aspect_ratio: arInput() };
};
