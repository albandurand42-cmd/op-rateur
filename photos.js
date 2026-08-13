// photos.js — upload photos to Supabase public bucket "family-photos"
// Uses public anon key only. Assumes supabase-js UMD is loaded in the page.

const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

const supabaseClient = (typeof supabase !== 'undefined' && supabase && supabase.createClient)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const BUCKET = 'family-photos';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const authorEl = document.getElementById('author');
const photoEl = document.getElementById('photo');
const captionEl = document.getElementById('caption');
const sendBtn = document.getElementById('send');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');

let uploading = false;

function setStatus(text, isError = false){
  statusEl.textContent = text;
  statusEl.className = isError ? 'small error' : 'small';
}

function clearPreview(){
  previewEl.innerHTML = '';
}

photoEl.addEventListener('change', () => {
  clearPreview();
  const file = photoEl.files && photoEl.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){
    setStatus('Le fichier doit être une image.', true);
    photoEl.value = '';
    return;
  }
  if(file.size > MAX_SIZE){
    setStatus('Image trop lourde (max 10 Mo).', true);
    photoEl.value = '';
    return;
  }
  // preview
  const img = document.createElement('img');
  img.src = URL.createObjectURL(file);
  img.onload = () => { URL.revokeObjectURL(img.src); };
  previewEl.appendChild(img);
  setStatus('Aperçu prêt');
});

function getExtFromFile(file){
  const name = file.name || '';
  const parts = name.split('.');
  if(parts.length > 1){
    return parts.pop().toLowerCase();
  }
  // fallback from mime
  const mime = file.type || '';
  if(mime === 'image/jpeg') return 'jpg';
  if(mime === 'image/png') return 'png';
  if(mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function removeUploaded(path){
  if(!supabaseClient) return;
  try{
    const { error } = await supabaseClient.storage.from(BUCKET).remove([path]);
    if(error) console.error('Failed to remove orphaned file:', error);
  }catch(e){ console.error('Remove error', e); }
}

async function uploadAndRecord(){
  if(uploading) return;
  if(!supabaseClient){ setStatus('Supabase non initialisé', true); return; }

  const author = (authorEl.value || '').trim();
  const caption = (captionEl.value || '').trim();
  const file = photoEl.files && photoEl.files[0];

  if(!author){ setStatus('Nom obligatoire', true); return; }
  if(!file){ setStatus('Sélectionne une photo', true); return; }
  if(!file.type.startsWith('image/')){ setStatus('Le fichier doit être une image.', true); return; }
  if(file.size > MAX_SIZE){ setStatus('Image trop lourde (max 10 Mo).', true); return; }

  uploading = true;
  sendBtn.disabled = true;
  setStatus('Envoi en cours...');

  const ext = getExtFromFile(file);
  const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2,10);
  const fileName = `${Date.now()}-${uuid}.${ext}`;
  const storagePath = fileName; // root of bucket

  try{
    // upload
    const { data: uploadData, error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(storagePath, file, { cacheControl: '3600', upsert: false });
    if(uploadError){
      console.error('Upload error:', uploadError);
      setStatus('Échec de l\'upload : ' + (uploadError.message || uploadError), true);
      uploading = false; sendBtn.disabled = false; return;
    }

    console.log('Upload réussi :', uploadData);

    // create DB record
    const payload = {
      storage_path: storagePath,
      caption: caption || null,
      author: author,
      active: true
    };

    const { data: insertData, error: insertError } = await supabaseClient
      .from('photos')
      .insert([payload])
      .select()
      .single();

    if(insertError){
      console.error('DB insert error:', insertError);
      // try to cleanup uploaded file
      await removeUploaded(storagePath);
      setStatus('Échec en base de données : ' + (insertError.message || JSON.stringify(insertError)), true);
      uploading = false; sendBtn.disabled = false; return;
    }

    console.log('Photo record created:', insertData);

    // success
    setStatus('Photo envoyée ✓');
    photoEl.value = '';
    captionEl.value = '';
    clearPreview();
    // keep author value for convenience

  }catch(e){
    console.error('Unexpected error during uploadAndRecord:', e);
    setStatus('Erreur inattendue — voir console', true);
  }finally{
    uploading = false;
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  uploadAndRecord();
});

// expose for debug
window._photosUpload = {
  uploadAndRecord,
};
