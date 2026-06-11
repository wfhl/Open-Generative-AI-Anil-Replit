import { BaseAdapter } from './baseAdapter.js';

// WaveSpeed adapter. POST /api/v3/{model} returns { data: { id } }; poll
// GET /api/v3/predictions/{id}/result for { data: { status, outputs:[url] } }.
const WS_POLL = (id) => `https://api.wavespeed.ai/api/v3/predictions/${id}/result`;

export class WaveSpeedAdapter extends BaseAdapter {
  constructor() { super('wavespeed'); }

  async run(modelId, input, { onRequestId, maxAttempts = 900 } = {}) {
    const submit = await this.post(`/v3/${modelId}`, input);
    const id = submit.data?.id || submit.id;
    if (!id) throw new Error('WaveSpeed did not return a prediction id.');
    if (onRequestId) onRequestId(id);

    return this.pollUntilDone(WS_POLL(id), {
      classify: (d) => {
        const s = (d.data?.status || d.status || '').toLowerCase();
        if (s === 'completed' || s === 'succeeded') return 'done';
        if (s === 'failed' || s === 'error') return 'error';
        return 'pending';
      },
      extractError: (d) => d.data?.error || d.error,
      maxAttempts,
    });
  }

  extractUrl(r) {
    const data = r?.data || r;
    if (Array.isArray(data?.outputs)) return data.outputs[0];
    return data?.output || r?.url;
  }

  async generateImage(params) {
    const input = { prompt: params.prompt || '' };
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }

  async generateI2I(params) {
    const input = { prompt: params.prompt || '' };
    const img = params.image_url || params.images_list?.[0];
    if (img) input.image = img;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }

  async generateVideo(params) {
    const input = { prompt: params.prompt || '' };
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    if (params.duration) input.duration = params.duration;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }

  async generateI2V(params) {
    const input = { prompt: params.prompt || '' };
    if (params.image_url) input.image = params.image_url;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }
}

export const wavespeedAdapter = new WaveSpeedAdapter();
