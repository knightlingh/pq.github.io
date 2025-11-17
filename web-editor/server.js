const express = require('express');
const fs = require('fs').promises;
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

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // allow target folder via form field 'folder' (subfolder under assets/images)
      let folder = (req.body && req.body.folder) ? String(req.body.folder) : 'uploads';
      // sanitize folder name (no traversal, only simple names or nested simple paths)
      if (folder.includes('..')) folder = 'uploads';
      folder = folder.split(/[\\/]+/).filter(Boolean).map(p => p.replace(/[^a-zA-Z0-9._-]/g, '_')).join(path.sep);
      const dest = path.join(IMAGES_BASE, folder);
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'))
});
const upload = multer({ storage });

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
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    const p = safePostPath(filename);
    // if exists, return conflict
    try {
      await fs.access(p);
      return res.status(409).json({ error: 'file exists' });
    } catch (e) {
      // not exists -> ok
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
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const p = safePostPath(filename);
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
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const rel = path.relative(ROOT, req.file.path).replace(/\\/g, '/');
    // return URL path that the server serves
    res.json({ url: '/' + rel });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Web editor running on http://localhost:${PORT}`));
