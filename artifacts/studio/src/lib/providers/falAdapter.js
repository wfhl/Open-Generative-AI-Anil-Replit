import { BaseAdapter, falImageSize } from './baseAdapter.js';

// fal.ai adapter. fal's queue API: POST to /{model} returns a request_id plus
// absolute status_url and response_url. We poll status_url until COMPLETED, then
// fetch response_url for the actual output. Image output is `images[0].url`,
// video output is `video.url`.
export class FalAdapter extends BaseAdapter {
  constructor() { super('fal'); }

  modelPath(id) {
    // Our catalog ids ARE the fal model paths (e.g. "fal-ai/flux/dev").
    return id;
  }

  classify(d) {
    const s = (d.status || '').toUpperCase();
    if (s === 'COMPLETED') return 'done';
    if (s === 'FAILED' || s === 'ERROR') return 'error';
    return 'pending';
  }

  async run(modelId, input, { onRequestId, maxAttempts = 900 } = {}) {
    const submit = await this.post(`/${this.modelPath(modelId)}`, input);
    const requestId = submit.request_id || submit.requestId;
    const statusUrl = submit.status_url;
    const responseUrl = submit.response_url;
    // Hand the studio everything it needs to resume this job after a refresh.
    if (onRequestId && requestId) onRequestId(requestId, { pollUrl: statusUrl, responseUrl });

    if (!statusUrl || !responseUrl) {
      // Some sync endpoints return the result inline.
      return submit;
    }

    await this.pollUntilDone(statusUrl, {
      classify: (d) => this.classify(d),
      extractError: (d) => d.error || d.detail,
      maxAttempts,
    });
    return this.pollOnce(responseUrl);
  }

  extractImage(r) { return r?.images?.[0]?.url || r?.image?.url || r?.url; }
  extractVideo(r) { return r?.video?.url || r?.videos?.[0]?.url || r?.url; }
  extractMedia(r) { return this.extractVideo(r) || this.extractImage(r); }

  // Resume a persisted job: finish polling its status URL, then fetch the
  // response URL for the actual output.
  async reconcilePending(job) {
    if (!job.pollUrl || !job.responseUrl) return null;
    await this.pollUntilDone(job.pollUrl, {
      classify: (d) => this.classify(d),
      extractError: (d) => d.error || d.detail,
      maxAttempts: this.attemptsLeft(job),
      interval: job.interval || 2000,
    });
    const r = await this.pollOnce(job.responseUrl);
    return { ...r, url: this.extractMedia(r) };
  }

  async generateImage(params) {
    const input = { prompt: params.prompt || '' };
    if (params.aspect_ratio) input.image_size = falImageSize(params.aspect_ratio);
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractImage(r) };
  }

  async generateI2I(params) {
    const input = { prompt: params.prompt || '' };
    const img = params.image_url || params.images_list?.[0];
    if (img) input.image_url = img;
    if (params.aspect_ratio) input.image_size = falImageSize(params.aspect_ratio);
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractImage(r) };
  }

  async generateVideo(params) {
    const input = { prompt: params.prompt || '' };
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    if (params.duration) input.duration = String(params.duration);
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractVideo(r) };
  }

  async generateI2V(params) {
    const input = { prompt: params.prompt || '' };
    if (params.image_url) input.image_url = params.image_url;
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    if (params.duration) input.duration = String(params.duration);
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractVideo(r) };
  }

  // Exposed for completeness; uses fal storage. Default studio uploads still go
  // to MuAPI and produce a public URL fal can fetch, so this is rarely needed.
  async uploadFile(file) {
    const initiate = await this.post('/storage/upload/initiate', {
      content_type: file.type || 'application/octet-stream',
      file_name: file.name || 'upload',
    });
    const uploadUrl = initiate.upload_url;
    const fileUrl = initiate.file_url;
    if (!uploadUrl) throw new Error('fal storage did not return an upload URL.');
    await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    return fileUrl;
  }
}

export const falAdapter = new FalAdapter();
