import { BaseAdapter, urlToBase64 } from './baseAdapter.js';
import { getAnyModelById } from '../models.js';

// Google Generative Language adapter. Three sub-APIs, chosen by the catalog's
// `apiKind`:
//  - gemini: gemini-2.5-flash-image via :generateContent (multimodal, sync,
//            returns inline base64 image)
//  - imagen: imagen-*.predict (sync, returns bytesBase64Encoded)
//  - veo:    veo-*:predictLongRunning → poll the returned operation until done.
const GOOGLE_OP_BASE = 'https://generativelanguage.googleapis.com/v1beta/';

export class GoogleAdapter extends BaseAdapter {
  constructor() { super('google'); }

  meta(modelId) {
    const m = getAnyModelById(modelId);
    return { apiKind: m?.apiKind || 'gemini', apiModel: m?.apiModel || modelId.replace(/^google\//, '') };
  }

  async geminiImage(apiModel, params) {
    const parts = [{ text: params.prompt || 'Generate an image.' }];
    const img = params.image_url || params.images_list?.[0];
    if (img) {
      const b64 = await urlToBase64(img);
      parts.push({ inline_data: { mime_type: 'image/png', data: b64 } });
    }
    const r = await this.post(`/models/${apiModel}:generateContent`, {
      contents: [{ parts }],
    });
    const outParts = r?.candidates?.[0]?.content?.parts || [];
    const imgPart = outParts.find((p) => p.inline_data || p.inlineData);
    const data = imgPart?.inline_data?.data || imgPart?.inlineData?.data;
    const mime = imgPart?.inline_data?.mime_type || imgPart?.inlineData?.mimeType || 'image/png';
    if (!data) throw new Error('Gemini returned no image.');
    return { ...r, url: `data:${mime};base64,${data}` };
  }

  async imagen(apiModel, params) {
    const r = await this.post(`/models/${apiModel}:predict`, {
      instances: [{ prompt: params.prompt || '' }],
      parameters: { sampleCount: 1, aspectRatio: params.aspect_ratio || '1:1' },
    });
    const data = r?.predictions?.[0]?.bytesBase64Encoded;
    if (!data) throw new Error('Imagen returned no image.');
    return { ...r, url: `data:image/png;base64,${data}` };
  }

  async veo(apiModel, params, { onRequestId, maxAttempts = 900 } = {}) {
    const instance = { prompt: params.prompt || '' };
    if (params.image_url) {
      const b64 = await urlToBase64(params.image_url);
      instance.image = { bytesBase64Encoded: b64, mimeType: 'image/png' };
    }
    const submit = await this.post(`/models/${apiModel}:predictLongRunning`, {
      instances: [instance],
      parameters: { aspectRatio: params.aspect_ratio || '16:9' },
    });
    const opName = submit.name;
    if (!opName) throw new Error('Veo did not return an operation.');
    if (onRequestId) onRequestId(opName);

    const done = await this.pollUntilDone(`${GOOGLE_OP_BASE}${opName}`, {
      classify: (d) => {
        if (d.error) return 'error';
        return d.done ? 'done' : 'pending';
      },
      extractError: (d) => d.error?.message,
      maxAttempts,
    });
    const resp = done.response || {};
    const sample = resp.generateVideoResponse?.generatedSamples?.[0]
      || resp.generatedSamples?.[0]
      || resp.predictions?.[0];
    const url = sample?.video?.uri || sample?.video?.url || sample?.uri;
    return { ...done, url };
  }

  async generateImage(params) {
    const { apiKind, apiModel } = this.meta(params.model);
    return apiKind === 'imagen' ? this.imagen(apiModel, params) : this.geminiImage(apiModel, params);
  }

  async generateI2I(params) {
    const { apiModel } = this.meta(params.model);
    return this.geminiImage(apiModel, params);
  }

  async generateVideo(params) {
    const { apiModel } = this.meta(params.model);
    return this.veo(apiModel, params, params);
  }

  async generateI2V(params) {
    const { apiModel } = this.meta(params.model);
    return this.veo(apiModel, params, params);
  }
}

export const googleAdapter = new GoogleAdapter();
