import { t } from '../lib/i18n.js';
import { PROVIDERS, getProviderMeta } from '../lib/providers/index.js';
import { getProviderKey, setProviderKey } from '../lib/keyStore.js';
import { t2iModels, t2vModels } from '../lib/models.js';
import { setDefaultModelId, markOnboarded } from '../lib/defaults.js';

// First-run onboarding: a keys step (per-provider inputs, Show/Hide, recommended
// badges) and a default-model step (pick a default image + video model). Choices
// persist; the flow is skipped on subsequent visits. `onDone` is called after
// the user finishes or skips so the host can re-render with the new defaults.
export function Onboarding(onDone) {
    const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:200;padding:1rem;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--bg-card,#111);border-radius:1rem;border:1px solid rgba(255,255,255,0.08);width:min(92vw,40rem);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;';
    overlay.appendChild(modal);

    let step = 0; // 0 = keys, 1 = defaults

    const finish = () => {
        markOnboarded();
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        if (onDone) onDone();
    };

    // Persist whatever keys were typed before moving on.
    const saveKeys = () => {
        modal.querySelectorAll('[data-provider]').forEach((row) => {
            const provider = row.getAttribute('data-provider');
            const input = row.querySelector('[data-key-input]');
            if (input) setProviderKey(provider, input.value.trim());
        });
    };

    const render = () => {
        modal.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;';
        header.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:0.2rem;">
                <h2 style="font-size:1.05rem;font-weight:800;color:#fff;margin:0;">${t('onboarding.title')}</h2>
                <span style="font-size:0.7rem;color:rgba(255,255,255,0.4);">${t('onboarding.step')} ${step + 1} / 2</span>
            </div>
            <button id="ob-skip" style="color:rgba(255,255,255,0.45);background:none;border:none;cursor:pointer;font-size:0.72rem;font-weight:700;">${t('onboarding.skip')}</button>
        `;
        modal.appendChild(header);

        const bodyEl = document.createElement('div');
        bodyEl.style.cssText = 'flex:1;overflow-y:auto;padding:1.5rem;';
        modal.appendChild(bodyEl);

        if (step === 0) renderKeysStep(bodyEl);
        else renderDefaultsStep(bodyEl);

        // Footer
        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:space-between;gap:0.5rem;padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;';
        footer.innerHTML = `
            <button id="ob-back" style="padding:0.55rem 1.1rem;border-radius:0.5rem;background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:0.78rem;font-weight:700;cursor:pointer;visibility:${step === 0 ? 'hidden' : 'visible'};">${t('common.back')}</button>
            <button id="ob-next" style="padding:0.55rem 1.3rem;border-radius:0.5rem;background:var(--color-primary,#22d3ee);color:#000;font-size:0.78rem;font-weight:800;cursor:pointer;border:none;">${step === 0 ? t('common.next') : t('onboarding.finish')}</button>
        `;
        modal.appendChild(footer);

        header.querySelector('#ob-skip').onclick = finish;
        footer.querySelector('#ob-back').onclick = () => { saveKeys(); step = 0; render(); };
        footer.querySelector('#ob-next').onclick = () => {
            saveKeys();
            if (step === 0) { step = 1; render(); }
            else {
                const img = modal.querySelector('#ob-default-image')?.value;
                const vid = modal.querySelector('#ob-default-video')?.value;
                if (img) setDefaultModelId('image', img);
                if (vid) setDefaultModelId('video', vid);
                finish();
            }
        };
    };

    const renderKeysStep = (bodyEl) => {
        const rows = PROVIDERS.map((p) => {
            const recommended = p.recommended
                ? `<span style="font-size:0.55rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#22d3ee;background:rgba(34,211,238,0.12);padding:0.1rem 0.35rem;border-radius:0.35rem;">${t('settings.recommended')}</span>`
                : '';
            const keyLink = p.keyUrl
                ? `<a href="${esc(p.keyUrl)}" target="_blank" rel="noreferrer" style="color:rgba(34,211,238,0.8);text-decoration:none;font-size:0.68rem;">${t('settings.getKey')}</a>`
                : '';
            return `
                <div data-provider="${esc(p.id)}" style="display:flex;flex-direction:column;gap:0.4rem;padding:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;background:rgba(255,255,255,0.02);">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;color:#fff;font-weight:700;">${esc(p.name)}${recommended}</label>
                        ${keyLink}
                    </div>
                    <div style="position:relative;">
                        <input data-key-input type="password"
                            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.55rem 3.2rem 0.55rem 0.85rem;color:#fff;font-size:0.85rem;outline:none;"
                            placeholder="${esc(p.placeholder || t('settings.keyPlaceholder'))}"
                            value="${esc(getProviderKey(p.id))}">
                        <button type="button" data-toggle style="position:absolute;right:0.5rem;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,0.45);font-size:0.65rem;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;">${t('settings.show')}</button>
                    </div>
                    <p style="font-size:0.68rem;color:rgba(255,255,255,0.35);margin:0;">${esc(p.description || '')}</p>
                </div>
            `;
        }).join('');

        bodyEl.innerHTML = `
            <p style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin:0 0 1rem;">${t('onboarding.keysIntro')}</p>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">${rows}</div>
        `;

        bodyEl.querySelectorAll('[data-toggle]').forEach((btn) => {
            btn.onclick = () => {
                const input = btn.parentElement.querySelector('[data-key-input]');
                const reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';
                btn.textContent = reveal ? t('settings.hide') : t('settings.show');
            };
        });
    };

    const optionLabel = (m) => {
        const prov = getProviderMeta(m.provider)?.name || m.provider || 'MuAPI';
        return `${m.name} — ${prov}`;
    };
    const optionsFrom = (models) => models
        .map((m) => `<option value="${esc(m.id)}">${esc(optionLabel(m))}</option>`)
        .join('');

    const renderDefaultsStep = (bodyEl) => {
        bodyEl.innerHTML = `
            <p style="font-size:0.78rem;color:rgba(255,255,255,0.5);margin:0 0 1.25rem;">${t('onboarding.defaultsIntro')}</p>
            <div style="display:flex;flex-direction:column;gap:1.1rem;">
                <div style="display:flex;flex-direction:column;gap:0.45rem;">
                    <label style="font-size:0.8rem;color:#fff;font-weight:700;">${t('onboarding.defaultImage')}</label>
                    <select id="ob-default-image" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.6rem 0.85rem;color:#fff;font-size:0.85rem;outline:none;">
                        ${optionsFrom(t2iModels)}
                    </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:0.45rem;">
                    <label style="font-size:0.8rem;color:#fff;font-weight:700;">${t('onboarding.defaultVideo')}</label>
                    <select id="ob-default-video" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:0.6rem;padding:0.6rem 0.85rem;color:#fff;font-size:0.85rem;outline:none;">
                        ${optionsFrom(t2vModels)}
                    </select>
                </div>
            </div>
        `;
    };

    render();
    return overlay;
}
