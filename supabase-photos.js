(function(){
  // supabase-photos.js — load photos from Supabase Storage and rotate them in the dashboard
  const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';
  const BUCKET = 'family-photos';

  const ROTATE_INTERVAL_MS = 20 * 1000; // 20s
  const REFRESH_INTERVAL_MS = 60 * 1000; // 60s

  let supabaseClient = null;
  if(typeof supabase !== 'undefined' && supabase && supabase.createClient){
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('supabase SDK not found — supabase-photos requires the supabase-js UMD to be loaded before this script');
  }

  let photosList = []; // { storage_path, caption, author, created_at, active, publicUrl }
  let currentIndex = 0;
  let rotateTimer = null;
  let refreshTimer = null;

  // debug exposure
  window._familyPhotos = photosList;
  window._familyPhotoIndex = currentIndex;

  function nowTime(){ return new Date().toLocaleTimeString(); }

  // capture current local fallback (existing images) to restore if no supabase photos
  function captureFallback(){
    const img = document.getElementById('slide-img');
    const cap = document.getElementById('photo-caption');
    const auth = document.getElementById('photo-author');
    return {
      src: img ? img.src : null,
      caption: cap ? cap.textContent : '',
      author: auth ? auth.textContent : ''
    };
  }
  const fallback = captureFallback();

  function renderCurrentPhoto(){
    const imgEl = document.getElementById('slide-img');
    const capEl = document.getElementById('photo-caption');
    const authEl = document.getElementById('photo-author');
    if(!imgEl || !capEl || !authEl) return;

    if(!Array.isArray(photosList) || photosList.length === 0){
      // restore fallback
      if(fallback.src) imgEl.src = fallback.src;
      capEl.textContent = fallback.caption || '';
      authEl.textContent = fallback.author || '';
      return;
    }

    if(currentIndex >= photosList.length) currentIndex = 0;
    const photo = photosList[currentIndex];

    const src = (photo && photo.publicUrl) ? photo.publicUrl : (photo && photo.storage_path ? buildPublicUrl(photo.storage_path) : null);
    if(src){
      imgEl.src = src;
      imgEl.onerror = function(){
        console.error('Image failed to load, skipping to next:', src);
        setTimeout(() => rotatePhoto(), 250);
      };
    }

    capEl.textContent = photo && photo.caption ? photo.caption : '';
    authEl.textContent = 'Envoyé par : ' + (photo && photo.author ? photo.author : '');

    console.log('Photo affichée :', photo);
    window._familyPhotos = photosList;
    window._familyPhotoIndex = currentIndex;
  }

  function buildPublicUrl(storagePath){
    if(!supabaseClient) return null;
    try{
      const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(storagePath);
      return data && data.publicUrl ? data.publicUrl : null;
    }catch(e){
      console.error('buildPublicUrl error', e);
      return null;
    }
  }

  function rotatePhoto(){
    if(!Array.isArray(photosList) || photosList.length <= 1) return;
    currentIndex = (currentIndex + 1) % photosList.length;
    renderCurrentPhoto();
    console.log('Rotation photo à :', nowTime());
    console.log('Index courant :', currentIndex);
  }

  async function fetchFamilyPhotos(){
    console.log('Actualisation photos familiales :', nowTime());
    if(!supabaseClient) return;

    try{
      const { data, error } = await supabaseClient
        .from('photos')
        .select('id,storage_path,caption,author,created_at,active')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if(error){
        console.error('Erreur Supabase photos complète :', error);
        return;
      }

      console.log('Photos Supabase reçues :', data);

      const list = (Array.isArray(data) ? data : []).map(p => {
        const publicUrlData = supabaseClient.storage.from(BUCKET).getPublicUrl(p.storage_path);
        return Object.assign({}, p, { publicUrl: publicUrlData && publicUrlData.data ? publicUrlData.data.publicUrl : null });
      });

      const currentPath = (photosList[currentIndex] && photosList[currentIndex].storage_path) ? photosList[currentIndex].storage_path : null;
      photosList = list;

      // preserve current if still present
      if(currentPath){
        const newIndex = photosList.findIndex(x => x.storage_path === currentPath);
        if(newIndex !== -1){
          currentIndex = newIndex;
          renderCurrentPhoto();
          return;
        }
      }

      currentIndex = 0;
      renderCurrentPhoto();

    }catch(e){
      console.error('Fetch family photos failed:', e);
      renderCurrentPhoto();
    }
  }

  function ensureTimers(){
    if(!rotateTimer){
      rotateTimer = setInterval(rotatePhoto, ROTATE_INTERVAL_MS);
      window._familyPhotoRotate = rotateTimer;
    }
    if(!refreshTimer){
      refreshTimer = setInterval(fetchFamilyPhotos, REFRESH_INTERVAL_MS);
      window._familyPhotoRefresh = refreshTimer;
    }
  }

  // boot
  if(typeof window !== 'undefined'){
    fetchFamilyPhotos().then(() => {
      ensureTimers();
    });

    window.addEventListener('focus', fetchFamilyPhotos);
    document.addEventListener('visibilitychange', () => { if(!document.hidden) fetchFamilyPhotos(); });

    window._familyPhotos = photosList;
    window._familyPhotoIndex = currentIndex;
    window.fetchFamilyPhotos = fetchFamilyPhotos;
  }

})();
