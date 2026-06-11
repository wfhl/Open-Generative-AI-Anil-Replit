import { BaseAdapter } from './baseAdapter.js';

// Replicate adapter. Uses the official-model predictions endpoint
// (/v1/models/{owner}/{name}/predictions) so no version hash is needed. Returns
// a prediction with an absolute `urls.get` to poll; `output` is a URL or array.
export class ReplicateAdapter extends BaseAdapter {
  constructor() { super('replicate'); }

  classify(d) {
    const s = (d.status || '').toLowerCase();
    if (s === 'succeeded') return 'done';
    if (s === 'failed' || s === 'canceled') return 'error';
    return 'pending';
  }

  async run(modelId, input, { onRequestId, maxAttempts = 900 } = {}) {
    const submit = await this.post(`/models/${modelId}/predictions`, { input });
    const getUrl = submit.urls?.get;
    // Hand the studio the poll URL so the job can resume after a refresh.
    if (onRequestId && submit.id) onRequestId(submit.id, { pollUrl: getUrl });

    if (!getUrl) return submit;

    return this.pollUntilDone(getUrl, {
      classify: (d) => this.classify(d),
      extractError: (d) => d.error,
      maxAttempts,
    });
  }

  extractUrl(r) {
    const o = r?.output;
    if (Array.isArray(o)) return o[0];
    if (typeof o === 'string') return o;
    return o?.url || r?.url;
  }

  // Resume a persisted job by finishing the poll of its prediction URL.
  async reconcilePending(job) {
    if (!job.pollUrl) return null;
    const data = await this.pollUntilDone(job.pollUrl, {
      classify: (d) => this.classify(d),
      extractError: (d) => d.error,
      maxAttempts: this.attemptsLeft(job),
      interval: job.interval || 2000,
    });
    return { ...data, url: this.extractUrl(data) };
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
    if (img) { input.image = img; input.input_image = img; }
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }

  async generateVideo(params) {
    const input = { prompt: params.prompt || '' };
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }

  async generateI2V(params) {
    const input = { prompt: params.prompt || '' };
    if (params.image_url) { input.image = params.image_url; input.first_frame_image = params.image_url; }
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }
}

export const replicateAdapter = new ReplicateAdapter();
