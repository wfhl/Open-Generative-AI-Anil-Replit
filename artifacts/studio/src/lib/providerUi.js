// Shared rendering for the provider-grouped, badged, key-gated model pickers.
// Each studio's dropdown calls renderGroupedModelList() to populate its list
// element so grouping/badging/gating stay consistent across studios.

import { getProviderMeta, PROVIDERS } from './providers/index.js';
import { isProviderUsable } from './providerStatus.js';

const PROVIDER_ORDER = PROVIDERS.map((p) => p.id);

const providerName = (id) => getProviderMeta(id)?.name || id;

// Distinct accent per provider for the badge/avatar.
const PROVIDER_ACCENT = {
  muapi: 'bg-primary/10 text-primary',
  fal: 'bg-violet-500/10 text-violet-300',
  replicate: 'bg-orange-500/10 text-orange-300',
  kie: 'bg-emerald-500/10 text-emerald-300',
  wavespeed: 'bg-sky-500/10 text-sky-300',
  google: 'bg-blue-500/10 text-blue-300',
  openai: 'bg-teal-500/10 text-teal-300',
};

const accentFor = (id) => PROVIDER_ACCENT[id] || 'bg-white/10 text-white';

const checkSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>';
const lockSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

/**
 * Renders a provider-grouped, gated model list into `listEl`.
 * @param {HTMLElement} listEl
 * @param {Object} opts
 * @param {Array} opts.models       - catalog entries ({id,name,provider})
 * @param {string} opts.selectedId
 * @param {string} [opts.filter]
 * @param {(model:Object)=>void} opts.onSelect       - called for usable models
 * @param {(provider:string)=>void} [opts.onLocked]  - called when a locked model is clicked
 * @param {string} [opts.emptyText]
 */
export function renderGroupedModelList(listEl, { models, selectedId, filter = '', onSelect, onLocked, emptyText = 'No results' }) {
  listEl.innerHTML = '';
  const q = filter.trim().toLowerCase();
  const filtered = models.filter((m) =>
    !q || (m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q));

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="text-xs text-muted text-center py-4">${emptyText}</div>`;
    return;
  }

  // Group by provider, ordered by the PROVIDERS list (muapi first).
  const groups = new Map();
  for (const m of filtered) {
    const p = m.provider || 'muapi';
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(m);
  }
  const orderedProviders = [...groups.keys()].sort(
    (a, b) => (PROVIDER_ORDER.indexOf(a) + 1 || 99) - (PROVIDER_ORDER.indexOf(b) + 1 || 99));

  for (const provider of orderedProviders) {
    const usable = isProviderUsable(provider);

    const headerEl = document.createElement('div');
    headerEl.className = 'flex items-center justify-between px-3 pt-3 pb-1.5';
    headerEl.innerHTML = `
      <span class="text-[10px] font-black uppercase tracking-widest text-muted">${providerName(provider)}</span>
      ${usable ? '' : `<span class="flex items-center gap-1 text-[9px] font-bold text-amber-400/80">${lockSvg} Locked</span>`}
    `;
    listEl.appendChild(headerEl);

    for (const m of groups.get(provider)) {
      const isSelected = selectedId === m.id;
      const item = document.createElement('div');
      item.className = `flex items-center justify-between p-3.5 rounded-2xl transition-all border border-transparent ${
        usable ? 'hover:bg-white/5 hover:border-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'
      } ${isSelected ? 'bg-white/5 border-white/5' : ''}`;
      item.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 ${accentFor(provider)} border border-white/5 rounded-xl flex items-center justify-center font-black text-sm shadow-inner uppercase shrink-0">${(m.name || '?').charAt(0)}</div>
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-xs font-bold text-white tracking-tight truncate">${m.name}</span>
            <span class="text-[10px] text-muted truncate">${providerName(provider)}</span>
          </div>
        </div>
        ${isSelected ? checkSvg : (usable ? '' : `<span class="text-amber-400/70 shrink-0">${lockSvg}</span>`)}
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        if (!usable) { onLocked?.(provider); return; }
        onSelect(m);
      };
      listEl.appendChild(item);
    }
  }
}
