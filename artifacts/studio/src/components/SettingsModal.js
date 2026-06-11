import { LocalModelManager } from './LocalModelManager.js';
import { isLocalAIAvailable } from '../lib/localInferenceClient.js';
import { t } from '../lib/i18n.js';
import { PROVIDERS } from '../lib/providers/index.js';
import { getProviderKey, setProviderKey, hasProviderKey } from '../lib/keyStore.js';

export function SettingsModal(onClose) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,#111);border-radius:1rem;border:1px solid rgba(255,255,255,0.08);width:min(90vw,36rem);max-height:85vh;display:flex;flex-direction:column;overflow:hidden;';

    // ── Header ────────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';
    header.innerHTML = `
        <h2 style="font-size:1rem;font-weight:800;color:#fff;margin:0;">${t('settings.title')}</h2>
        <button id="settings-close-btn" style="color:rgba(255,255,255,0.4);background:none;border:none;cursor:pointer;padding:4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    modal.appendChild(header);

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const TABS = [
        { id: 'api', label: t('settings.apiKey') },
        ...(isLocalAIAvailable() ? [{ id: 'local', label: t('settings.localModels') }] : []),
    ];

    let activeTab = 'api';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0.25rem;padding:0.75rem 1.5rem 0;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';

    const tabBtns = {};
    TABS.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = 'padding:0.4rem 0.75rem;border-radius:0.5rem 0.5rem 0 0;font-size:0.75rem;font-weight:700;border:none;cursor:pointer;transition:all 0.15s;';
        btn.onclick = () => switchTab(id);
        tabBtns[id] = btn;
        tabBar.appendChild(btn);
    });
    modal.appendChild(tabBar);

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:1.5rem;';
    modal.appendChild(body);

    // ── Tab: API Key (per-provider, BYOK) ──────────────────────────────────────
    const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');
    const apiPanel = document.createElement('div');
    const providerRows = PROVIDERS.map((p) => {
        const isSet = hasProviderKey(p.id);
        const indicator = isSet
            ? `<span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.65rem;font-weight:700;color:#22d3ee;"><span style="width:6px;height:6px;border-radius:50%;background:#22d3ee;"></span>${t('settings.keySet')}</span>`
            : `<span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.65rem;font-weight:700;color:rgba(255,255,255,0.35);"><span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.25);"></span>${t('settings.keyNotSet')}</span>`;
        const keyLink = p.keyUrl
            ? ` · <a href="${esc(p.keyUrl)}" target="_blank" rel="noreferrer" style="color:rgba(34,211,238,0.8);text-decoration:none;">${t('settings.getKey')}</a>`
            : '';
        return `
            <div data-provider="${esc(p.id)}" style="display:flex;flex-direction:column;gap:0.4rem;padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <label style="font-size:0.8rem;color:#fff;font-weight:700;">${esc(p.name)}</label>
                    <span data-indicator>${indicator}</span>
                </div>
                <div style="position:relative;">
                    <input data-key-input type="password"
                        style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.55rem 3.2rem 0.55rem 0.85rem;color:#fff;font-size:0.85rem;outline:none;"
                        placeholder="${esc(p.placeholder || t('settings.keyPlaceholder'))}"
                        value="${esc(getProviderKey(p.id))}">
                    <button type="button" data-toggle style="position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,0.45);font-size:0.65rem;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;">${t('settings.show')}</button>
                </div>
                <p style="font-size:0.68rem;color:rgba(255,255,255,0.35);margin:0;">${esc(p.description || '')}${keyLink}</p>
            </div>
        `;
    }).join('');

    apiPanel.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <p style="font-size:0.72rem;color:rgba(255,255,255,0.4);margin:0;">${t('settings.providerKeysIntro')}</p>
            ${providerRows}
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.25rem;">
                <button id="settings-cancel-btn" style="padding:0.5rem 1rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:0.75rem;font-weight:700;cursor:pointer;">${t('common.cancel')}</button>
                <button id="settings-save-btn" style="padding:0.5rem 1rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;font-size:0.75rem;font-weight:700;cursor:pointer;border:none;">${t('common.save')}</button>
            </div>
        </div>
    `;

    // Show/hide toggles for each provider key field
    apiPanel.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.onclick = () => {
            const input = btn.parentElement.querySelector('[data-key-input]');
            const reveal = input.type === 'password';
            input.type = reveal ? 'text' : 'password';
            btn.textContent = reveal ? t('settings.hide') : t('settings.show');
        };
    });

    // ── Tab: Local Models ─────────────────────────────────────────────────────
    const localPanel = LocalModelManager();

    // ── Tab switching ─────────────────────────────────────────────────────────
    const switchTab = (id) => {
        activeTab = id;
        body.innerHTML = '';

        TABS.forEach(({ id: tid }) => {
            const btn = tabBtns[tid];
            if (tid === id) {
                btn.style.background = 'rgba(255,255,255,0.08)';
                btn.style.color = '#fff';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'rgba(255,255,255,0.4)';
            }
        });

        if (id === 'api') body.appendChild(apiPanel);
        if (id === 'local') body.appendChild(localPanel);
    };

    switchTab('api');

    // ── API key save/cancel handlers ──────────────────────────────────────────
    const close = () => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        if (onClose) onClose();
    };

    apiPanel.querySelector('#settings-cancel-btn').onclick = close;
    apiPanel.querySelector('#settings-save-btn').onclick = () => {
        apiPanel.querySelectorAll('[data-provider]').forEach((row) => {
            const provider = row.getAttribute('data-provider');
            const value = row.querySelector('[data-key-input]').value.trim();
            setProviderKey(provider, value);
        });
        close();
    };

    header.querySelector('#settings-close-btn').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.appendChild(modal);
    return overlay;
}
