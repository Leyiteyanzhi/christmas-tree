export function setupTray(panel, palette, keyOf, showAll) {
  const toggle = panel.querySelector('.tray-toggle');
  const recent = [];
  const narrow = matchMedia('(max-width: 780px)');
  function update(expanded) {
    panel.classList.toggle('tray-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Show less' : 'Browse all';
    if (!expanded && narrow.matches) showAll();
  }
  update(false);
  toggle.onclick = () => update(!panel.classList.contains('tray-expanded'));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('tray-expanded') && narrow.matches) {
      event.stopPropagation();
      update(false);
      toggle.focus();
    }
  });
  function order() {
    for (const tile of palette.children) {
      const index = recent.indexOf(keyOf(tile));
      tile.style.setProperty('--recent-order', index < 0 ? 0 : index - 7);
    }
  }
  return {
    order,
    picked(key) {
      const index = recent.indexOf(key);
      if (index >= 0) recent.splice(index, 1);
      recent.unshift(key);
      recent.length = Math.min(recent.length, 6);
      if (narrow.matches && panel.classList.contains('tray-expanded')) {
        toggle.focus({preventScroll:true});
        update(false);
      }
      order();
      if (narrow.matches && !document.body.classList.contains('is-fullscreen')) {
        palette.scrollLeft = 0;
        const picture = document.querySelector('.picture').getBoundingClientRect();
        const covered = picture.bottom - panel.getBoundingClientRect().top + 8;
        if (covered > 0) window.scrollBy(0, covered);
      }
    },
  };
}

export function setupWorks({ mode, snapshot, validate, open }) {
  const dialog = document.querySelector('#works-dialog');
  const select = dialog.querySelector('select');
  const status = dialog.querySelector('[role=status]');
  const file = dialog.querySelector('input[type=file]');
  const storageKey = 'christmas-tree-works-' + mode;
  const report = message => { status.textContent = message; };
  let copies = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) copies = saved.filter(entry =>
      typeof entry?.name === 'string' && validate(entry.work));
  } catch {}

  function refresh() {
    select.replaceChildren(...copies.map(({ name }, index) => new Option(name, index)));
    if (!copies.length) select.add(new Option('No copies saved', ''));
    select.disabled = !copies.length;
    dialog.querySelector('[data-work=open]').disabled = !copies.length;
    dialog.querySelector('[data-work=delete]').disabled = !copies.length;
  }
  function save(next) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    copies = next;
    refresh();
  }
  async function restore(work) {
    if (!validate(work)) throw new Error('This file is not a valid ' + mode + ' tree project.');
    await open(work);
    report('Work opened. You can undo this in the studio.');
  }
  async function run(action) {
    if (dialog.inert) return;
    dialog.inert = true;
    try { await action(); }
    catch (error) { report(error.message || 'Could not complete this action.'); }
    finally { dialog.inert = false; }
  }
  dialog.addEventListener('cancel', event => {
    if (dialog.inert) event.preventDefault();
  });
  document.querySelector('#show-works').onclick = () => {
    refresh();
    report('');
    dialog.showModal();
  };
  dialog.querySelector('[data-work=copy]').onclick = () => run(() => {
    const name = dialog.querySelector('input[type=text]').value.trim() || 'Tree ' + new Date().toLocaleString();
    save([...copies, { name, work: snapshot() }]);
    select.selectedIndex = copies.length - 1;
    report('Copy saved in this browser.');
  });
  dialog.querySelector('[data-work=open]').onclick = () => run(() => restore(copies[select.selectedIndex].work));
  dialog.querySelector('[data-work=delete]').onclick = () => run(() => {
    if (!confirm('Delete this saved copy?')) return;
    save(copies.filter((_, index) => index !== select.selectedIndex));
    report('Saved copy deleted.');
  });
  dialog.querySelector('[data-work=export]').onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'christmas-tree-' + mode + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  file.onchange = () => run(async () => {
    const selected = file.files[0];
    file.value = '';
    if (!selected) return;
    if (selected.size > 2_000_000) throw new Error('This file is too large to be a tree project.');
    let work;
    try { work = JSON.parse(await selected.text()); }
    catch { throw new Error('Choose a tree project JSON file.'); }
    await restore(work);
  });
}

export function workFile(mode, tree, draft) {
  return { format: 'christmas-tree-game', version: 1, mode, tree, draft };
}

export function isWorkFile(work, mode, trees, backdrops, lights) {
  return work?.format === 'christmas-tree-game' && work.version === 1 && work.mode === mode
    && Object.hasOwn(trees, work.tree) && Object.hasOwn(backdrops, work.draft?.backdrop)
    && lights.includes(work.draft.light) && Array.isArray(work.draft.items);
}

const EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>';
const COMPRESS_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"/></svg>';

/**
 * Hybrid PC + Mobile fullscreen controller.
 * Uses native Fullscreen API when supported (desktop & Android) and seamlessly
 * falls back to full-viewport immersive mode on mobile browsers like iOS Safari.
 */
export function setupFullscreen(button, onChange) {
  if (!button) return { isActive: () => false, exit: () => {} };
  let active = false;

  const nativeEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const triggerResize = () => {
    if (!onChange) return;
    requestAnimationFrame(() => {
      onChange();
      setTimeout(onChange, 120);
    });
  };

  function syncUI() {
    document.body.classList.toggle('is-fullscreen', active);
    button.setAttribute('aria-pressed', String(active));
    const label = active ? 'Exit fullscreen' : 'Fullscreen';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = active ? COMPRESS_ICON : EXPAND_ICON;
    triggerResize();
  }

  async function enter() {
    active = true;
    syncUI();
    const target = document.documentElement;
    const req = target.requestFullscreen || target.webkitRequestFullscreen;
    if (typeof req === 'function') {
      try { await req.call(target); } catch {}
    }
  }

  async function exit() {
    if (!active && !nativeEl()) return;
    active = false;
    syncUI();
    const exitNative = document.exitFullscreen || document.webkitExitFullscreen;
    if (nativeEl() && typeof exitNative === 'function') {
      try { await exitNative.call(document); } catch {}
    }
  }

  button.onclick = () => (active ? exit() : enter());

  const onNativeChange = () => {
    const hasNative = Boolean(nativeEl());
    if (!hasNative && active) {
      active = false;
      syncUI();
    } else if (hasNative && !active) {
      active = true;
      syncUI();
    } else {
      triggerResize();
    }
  };
  document.addEventListener('fullscreenchange', onNativeChange);
  document.addEventListener('webkitfullscreenchange', onNativeChange);

  // Escape exits CSS-fallback fullscreen cleanly when native fullscreen isn't active
  // (unless an in-fullscreen floating popover is open — let it close first!)
  document.addEventListener('keydown', event => {
    if (
      event.key === 'Escape' &&
      active &&
      !nativeEl() &&
      !document.body.classList.contains('fs-palette-open') &&
      !document.querySelector('dialog[open]')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      exit();
    }
  }, true);

  // Recalculate viewport on phone orientation change or mobile URL bar collapse
  window.addEventListener('orientationchange', () => { if (active) triggerResize(); });
  window.visualViewport?.addEventListener('resize', () => { if (active) triggerResize(); });

  syncUI();
  return { isActive: () => active, enter, exit };
}

/**
 * Compact URL-safe share link encoding/decoding for 3D tree layouts (zero backend!).
 * Format: v1|tree|backdrop|light|site:itemIdx,site:itemIdx... -> base64url in #share=...
 */
export function encodeShareHash(treeKey, draft, itemKeys) {
  const indexOf = new Map(itemKeys.map((k, i) => [k, i]));
  const pairs = draft.items
    .map(({ key, site }) => (indexOf.has(key) ? `${site}:${indexOf.get(key)}` : ''))
    .filter(Boolean)
    .join(',');
  const raw = `v1|${treeKey}|${draft.backdrop}|${draft.light}|${pairs}`;
  const b64 = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return '#share=' + b64;
}

export function decodeShareHash(hash, itemKeys) {
  if (!hash || !hash.startsWith('#share=')) return null;
  try {
    const token = hash.slice('#share='.length).replace(/-/g, '+').replace(/_/g, '/');
    const pad = token.length % 4 ? '='.repeat(4 - (token.length % 4)) : '';
    const raw = atob(token + pad);
    const [ver, tree, backdrop, light, pairsRaw = ''] = raw.split('|');
    if (ver !== 'v1' || !tree || !backdrop || !light) return null;
    const items = pairsRaw
      ? pairsRaw.split(',').map(pair => {
          const [s, k] = pair.split(':').map(Number);
          const key = itemKeys[k];
          return Number.isInteger(s) && key ? { site: s, key } : null;
        }).filter(Boolean)
      : [];
    return { tree, draft: { backdrop, light, items } };
  } catch {
    return null;
  }
}
