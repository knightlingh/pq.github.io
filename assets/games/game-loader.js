/* Simple loader to inject game markup and run an init callback */
window.loadGame = async function loadGame(options) {
  const { containerId, htmlPath, init } = options;
  const root = document.getElementById(containerId);
  if (!root) return;
  if (root.dataset.loaded === 'true') return;

  try {
    const res = await fetch(htmlPath, { cache: 'no-cache' });
    const html = await res.text();
    root.innerHTML = html;
    root.dataset.loaded = 'true';
    if (typeof init === 'function') {
      init(root);
    }
  } catch (err) {
    console.error('Failed to load game markup', err);
    root.textContent = 'Unable to load game right now.';
  }
};
