import { BaseAdapter, openaiSize, gatewayUrl } from './baseAdapter.js';

// OpenAI images adapter (gpt-image-1). Synchronous: /v1/images/generations for
// text-to-image and /v1/images/edits (multipart) for image edits. Both return
// base64 image data which we wrap into a data: URL.
export class OpenAIAdapter extends BaseAdapter {
  constructor() { super('openai'); }

  toDataUrl(r) {
    const b64 = r?.data?.[0]?.b64_json;
    if (!b64) {
      const url = r?.data?.[0]?.url;
      if (url) return url;
      throw new Error('OpenAI returned no image.');
    }
    return `data:image/png;base64,${b64}`;
  }

  async generateImage(params) {
    const body = {
      model: 'gpt-image-1',
      prompt: params.prompt || '',
      size: openaiSize(params.aspect_ratio),
      n: 1,
    };
    if (params.quality && params.quality !== 'auto') body.quality = params.quality;
    const r = await this.post('/images/generations', body);
    return { ...r, url: this.toDataUrl(r) };
  }

  async generateI2I(params) {
    const img = params.image_url || params.images_list?.[0];
    if (!img) throw new Error('OpenAI image edit needs a reference image.');
    const blob = await (await fetch(img)).blob();
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', params.prompt || '');
    form.append('size', openaiSize(params.aspect_ratio));
    form.append('image', blob, 'image.png');

    const key = this.getKey();
    const headers = {};
    if (key) headers['X-Provider-API-Key'] = key;
    const resp = await fetch(gatewayUrl('openai', '/images/edits'), {
      method: 'POST', headers, body: form,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`openai request failed: ${resp.status} ${errText.slice(0, 160)}`);
    }
    const r = await resp.json();
    return { ...r, url: this.toDataUrl(r) };
  }
}

export const openaiAdapter = new OpenAIAdapter();
