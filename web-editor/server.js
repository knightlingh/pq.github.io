const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const multer = require('multer');
const matter = require('gray-matter');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, '_posts');
const IMAGES_BASE = path.join(ROOT, 'assets', 'images');
const UPLOADS_DIR = path.join(IMAGES_BASE, 'uploads');

async function ensureDirs() {
  try { await fs.mkdir(UPLOADS_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

ensureDirs();

function sanitizeFolder(folder) {
  if (!folder) return 'uploads';
  if (folder.includes('..')) return 'uploads';
  return folder
    .split(/[\\/]+/)
    .filter(Boolean)
    .map(p => p.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join(path.sep);
}

function sanitizeFilename(name) {
  return String(name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function shouldOverwrite(req) {
  const raw = req.body && req.body.overwrite;
  return raw === true || raw === 'true' || raw === '1' || raw === 1;
}

function slugifySegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildImageFilename(req, originalname) {
  // honor client-provided filename when given
  let provided = req.body && req.body.name ? String(req.body.name) : '';
  provided = provided ? path.basename(provided) : '';
  if (provided) {
    const clean = sanitizeFilename(provided);
    const ext = path.extname(clean) || path.extname(originalname || '') || '.png';
    const stem = clean.replace(/\.[^.]+$/, '') || 'upload';
    return `${stem}${ext}`;
  }
  // fallback to original name with sanitization + temp suffix
  const base = sanitizeFilename(path.basename(originalname || 'upload'));
  const extFallback = path.extname(base) || '.png';
  const stem = base.replace(/\.[^.]+$/, '') || 'upload';
  const tempSuffix = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  return `${stem}-${tempSuffix}${extFallback}`;
}

function computeDestination(req) {
  let folder = (req.body && req.body.folder) ? String(req.body.folder) : 'uploads';
  folder = sanitizeFolder(folder || 'uploads');
  const dest = path.join(IMAGES_BASE, folder);
  // ensure directory exists synchronously so both multer filters and storage can use it
  fssync.mkdirSync(dest, { recursive: true });
  req.uploadDest = dest;
  return dest;
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dest = computeDestination(req);
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const safeName = buildImageFilename(req, file.originalname);
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    try {
      const dest = computeDestination(req);
      const safeName = buildImageFilename(req, file.originalname);
      const target = path.join(dest, safeName);
      if (fssync.existsSync(target)) {
        if (shouldOverwrite(req)) {
          return cb(null, true);
        }
        // already exists; remember its URL and skip saving
        req.duplicateUrl = '/' + path.relative(ROOT, target).replace(/\\/g, '/');
        return cb(null, false);
      }
      return cb(null, true);
    } catch (err) {
      return cb(err);
    }
  }
});

// Serve frontend
app.use('/', express.static(path.join(__dirname, 'public')));
// Serve site assets so uploaded images are accessible
app.use('/assets', express.static(path.join(ROOT, 'assets')));

function safePostPath(filename) {
  // prevent path traversal and enforce .md
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) throw new Error('invalid filename');
  if (!filename.endsWith('.md')) throw new Error('filename must end with .md');
  return path.join(POSTS_DIR, filename);
}

app.get('/api/posts', async (req, res) => {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const posts = await Promise.all(files.filter(f => f.endsWith('.md')).map(async f => {
      const raw = await fs.readFile(path.join(POSTS_DIR, f), 'utf8');
      const parsed = matter(raw);
      return { filename: f, data: parsed.data, excerpt: parsed.content.slice(0, 200) };
    }));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/posts/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const p = safePostPath(filename);
    const raw = await fs.readFile(p, 'utf8');
    res.json({ filename, content: raw });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { filename, content, imageRename } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    const p = safePostPath(filename);
    // if exists, return conflict
    try {
      await fs.access(p);
      return res.status(409).json({ error: 'file exists' });
    } catch (e) {
      // not exists -> ok
    }
    if (imageRename && imageRename.from && imageRename.to) {
      await handleImageRename(imageRename.from, imageRename.to);
    }
    await fs.writeFile(p, content, 'utf8');
    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/api/posts/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const { content, imageRename } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const p = safePostPath(filename);
    if (imageRename && imageRename.from && imageRename.to) {
      await handleImageRename(imageRename.from, imageRename.to);
    }
    await fs.writeFile(p, content, 'utf8');
    res.json({ ok: true, filename });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/posts/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const p = safePostPath(filename);
    await fs.unlink(p);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/rename', async (req, res) => {
  try {
    const { oldFilename, newFilename } = req.body;
    if (!oldFilename || !newFilename) return res.status(400).json({ error: 'oldFilename and newFilename required' });
    const oldP = safePostPath(oldFilename);
    const newP = safePostPath(newFilename);
    // don't overwrite
    try { await fs.access(newP); return res.status(409).json({ error: 'target exists' }); } catch (e) { }
    await fs.rename(oldP, newP);
    res.json({ ok: true, oldFilename, newFilename });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    // multer sets req.file when saved; if fileFilter skipped due to duplicate, provide existing URL
    if (req.duplicateUrl) {
      return res.json({ url: req.duplicateUrl, duplicate: true });
    }
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const rel = path.relative(ROOT, req.file.path).replace(/\\/g, '/');
    // return URL path that the server serves
    res.json({ url: '/' + rel, duplicate: false });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

function assertWithinUploads(p) {
  const full = path.resolve(ROOT, p.replace(/^\//, ''));
  if (!full.startsWith(path.resolve(UPLOADS_DIR))) {
    throw new Error('path outside uploads');
  }
  return full;
}

async function handleImageRename(from, to) {
  const fromFull = assertWithinUploads(from);
  const toFull = assertWithinUploads(to);
  const toDir = path.dirname(toFull);
  await fs.mkdir(toDir, { recursive: true });
  if (fromFull === toFull) {
    return '/' + path.relative(ROOT, toFull).replace(/\\/g, '/');
  }
  let fromExists = true;
  try {
    await fs.access(fromFull);
  } catch (e) {
    fromExists = false;
  }
  if (!fromExists) {
    // keep existing target if source is missing
    await fs.access(toFull);
    return '/' + path.relative(ROOT, toFull).replace(/\\/g, '/');
  }
  // overwrite existing target so updated covers replace old files
  try {
    await fs.unlink(toFull);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  await fs.rename(fromFull, toFull);
  return '/' + path.relative(ROOT, toFull).replace(/\\/g, '/');
}

app.post('/api/rename-image', async (req, res) => {
  try {
    const { from, to } = req.body || {};
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const pathResp = await handleImageRename(from, to);
    res.json({ ok: true, path: pathResp });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// return list of images under assets/images (recursive)
async function gatherFiles(dir, base) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results = results.concat(await gatherFiles(full, base));
    } else {
      const rel = path.relative(base, full).replace(/\\/g, '/');
      results.push({ filename: ent.name, path: rel, url: '/' + path.relative(ROOT, full).replace(/\\/g, '/') });
    }
  }
  return results;
}

app.get('/api/images', async (req, res) => {
  try {
    const files = await gatherFiles(IMAGES_BASE, IMAGES_BASE);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/image-folders', async (req, res) => {
  try {
    const entries = await fs.readdir(IMAGES_BASE, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(d => d.name);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 5405;
app.listen(PORT, () => console.log(`Web editor running on http://localhost:${PORT}`));
