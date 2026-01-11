async function qs(id){return document.getElementById(id)}

const postsList = document.getElementById('posts');
const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const renameBtn = document.getElementById('renameBtn');
const imageFolderSel = document.getElementById('imageFolder');
const previewArea = document.getElementById('previewArea');
const textarea = document.getElementById('content');
const resizer = document.getElementById('resizer');
const togglePreviewBtn = document.getElementById('togglePreview');

const titleInput = document.getElementById('title');
const dateInput = document.getElementById('date');
const authorInput = document.getElementById('author');
const collapseSidebarBtn = document.getElementById('collapseSidebar');
const authorsButton = document.getElementById('authorsButton');
const authorsMenu = document.getElementById('authorsMenu');
const authorsList = document.getElementById('authorsList');
const authorsNewInput = document.getElementById('authorsNewInput');
const authorsNewBtn = document.getElementById('authorsNewBtn');
const categoriesButton = document.getElementById('categoriesButton');
const categoriesMenu = document.getElementById('categoriesMenu');
const categoriesList = document.getElementById('categoriesList');
const categoriesNewInput = document.getElementById('categoriesNewInput');
const categoriesNewBtn = document.getElementById('categoriesNewBtn');
const previewImagePathEl = document.getElementById('previewImagePath');
const previewFilenameEl = document.getElementById('previewFilename');
const featuredInput = document.getElementById('featured');

let current = null;
let isPreviewVisible = true;
let currentImageMode = 'inline';

// helper to validate filename prefix
function filenameValidPrefix(name){
  return /^\d{4}-\d{2}-\d{2}-/.test(name);
}

// sanitize folder/author names to safe path segments
function sanitizeFolderName(s){
  return String(s||'').trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_.\/]/g, '-')
    .replace(/-+/g, '-').replace(/(^-|-$)/g, '');
}

function parseAuthors(raw){
  if(!raw) return [];
  if(Array.isArray(raw)) return raw.map(a=>String(a).trim()).filter(Boolean);
  return String(raw||'').split(',').map(s=>s.trim()).filter(Boolean);
}

function normalizeAuthors(raw){
  return parseAuthors(raw).map(a=>slugify(a)).filter(Boolean);
}

function primaryAuthor(raw){
  const authors = normalizeAuthors(raw);
  return authors.length ? authors[0] : '';
}

function parseFeatured(raw){
  const val = String(raw || '').trim().toLowerCase();
  return val === 'true' || val === 'yes' || val === '1' || val === 'on';
}

// status indicator helper
const statusIndicator = document.getElementById('statusIndicator');
let statusTimer = null;
function showStatus(message, type='info', duration=3000){
  if(statusTimer) clearTimeout(statusTimer);
  statusIndicator.textContent = message;
  statusIndicator.className = 'status-indicator show ' + type;
  statusTimer = setTimeout(()=>{
    statusIndicator.classList.remove('show');
  }, duration);
}

// validate metadata format
function validateMetadata(title, date, authors, categories, image){
  const errors = [];
  
  // validate date format
  if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)){
    errors.push('Date must be YYYY-MM-DD format');
  } else {
    // validate it's a valid date
    const dateObj = new Date(date + 'T00:00:00Z');
    if(isNaN(dateObj.getTime())){
      errors.push('Date is not a valid date');
    }
  }
  
  // validate title exists
  if(!title || title.trim() === ''){
    errors.push('Title cannot be empty');
  }
  
  // validate authors if provided
  const normalizedAuthors = normalizeAuthors(authors);
  if(normalizedAuthors.some(a=>!/^[a-z0-9][a-z0-9-_]*$/.test(a))){
    errors.push('Authors must use letters, numbers, dashes, or underscores');
  }
  
  // validate categories if provided
  if(categories && !Array.isArray(categories)){
    errors.push('Categories must be an array');
  }
  
  // validate image path if provided (basic check, allow optional leading slash)
  const normalizedImage = image ? image.replace(/^\//, '') : '';
  if(normalizedImage && normalizedImage !== '(none)' && !normalizedImage.startsWith('assets/')){
    errors.push('Image path should start with "assets/"');
  }
  
  return { valid: errors.length === 0, errors };
}

// create a hidden file input for uploads
const hiddenFile = document.createElement('input'); hiddenFile.type = 'file'; hiddenFile.style.display = 'none'; document.body.appendChild(hiddenFile);
hiddenFile.addEventListener('change', async () => {
  const f = hiddenFile.files[0]; if(!f) return;
  const mode = currentImageMode || 'inline';
  await handleImageFile(f, { mode });
  currentImageMode = 'inline';
});

function getUploadsFilename(pathStr){
  const normalized = String(pathStr || '').trim().replace(/^\//, '');
  if(!normalized.startsWith('assets/images/uploads/')) return '';
  const parts = normalized.split('/');
  return parts[parts.length - 1];
}

async function handleImageFile(f, opts={}){
  const mode = opts.mode || 'inline';
  const silentStatus = opts.silentStatus;
  const dateVal = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().slice(0,10);
  const titleVal = titleInput && titleInput.value ? titleInput.value : '';
  const authorVal = primaryAuthor(authorInput && authorInput.value ? authorInput.value : '');
  const ext = getImageExt(f.name);
  let overwrite = false;
  let uploadName = '';
  if(mode === 'cover'){
    const existingName = getUploadsFilename(previewImagePathEl && previewImagePathEl.textContent ? previewImagePathEl.textContent : '');
    const existingExt = existingName ? getImageExt(existingName) : '';
    if(existingName && existingExt.toLowerCase() === ext.toLowerCase()){
      uploadName = existingName;
      overwrite = true;
    }
  }
  if(!uploadName){
    const tempId = Date.now().toString(36);
    uploadName = buildTempImageName(dateVal, titleVal, authorVal, ext, tempId);
  }
  const fd = new FormData();
  // always upload to assets/images/uploads
  fd.append('folder', 'uploads');
  if(overwrite) fd.append('overwrite', 'true');
  fd.append('name', uploadName);
  fd.append('author', authorVal);
  fd.append('title', titleInput && titleInput.value ? titleInput.value : '');
  fd.append('date', dateInput && dateInput.value ? dateInput.value : '');
  fd.append('image', f);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const j = await res.json();
  if(j.url){
    const normalized = j.url.startsWith('/') ? j.url : '/' + j.url;
    const hasCover = previewImagePathEl && previewImagePathEl.textContent && previewImagePathEl.textContent !== '(none)';
    if(mode === 'cover'){
      previewImagePathEl.textContent = normalized;
      if(!silentStatus) showStatus((j.duplicate ? 'Reused existing cover: ' : 'Cover set: ') + normalized, 'success');
      renderPreview(); checkDirty();
    } else {
      insertImageMarkdown(normalized);
      if(!silentStatus) showStatus((j.duplicate ? 'Reused image: ' : 'Inserted image: ') + normalized, 'success');
      renderPreview(); checkDirty();
      // inline uploads should not override cover
      if(!hasCover && previewImagePathEl.textContent === '(none)'){
        // leave cover unset; user sets via cover button
      }
    }
  } else showStatus('Upload failed', 'error');
}

// toggle dropdown menu
categoriesButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = categoriesMenu.style.display !== 'none';
  categoriesMenu.style.display = isOpen ? 'none' : 'block';
});

// close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if(!document.getElementById('categoriesDropdown').contains(e.target)){
    categoriesMenu.style.display = 'none';
  }
});

// authors dropdown
authorsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = authorsMenu.style.display !== 'none';
  authorsMenu.style.display = isOpen ? 'none' : 'block';
});

document.addEventListener('click', (e) => {
  if(!document.getElementById('authorsDropdown').contains(e.target)){
    authorsMenu.style.display = 'none';
  }
});

// add new category from input
categoriesNewBtn.addEventListener('click', () => {
  const name = categoriesNewInput.value.trim();
  if(!name) return;
  const exists = Array.from(categoriesList.querySelectorAll('input[type="checkbox"]')).some(cb=>cb.value===name);
  if(!exists){ 
    const item = document.createElement('div'); 
    item.className = 'category-item';
    item.innerHTML = `<input type="checkbox" value="${name}" id="cat-${name}" checked /><label for="cat-${name}">${name}</label>`;
    item.querySelector('input').addEventListener('change', ()=>{ checkDirty(); updateCategoriesButton(); });
    categoriesList.appendChild(item); 
    categoriesNewInput.value = '';
    updateCategoriesButton(); 
    checkDirty();
  }
});

// add category on Enter key
categoriesNewInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){ e.preventDefault(); categoriesNewBtn.click(); }
});

// add new author from input
authorsNewBtn.addEventListener('click', () => {
  const name = authorsNewInput.value.trim();
  if(!name) return;
  const exists = Array.from(authorsList.querySelectorAll('input[type="checkbox"]')).some(cb=>cb.value===name);
  if(!exists){ 
    const item = document.createElement('div'); 
    item.className = 'category-item';
    item.innerHTML = `<input type="checkbox" value="${name}" id="author-${name}" checked /><label for="author-${name}">${name}</label>`;
    item.querySelector('input').addEventListener('change', ()=>{ syncAuthorInput(); checkDirty(); updateAuthorsButton(); updateFilenamePreview(); });
    authorsList.appendChild(item); 
    authorsNewInput.value = '';
    updateAuthorsButton(); 
    syncAuthorInput();
    checkDirty();
  }
});

authorsNewInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){ e.preventDefault(); authorsNewBtn.click(); }
});

// ...existing code...
document.querySelectorAll('.toolbar button[data-action]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const act = btn.getAttribute('data-action'); handleToolbar(act);
  });
});

// drag & drop image into editor
['dragenter','dragover','dragleave','drop'].forEach(evt=>{
  textarea.addEventListener(evt, e=>{
    e.preventDefault(); e.stopPropagation();
  });
});

textarea.addEventListener('drop', async (e)=>{
  const dt = e.dataTransfer;
  if(!dt || !dt.files || !dt.files.length) return;
  const file = dt.files[0];
  if(file && file.type && file.type.startsWith('image/')){
    await handleImageFile(file);
  }
});

// paste image to insert
textarea.addEventListener('paste', async (e)=>{
  const items = e.clipboardData && e.clipboardData.items ? Array.from(e.clipboardData.items) : [];
  const fileItem = items.find(it=> it.kind === 'file' && it.type && it.type.startsWith('image/'));
  if(fileItem){
    e.preventDefault();
    const file = fileItem.getAsFile();
    if(file) await handleImageFile(file);
  }
});

document.getElementById('togglePreview').addEventListener('click', ()=>{
  isPreviewVisible = !isPreviewVisible; previewArea.style.display = isPreviewVisible ? 'block' : 'none'; resizer.style.display = isPreviewVisible ? 'block' : 'none';
});

// collapse sidebar
if(collapseSidebarBtn){
  collapseSidebarBtn.addEventListener('click', ()=>{
    const sidebar = document.querySelector('.sidebar');
    if(!sidebar) return;
    sidebar.classList.toggle('collapsed');
    collapseSidebarBtn.textContent = sidebar.classList.contains('collapsed') ? '➡' : '⬅';
    collapseSidebarBtn.setAttribute('aria-label', sidebar.classList.contains('collapsed') ? 'Expand sidebar' : 'Collapse sidebar');
  });
}

function handleToolbar(action){
  const ta = textarea; const start = ta.selectionStart, end = ta.selectionEnd, text = ta.value;
  function replace(newText, selectFromEnd){
    ta.value = text.slice(0,start) + newText + text.slice(end);
    const pos = start + newText.length - (selectFromEnd||0);
    ta.selectionStart = ta.selectionEnd = pos; ta.focus(); renderPreview();
  }
  if(action === 'h1') replace('# ' + (text.slice(start,end) || 'Heading'));
  else if(action === 'bold') replace('**' + (text.slice(start,end) || 'bold') + '**');
  else if(action === 'italic') replace('*' + (text.slice(start,end) || 'italic') + '*');
  else if(action === 'link') replace('[' + (text.slice(start,end) || 'link text') + '](http://)');
  else if(action === 'cover-image'){ currentImageMode = 'cover'; hiddenFile.click(); }
  else if(action === 'inline-image'){ currentImageMode = 'inline'; hiddenFile.click(); }
  else if(action === 'code') replace('``\n' + (text.slice(start,end) || 'code') + '\n```');
}

function normalizeAssetUrl(src){
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
  const val = String(src || '').trim();
  if(!val) return '';
  if(/^https?:\/\//i.test(val) || val.startsWith('data:') || val.startsWith('blob:')) return val;
  if(val.startsWith('/assets/')) return origin + val;
  if(val.startsWith('assets/')) return origin + '/' + val;
  return val;
}

function rewriteAssetImages(html){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  wrapper.querySelectorAll('img').forEach(img=>{
    const normalized = normalizeAssetUrl(img.getAttribute('src'));
    if(normalized) img.setAttribute('src', normalized);
  });
  return wrapper.innerHTML;
}

// use marked for rendering
function renderPreview(){
  const md = textarea.value || '';
  try{ let html = marked.parse(md);
    html = rewriteAssetImages(html);
    // if an image URL is set in preview path, display it at top of preview
    const imgPath = previewImagePathEl && previewImagePathEl.textContent && previewImagePathEl.textContent !== '(none)' ? previewImagePathEl.textContent : '';
    const normalizedCover = normalizeAssetUrl(imgPath);
    if(normalizedCover){ html = `<p><img src="${normalizedCover}" style="max-width:100%;border-radius:6px;margin-bottom:10px"></p>` + html; }
    previewArea.innerHTML = html;
  }
  catch(e){ previewArea.textContent = md; }
}
textarea.addEventListener('input', renderPreview);
// imageInput.addEventListener('input', renderPreview);

// resizer logic (desktop)
(function(){
  let dragging = false, startX=0, startWidth=0;
  resizer.addEventListener('mousedown', e=>{ dragging=true; startX=e.clientX; startWidth=textarea.getBoundingClientRect().width; document.body.style.cursor='col-resize'; });
  window.addEventListener('mousemove', e=>{ if(!dragging) return; const dx = e.clientX - startX; const newWidth = Math.max(320, startWidth + dx); textarea.style.flex = '0 0 ' + newWidth + 'px'; });
  window.addEventListener('mouseup', ()=>{ if(dragging){ dragging=false; document.body.style.cursor=''; } });
  // mobile: vertical resize handled by css
})();

// keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); if(current) saveCurrent(); else saveNewFromForm(); }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b'){ e.preventDefault(); handleToolbar('bold'); }
});

// posts list behavior
async function loadPosts(){
  const res = await fetch('/api/posts');
  const posts = await res.json(); postsList.innerHTML='';
  posts.sort((a,b)=> (b.data.date||'').localeCompare(a.data.date||''));
  posts.forEach(p=>{
    const li = document.createElement('li'); 
    const title = p.data.title || p.filename;
    const date = p.data.date ? new Date(p.data.date).toLocaleDateString() : '';
    // Clean up image path: remove quotes, trim whitespace
    let image = p.data.image ? String(p.data.image).replace(/^["']|["']$/g, '').trim() : '';
    image = (image && image !== '(none)' && image !== '') ? image : null;
    
    // Create thumbnail if image exists
    let thumbnailHtml = '';
    if(image){
      thumbnailHtml = `<img src="${image}" alt="${title}" class="post-thumbnail" />`;
    }
    
    li.innerHTML = `<div class="post-info"><div class="post-title">${title}</div>${date ? `<div class="post-date">${date}</div>` : ''}</div>${thumbnailHtml}`;
    li.dataset.filename = p.filename;
    li.addEventListener('click', ()=> maybeNavigate(()=> loadPostWithCheck(p.filename)));
    if(current && current === p.filename) li.classList.add('active');
    postsList.appendChild(li);
  });
}

// load categories from existing posts
async function loadCategories(){
  try{
    const res = await fetch('/api/posts'); const posts = await res.json();
    const set = new Set();
    posts.forEach(p=>{ if(p.data && p.data.categories){ const cats = Array.isArray(p.data.categories) ? p.data.categories : String(p.data.categories).replace(/\[|\]|\s+/g,'').split(','); cats.forEach(c=>c && set.add(c)); }});
    categoriesList.innerHTML = '';
    Array.from(set).sort().forEach(c=>{ 
      const item = document.createElement('div'); 
      item.className = 'category-item';
      item.innerHTML = `<input type="checkbox" value="${c}" id="cat-${c}" /><label for="cat-${c}">${c}</label>`;
      item.querySelector('input').addEventListener('change', ()=>{ checkDirty(); updateCategoriesButton(); });
      categoriesList.appendChild(item); 
    });
  }catch(e){ console.warn(e); }
}

async function loadAuthors(){
  try{
    const res = await fetch('/api/posts'); const posts = await res.json();
    const set = new Set();
    posts.forEach(p=>{
      if(p.data){
        const authors = normalizeAuthors(p.data.authors || p.data.author);
        authors.forEach(a=>{ if(a) set.add(a); });
      }
    });
    if(authorsList){
      authorsList.innerHTML = '';
      Array.from(set).sort().forEach(a=>{
        const item = document.createElement('div'); 
        item.className = 'category-item';
        item.innerHTML = `<input type="checkbox" value="${a}" id="author-${a}" /><label for="author-${a}">${a}</label>`;
        item.querySelector('input').addEventListener('change', ()=>{ syncAuthorInput(); checkDirty(); updateAuthorsButton(); updateFilenamePreview(); });
        authorsList.appendChild(item); 
      });
      updateAuthorsButton();
      syncAuthorInput();
    }
  }catch(e){ console.warn(e); }
}

async function loadPost(filename){
  const res = await fetch('/api/posts/' + filename); const body = await res.json();
  const raw = body.content;
  // extract date from filename (YYYY-MM-DD prefix)
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  const filenameDate = dateMatch ? dateMatch[1] : '';
  if(raw.startsWith('---')){
    const parts = raw.split('---'); const fm = parts[1] || ''; const content = parts.slice(2).join('---').trim(); const meta = {};
    fm.split(/\r?\n/).forEach(line=>{ const idx=line.indexOf(':'); if(idx>0){ const k=line.slice(0,idx).trim(); const v=line.slice(idx+1).trim(); meta[k]=v.replace(/^\s+|\s+$/g,''); }});
    titleInput.value = meta.title ? meta.title.replace(/^"|"$/g,'') : '';
    // use date from frontmatter, fallback to filename date
    dateInput.value = meta.date || filenameDate || '';
    const authorsRaw = meta.authors || meta.author || '';
    const authors = normalizeAuthors(authorsRaw);
    setSelectedAuthors(authors);
    authorInput.value = authors.join(', ');
    const catsRaw = meta.categories || '';
    // parse categories into array
    let cats = [];
    try{
      // attempt to parse YAML-like array: ["a", "b"] or simple comma list
      if(/\[.*\]/.test(catsRaw)){
        cats = catsRaw.replace(/^[\[\]]+/g,'').replace(/[\[\]]+$/g,'').split(',').map(s=>s.replace(/^["']|["']$/g,'').trim()).filter(Boolean);
      } else {
        cats = String(catsRaw).split(',').map(s=>s.trim()).filter(Boolean);
      }
    }catch(e){ cats = String(catsRaw).split(',').map(s=>s.trim()).filter(Boolean); }
    if(cats.length){ await loadCategories(); setSelectedCategories(cats); }
    else { /* no categories selected */ }
    textarea.value = content;
  if(featuredInput){
    featuredInput.checked = parseFeatured(meta.featured);
  }
  previewImagePathEl.textContent = meta.image || '(none)';
  updateFilenamePreview();
} else { textarea.value = raw; }
  current = filename; updateActiveList(); renderPreview(); captureState();
}

function updateActiveList(){ Array.from(postsList.children).forEach(li=>{ li.classList.toggle('active', li.dataset.filename === current); }); }

function slugify(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

function buildFilename(dateVal, titleVal, authorVal){
  const date = dateVal || new Date().toISOString().slice(0,10);
  const titleSlug = slugify(titleVal || 'post') || 'post';
  const authorSlug = primaryAuthor(authorVal);
  const slugPart = authorSlug ? `${titleSlug}-${authorSlug}` : titleSlug;
  return `${date}-${slugPart}.md`;
}

function buildImageName(dateVal, titleVal, authorVal, ext){
  const date = dateVal || new Date().toISOString().slice(0,10);
  const titleSlug = slugify(titleVal || 'post') || 'post';
  const authorSlug = primaryAuthor(authorVal) || 'author';
  const safeExt = ext && ext.startsWith('.') ? ext : '.png';
  return `${date}-${titleSlug}-${authorSlug}${safeExt}`;
}

function buildTempImageName(dateVal, titleVal, authorVal, ext, tempId){
  const base = buildImageName(dateVal, titleVal, authorVal, ext);
  const tid = tempId || Date.now().toString(36);
  const lastDot = base.lastIndexOf('.');
  const stem = lastDot > -1 ? base.slice(0, lastDot) : base;
  const suffix = lastDot > -1 ? base.slice(lastDot) : (ext && ext.startsWith('.') ? ext : '.png');
  return `${stem}-${tid}${suffix}`;
}

function getImageExt(pathStr){
  const m = String(pathStr||'').match(/(\.[a-zA-Z0-9]+)$/);
  return m ? m[1] : '.png';
}

function syncImagePathWithMeta(){
  const currentPath = previewImagePathEl && previewImagePathEl.textContent ? previewImagePathEl.textContent.trim() : '';
  if(!currentPath || currentPath === '(none)') return;
  if(!currentPath.startsWith('assets/images/uploads/')) return;
  const date = dateInput.value || new Date().toISOString().slice(0,10);
  const title = titleInput.value || 'post';
  const author = primaryAuthor(authorInput.value) || 'author';
  const ext = getImageExt(currentPath);
  const expectedName = buildImageName(date, title, author, ext);
  const expectedPath = `assets/images/uploads/${expectedName}`;
  if(expectedPath !== currentPath){
    return expectedPath;
  }
}

// helper: get/set multiple selected categories
function getSelectedCategories(){
  const checkboxes = categoriesList.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
}
function setSelectedCategories(arr){
  arr = (arr || []).map(a=>String(a));
  // set checkboxes to match array
  categoriesList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = arr.includes(cb.value);
  });
  updateCategoriesButton();
}
function updateCategoriesButton(){
  const selected = getSelectedCategories();
  if(selected.length === 0){
    categoriesButton.textContent = 'Select categories...';
  } else if(selected.length === 1){
    categoriesButton.textContent = selected[0];
  } else {
    categoriesButton.textContent = selected.length + ' categories';
  }
}

// helper: get/set selected authors
function getSelectedAuthors(){
  if(!authorsList) return [];
  const checkboxes = authorsList.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
}
function setSelectedAuthors(arr){
  arr = (arr || []).map(a=>String(a));
  if(!authorsList) return;
  authorsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = arr.includes(cb.value);
  });
  updateAuthorsButton();
  syncAuthorInput();
}
function updateAuthorsButton(){
  const selected = getSelectedAuthors();
  if(selected.length === 0){
    authorsButton.textContent = 'Select authors...';
  } else if(selected.length === 1){
    authorsButton.textContent = selected[0];
  } else {
    authorsButton.textContent = selected.length + ' authors';
  }
}

function syncAuthorInput(){
  if(authorInput){
    const authors = getSelectedAuthors();
    authorInput.value = authors.join(', ');
  }
}

// new post button
newBtn.addEventListener('click', ()=>{ current = null; 
   titleInput.value=''; dateInput.value=new Date().toISOString().slice(0,10); authorInput.value=''; 
  // refresh selectable tags and authors from existing posts
  loadCategories(); 
  loadAuthors();
  // clear multi-select
  if(categoriesList) { Array.from(categoriesList.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false); updateCategoriesButton(); }
  if(authorsList) { Array.from(authorsList.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false); updateAuthorsButton(); syncAuthorInput(); }
  if(featuredInput) featuredInput.checked = false;
  previewImagePathEl.textContent='(none)'; textarea.value=''; renderPreview(); updateFilenamePreview(); updateActiveList(); captureState(); });

function updateFilenamePreview(){
  const title = titleInput.value || 'post';
  const date = dateInput.value || new Date().toISOString().slice(0,10);
  const authors = normalizeAuthors(authorInput.value || getSelectedAuthors());
  const generated = buildFilename(date, title, authors);
  previewFilenameEl.textContent = generated;
}
 
function updateImagePreviewPath(){
  // previewImagePathEl already holds the path; ensure display
  previewImagePathEl.textContent = previewImagePathEl.textContent || '(none)';
}

// update previews live
[titleInput, dateInput, authorInput].forEach(i=>i.addEventListener('input', updateFilenamePreview));
// imageInput.addEventListener('input', updateImagePreviewPath);

// call after loads
updateFilenamePreview(); updateImagePreviewPath();

saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); if(!current){ saveNewFromForm(); } else { saveCurrent(); } });
async function saveCurrent(){ if(!current) return; // validate filename still
  if(!filenameValidPrefix(current)) return alert('Current filename does not start with YYYY-MM-DD-'); await saveAs(current); await loadPosts(); }

async function saveNewFromForm(){ const title = titleInput.value || 'post'; const date = dateInput.value || new Date().toISOString().slice(0,10); const authors = normalizeAuthors(authorInput.value); const filename = buildFilename(date, title, authors);
  if(!filenameValidPrefix(filename)) return showStatus('Filename must start with YYYY-MM-DD-', 'error');
  const resCheck = await fetch('/api/posts'); const posts = await resCheck.json(); if(posts.some(p=>p.filename === filename)){ if(!confirm('Filename exists. Overwrite?')) return; }
  await saveAs(filename); await loadPosts(); captureState(); }

async function saveAs(filename){ const title = titleInput.value || ''; const date = dateInput.value || ''; const authors = normalizeAuthors(authorInput.value); 
  // collect selected categories and any custom comma-separated entries
  const selectedCats = getSelectedCategories();
  const customCats = categoriesCustom && categoriesCustom.value ? categoriesCustom.value.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const allCats = Array.from(new Set([...(selectedCats||[]), ...customCats]));
  const image = previewImagePathEl.textContent && previewImagePathEl.textContent !== '(none)' ? previewImagePathEl.textContent : ''; const content = textarea.value || '';
  if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert('Date must be YYYY-MM-DD');
  if(!filename || !filename.endsWith('.md')) return alert('Filename must end with .md');
  if(!filenameValidPrefix(filename)) return alert('Filename must start with YYYY-MM-DD-');
  const catsYaml = allCats.map(c=>`"${c}"`).join(', ');
  const authorsYaml = authors.map(a=>`"${a}"`).join(', ');
  const meta = ['---', `layout: post`, `title: "${title}"`, `authors: [${authorsYaml}]`, `date: ${date}`, `categories: [${catsYaml}]`, `image: ${image}`, '---', ''].join('\n');
  const full = meta + '\n' + content + '\n';
  const method = current === filename ? 'PUT' : 'POST'; const url = method === 'POST' ? '/api/posts' : '/api/posts/' + filename; const body = method === 'POST' ? { filename, content: full } : { content: full };
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await res.json(); if(j.error) alert('Error: ' + j.error); else { current = filename; 
    previewFilenameEl.textContent = filename; alert('Saved ' + filename); updateActiveList(); }
 }

deleteBtn.addEventListener('click', async ()=>{ if(!current) return showStatus('Select a post to delete', 'error'); if(!confirm('Delete ' + current + '?')) return; const res = await fetch('/api/posts/' + current, { method: 'DELETE' }); const j = await res.json(); if(j.error) showStatus('Error: '+j.error, 'error'); else { showStatus('Deleted', 'success'); current=null; await loadPosts(); updateActiveList(); } });

renameBtn.addEventListener('click', async ()=>{ if(!current) return showStatus('Select a post to rename', 'error'); const newName = prompt('New filename (YYYY-MM-DD-title.md)', current); if(!newName) return; if(!filenameValidPrefix(newName)) return showStatus('New filename must start with YYYY-MM-DD-', 'error'); const res = await fetch('/api/rename', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ oldFilename: current, newFilename: newName }) }); const j = await res.json(); if(j.error) showStatus('Error: '+j.error, 'error'); else { showStatus('Renamed', 'success'); current=newName; await loadPosts(); updateActiveList(); } });

// images
async function loadImageFolders(){ try{ if(!imageFolderSel) return; const res = await fetch('/api/image-folders'); const folders = await res.json(); imageFolderSel.innerHTML=''; folders.forEach(f=>{ const o = document.createElement('option'); o.value=f; o.textContent=f; imageFolderSel.appendChild(o); }); const opt = document.createElement('option'); opt.value='uploads'; opt.textContent='uploads (default)'; if(!folders.includes('uploads')) imageFolderSel.appendChild(opt); } catch(e){ console.warn(e); } }

let originalState = null;
let isDirty = false;

// update UI when dirty state changes
function updateUnsavedUI(){
  try{
    if(typeof saveBtn !== 'undefined' && saveBtn) saveBtn.disabled = !isDirty;
  }catch(e){ /* ignore */ }
  // update draft display if present
  const draftEl = document.getElementById('draftTime');
  if(draftEl){
    draftEl.style.opacity = isDirty ? '1' : '0.7';
  }
  // small unsaved flag element (optional in DOM)
  const flag = document.getElementById('unsavedFlag');
  if(flag){ flag.style.display = isDirty ? 'inline' : 'none'; }
  // prepend a star to the document title when dirty
  if(typeof document !== 'undefined' && document.title){
    if(isDirty){ if(!document.title.startsWith('* ')) document.title = '* ' + document.title; }
    else { document.title = document.title.replace(/^\* /, ''); }
  }
}

function captureState(){
  originalState = {
    title: titleInput.value,
    date: dateInput.value,
    authors: authorInput.value,
    categories: getSelectedCategories(),
    featured: featuredInput ? featuredInput.checked : false,
    image: previewImagePathEl.textContent || '',
    content: textarea.value
  };
  isDirty = false; updateUnsavedUI();
}

function checkDirty(){
  const now = {
    title: titleInput.value,
    date: dateInput.value,
    authors: authorInput.value,
    categories: getSelectedCategories(),
    featured: featuredInput ? featuredInput.checked : false,
    image: previewImagePathEl.textContent || '',
    content: textarea.value
  };
  isDirty = JSON.stringify(now) !== JSON.stringify(originalState);
  updateUnsavedUI();
}

function captureSnapshot(){ return { title: titleInput.value, date: dateInput.value, authors: authorInput.value, categories: getSelectedCategories(), featured: featuredInput ? featuredInput.checked : false, image: previewImagePathEl.textContent || '', content: textarea.value }; }

// listen for input changes to mark dirty
([titleInput, dateInput, authorInput, textarea, featuredInput].filter(Boolean)).forEach(el=>{
  el.addEventListener('input', checkDirty);
  el.addEventListener('change', checkDirty);
});
// checkbox changes handled in loadCategories

// push undo on meaningful changes
['input','change'].forEach(evt=>{
  [titleInput,dateInput,authorInput,textarea,featuredInput].filter(Boolean).forEach(el=> el.addEventListener(evt, ()=>{
    pushUndo(captureSnapshot()); scheduleAutosave();
  }));
});

// restore draft
document.getElementById('restoreDraftBtn').addEventListener('click', ()=>{
  const d = loadDraft(); if(!d) return showStatus('No draft available', 'error'); const data = d.data;
  titleInput.value = data.title; dateInput.value = data.date; const authorsFromDraft = Array.isArray(data.authors) ? data.authors.join(', ') : (data.authors || data.author || '');
  authorInput.value = authorsFromDraft;
  setSelectedAuthors(parseAuthors(authorsFromDraft));
  // restore categories (array or comma string)
  const cats = Array.isArray(data.categories) ? data.categories : (data.categories ? String(data.categories).split(',').map(s=>s.trim()).filter(Boolean) : []);
  loadCategories().then(()=>{ if(cats.length) setSelectedCategories(cats); });
  if(featuredInput) featuredInput.checked = parseFeatured(data.featured);
  previewImagePathEl.textContent = data.image || '(none)'; textarea.value = data.content; renderPreview(); checkDirty(); captureState(); showStatus('Draft restored', 'success');
});

// undo/redo button handlers
document.getElementById('undoBtn').addEventListener('click', ()=>{ const state = popUndo(); if(state){ titleInput.value=state.title; dateInput.value=state.date; const authorsVal = Array.isArray(state.authors) ? state.authors.join(', ') : (state.authors || state.author || ''); authorInput.value=authorsVal; setSelectedAuthors(parseAuthors(authorsVal)); const sc = Array.isArray(state.categories) ? state.categories : (state.categories ? String(state.categories).split(',').map(s=>s.trim()).filter(Boolean) : []); if(sc.length) setSelectedCategories(sc); if(featuredInput) featuredInput.checked = parseFeatured(state.featured); previewImagePathEl.textContent = state.image || '(none)'; textarea.value=state.content; renderPreview(); checkDirty(); } });

document.getElementById('redoBtn').addEventListener('click', ()=>{ const state = popRedo(); if(state){ titleInput.value=state.title; dateInput.value=state.date; const authorsVal = Array.isArray(state.authors) ? state.authors.join(', ') : (state.authors || state.author || ''); authorInput.value=authorsVal; setSelectedAuthors(parseAuthors(authorsVal)); const sc = Array.isArray(state.categories) ? state.categories : (state.categories ? String(state.categories).split(',').map(s=>s.trim()).filter(Boolean) : []); if(sc.length) setSelectedCategories(sc); if(featuredInput) featuredInput.checked = parseFeatured(state.featured); previewImagePathEl.textContent = state.image || '(none)'; textarea.value=state.content; renderPreview(); checkDirty(); } });

// Draft autosave and undo/redo
const DRAFT_KEY = 'pq-editor-draft';
let autosaveTimer = null;
let undoStack = [], redoStack = [], maxStack = 100;

function pushUndo(state){ undoStack.push(JSON.stringify(state)); if(undoStack.length>maxStack) undoStack.shift(); redoStack = []; updateUndoRedoButtons(); }
function popUndo(){ if(!undoStack.length) return null; const s = undoStack.pop(); redoStack.push(JSON.stringify(captureSnapshot())); updateUndoRedoButtons(); return JSON.parse(s); }
function popRedo(){ if(!redoStack.length) return null; const s = redoStack.pop(); undoStack.push(JSON.stringify(captureSnapshot())); updateUndoRedoButtons(); return JSON.parse(s); }
function updateUndoRedoButtons(){ document.getElementById('undoBtn').disabled = undoStack.length===0; document.getElementById('redoBtn').disabled = redoStack.length===0; }

// autosave draft to localStorage
function scheduleAutosave(){ if(autosaveTimer) clearTimeout(autosaveTimer); autosaveTimer = setTimeout(()=>{ const s = captureSnapshot(); localStorage.setItem(DRAFT_KEY, JSON.stringify({ ts: Date.now(), data: s })); document.getElementById('draftTime').textContent = new Date().toLocaleString(); }, 2000); }

// load draft if exists
function loadDraft(){ try{ const raw = localStorage.getItem(DRAFT_KEY); if(!raw) return null; const d = JSON.parse(raw); return d; }catch(e){return null;} }

// initial undo state
pushUndo(captureSnapshot()); updateUndoRedoButtons();

// ensure draftTime shows existing draft
const existingDraft = loadDraft(); if(existingDraft){ document.getElementById('draftTime').textContent = new Date(existingDraft.ts).toLocaleString(); }

// intercept navigation from list clicks
function maybeNavigate(action){
  if(isDirty){ showConfirmModal(action); } else { action(); }
}

// update loadPost to use maybeNavigate when switching
const originalLoadPost = loadPost;
async function loadPostWithCheck(filename){
  await originalLoadPost(filename);
  captureState();
}

// replace list click handlers to call maybeNavigate
async function loadPosts(){
  const res = await fetch('/api/posts');
  const posts = await res.json(); postsList.innerHTML='';
  posts.sort((a,b)=> (b.data.date||'').localeCompare(a.data.date||''));
  posts.forEach(p=>{
    const li = document.createElement('li'); 
    const title = p.data.title || p.filename;
    const date = p.data.date ? new Date(p.data.date).toLocaleDateString() : '';
    li.innerHTML = `<div class="post-title">${title}</div>${date ? `<div class="post-date">${date}</div>` : ''}`;
    li.dataset.filename = p.filename;
    li.addEventListener('click', ()=> maybeNavigate(()=> loadPostWithCheck(p.filename)));
    if(current && current === p.filename) li.classList.add('active');
    postsList.appendChild(li);
  });
}

// ensure capture state after creating/loading
async function createNew(){ const title = titleInput.value || 'post'; const date = dateInput.value || new Date().toISOString().slice(0,10); const authors = normalizeAuthors(authorInput.value); let filename = buildFilename(date, title, authors);
  if(!filenameValidPrefix(filename)) return showStatus('Filename must start with YYYY-MM-DD-', 'error');
  const resCheck = await fetch('/api/posts'); const posts = await resCheck.json(); if(posts.some(p=>p.filename === filename)){ if(!confirm('Filename exists. Overwrite?')) return; }
  await saveAs(filename); await loadPosts(); captureState(); }

async function saveCurrent(){ if(!current) return; if(!filenameValidPrefix(current)) return showStatus('Current filename does not start with YYYY-MM-DD-', 'error'); await saveAs(current); await loadPosts(); captureState(); }

// modify saveAs to write frontmatter metadata from inputs
async function saveAs(filename){ const title = titleInput.value || ''; const date = dateInput.value || ''; const authors = normalizeAuthors(authorInput.value); 
  // collect selected categories
  const selectedCats = getSelectedCategories();
  const featured = featuredInput ? featuredInput.checked : false;
  const imageRaw = previewImagePathEl.textContent && previewImagePathEl.textContent !== '(none)' ? previewImagePathEl.textContent : '';
  let image = imageRaw ? imageRaw.replace(/^\//, '') : '';
  const content = textarea.value || '';
  
  // validate filename format
  if(!filename || !filename.endsWith('.md')) return showStatus('Filename must end with .md', 'error');
  if(!filenameValidPrefix(filename)) return showStatus('Filename must start with YYYY-MM-DD-', 'error');
  
  // validate metadata
  const validation = validateMetadata(title, date, authors, selectedCats, image);
  if(!validation.valid){
    const errorMsg = validation.errors.join('; ');
    return showStatus('Validation error: ' + errorMsg, 'error', 5000);
  }
  
  // ensure filename date matches or warn user
  const filenameDate = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  if(filenameDate && filenameDate[1] !== date) {
    if(!confirm(`Filename date (${filenameDate[1]}) doesn't match post date (${date}).\nContinue anyway?`)) return;
  }
  
  // if image lives under uploads, request rename on save to match current meta
  let renamePayload = null;
  if(image && image.startsWith('assets/images/uploads/')){
    const ext = getImageExt(image);
    const expectedName = buildImageName(date, title, authors, ext);
    const expectedPath = `assets/images/uploads/${expectedName}`;
    if(expectedPath !== image){
      renamePayload = { from: image, to: expectedPath };
      image = expectedPath;
      previewImagePathEl.textContent = expectedPath;
    }
  }

  const catsYaml = selectedCats.map(c=>`"${c}"`).join(', ');
  const authorsYaml = authors.map(a=>`"${a}"`).join(', ');
  const metaLines = ['---', `layout: post`, `title: "${title}"`, `authors: [${authorsYaml}]`, `date: ${date}`];
  if(featured) metaLines.push('featured: true');
  metaLines.push(`categories: [${catsYaml}]`, `image: ${image}`, '---', '');
  const meta = metaLines.join('\n');
  const full = meta + '\n' + content + '\n';
  const method = current === filename ? 'PUT' : 'POST'; const url = method === 'POST' ? '/api/posts' : '/api/posts/' + filename; const body = method === 'POST' ? { filename, content: full } : { content: full };

  if(renamePayload){ body.imageRename = renamePayload; }

  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await res.json(); if(j.error) showStatus('Error: ' + j.error, 'error'); else { current = filename; 
    previewFilenameEl.textContent = filename; showStatus('Saved ' + filename, 'success'); updateActiveList(); }
}

// capture initial state after initial loads
loadPosts(); loadCategories(); loadAuthors(); loadImageFolders(); renderPreview(); captureState();

// before unload warn (non-blocking modal) - show basic browser message as fallback
window.addEventListener('beforeunload', (e)=>{
  if(isDirty){ e.preventDefault(); e.returnValue = ''; }
});

// modal handlers for unsaved changes
const confirmModal = document.getElementById('confirmModal');
const modalSave = document.getElementById('modalSave');
const modalDiscard = document.getElementById('modalDiscard');
const modalCancel = document.getElementById('modalCancel');
let pendingAction = null;

function showConfirmModal(action){
  pendingAction = action;
  confirmModal.setAttribute('aria-hidden', 'false');
}

function hideConfirmModal(){
  confirmModal.setAttribute('aria-hidden', 'true');
  pendingAction = null;
}

modalSave.addEventListener('click', async ()=>{
  hideConfirmModal();
  if(current) await saveCurrent();
  if(pendingAction) pendingAction();
});

modalDiscard.addEventListener('click', ()=>{
  hideConfirmModal();
  isDirty = false;
  if(pendingAction) pendingAction();
});

modalCancel.addEventListener('click', hideConfirmModal);
function insertImageMarkdown(path){
  if(!textarea || !path) return;
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  const alt = titleInput && titleInput.value ? titleInput.value : 'image';
  const ta = textarea; const start = ta.selectionStart, end = ta.selectionEnd;
  const snippet = `![${alt}](${normalizedPath})`;
  ta.value = ta.value.slice(0,start) + snippet + ta.value.slice(end);
  const pos = start + snippet.length;
  ta.selectionStart = ta.selectionEnd = pos;
  ta.focus();
}
