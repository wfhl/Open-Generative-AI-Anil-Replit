import { BaseAdapter } from './baseAdapter.js';
import { getAnyModelById } from '../models.js';

// Kie.ai adapter — unified Jobs API. POST /api/v1/jobs/createTask with
// { model, input } returns a taskId; poll GET /api/v1/jobs/recordInfo?taskId=.
// The finished record carries result URLs in `resultJson` (a JSON string).
const KIE_POLL_BASE = 'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=';

export class KieAdapter extends BaseAdapter {
  constructor() { super('kie'); }

  apiModel(modelId) {
    return getAnyModelById(modelId)?.apiModel || modelId.replace(/^kie\//, '');
  }

  async run(modelId, input, { onRequestId, maxAttempts = 900 } = {}) {
    const submit = await this.post('/v1/jobs/createTask', {
      model: this.apiModel(modelId),
      input,
    });
    const taskId = submit.data?.taskId || submit.taskId;
    if (!taskId) throw new Error('Kie did not return a taskId.');
    if (onRequestId) onRequestId(taskId);

    return this.pollUntilDone(`${KIE_POLL_BASE}${encodeURIComponent(taskId)}`, {
      classify: (d) => {
        const s = (d.data?.state || d.state || '').toLowerCase();
        if (s === 'success') return 'done';
        if (s === 'fail' || s === 'failed') return 'error';
        return 'pending';
      },
      extractError: (d) => d.data?.failMsg || d.msg,
      maxAttempts,
    });
  }

  extractUrl(r) {
    const data = r?.data || r;
    let urls = data?.resultUrls;
    if (!urls && data?.resultJson) {
      try { urls = JSON.parse(data.resultJson).resultUrls; } catch { /* ignore */ }
    }
    if (Array.isArray(urls)) return urls[0];
    return data?.resultUrl || r?.url;
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
    if (img) input.image_urls = [img];
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
    if (params.image_url) input.image_urls = [params.image_url];
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;
    const r = await this.run(params.model, input, params);
    return { ...r, url: this.extractUrl(r) };
  }
}

export const kieAdapter = new KieAdapter();
