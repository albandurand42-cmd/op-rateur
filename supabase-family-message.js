(function(){
  // supabase-family-message.js — fetch active messages from Supabase and rotate locally
  // Uses public anon key only (safe for frontend). Assumes supabase-js UMD is loaded.
  const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

  const ROTATE_INTERVAL_MS = 15000; // 15s
  const REFRESH_INTERVAL_MS = 30000; // 30s

  // supabase client
  let supabaseClient = null;
  if(typeof supabase !== 'undefined' && supabase && supabase.createClient){
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('supabase SDK not found — supabase-family-message requires the supabase-js UMD to be loaded before this script');
  }

  // state
  let messagesList = [];
  let currentIndex = 0;
  let rotateTimer = null;
  let refreshTimer = null;

  // expose for debug
  window._familyMessages = messagesList;
  window._familyCurrentIndex = currentIndex;

  function nowTime(){ return new Date().toLocaleTimeString(); }

  function renderCurrentMessage(){
    const textEl = document.getElementById('family-message-text');
    const srcEl = document.getElementById('family-message-source');
    if(!textEl || !srcEl) return;

    if(!messagesList || messagesList.length === 0){
      // Nothing to show: keep existing DOM as default
      console.log('Nombre de messages valides :', 0);
      window._familyMessages = messagesList;
      window._familyCurrentIndex = currentIndex;
      return;
    }

    // clamp currentIndex
    if(currentIndex >= messagesList.length) currentIndex = 0;
    const msg = messagesList[currentIndex];
    const text = String(msg.message || '');
    textEl.textContent = (text.startsWith('❤️') ? text : '❤️ ' + text);
    srcEl.textContent = 'Envoyé par : ' + (msg.author || '');

    // debug logs
    console.log('Nombre de messages valides :', messagesList.length);
    console.log('Index courant :', currentIndex);
    console.log('Rotation message à :', nowTime());
    console.log('Message affiché :', msg);

    // update inspectable windows vars
    window._familyMessages = messagesList;
    window._familyCurrentIndex = currentIndex;
  }

  function rotateMessage(){
    if(messagesList.length <= 1) return; // nothing to rotate
    currentIndex = (currentIndex + 1) % messagesList.length;
    renderCurrentMessage();
  }

  function ensureRotateTimer(){
    if(rotateTimer) return; // only one rotate interval
    rotateTimer = setInterval(rotateMessage, ROTATE_INTERVAL_MS);
    window._familyMessageRotate = rotateTimer;
    // render immediately if messages exist
    renderCurrentMessage();
  }

  function ensureRefreshTimer(){
    if(refreshTimer) return; // only one refresh interval
    refreshTimer = setInterval(fetchLatestFamilyMessage, REFRESH_INTERVAL_MS);
    window._familyMessageRefresh = refreshTimer;
  }

  async function fetchLatestFamilyMessage(){
    console.log('Actualisation message familial :', nowTime());
    if(!supabaseClient) return;

    try{
      const { data, error } = await supabaseClient
        .from('messages')
        .select('id,message,author,created_at,expires_at,active')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if(error){
        console.error('Erreur Supabase complète :', error);
        return; // keep existing messagesList
      }

      console.log('Message Supabase reçu :', data);

      const now = Date.now();
      const valid = (Array.isArray(data) ? data : []).filter(m => {
        if(!m) return false;
        if(m.expires_at && m.expires_at !== null){
          const t = new Date(m.expires_at).getTime();
          return t > now;
        }
        return true;
      });

      // preserve currently displayed message if still present
      const currentId = (messagesList[currentIndex] && messagesList[currentIndex].id) ? messagesList[currentIndex].id : null;

      messagesList = valid;

      // update exposed list immediately
      window._familyMessages = messagesList;

      if(messagesList.length === 0){
        currentIndex = 0;
        renderCurrentMessage();
        return;
      }

      if(currentId){
        const newIndex = messagesList.findIndex(m => m.id === currentId);
        if(newIndex !== -1){
          currentIndex = newIndex; // keep showing same message
          renderCurrentMessage();
          return;
        }
      }

      // current message disappeared or none before: keep first message
      currentIndex = 0;
      renderCurrentMessage();

    }catch(e){
      console.error('Fetch family message failed:', e);
      // keep existing messagesList and currentIndex
      renderCurrentMessage();
    }
  }

  // boot
  if(typeof window !== 'undefined'){
    // start rotation timer (single instance)
    ensureRotateTimer();
    // initial fetch
    fetchLatestFamilyMessage().then(() => {
      // ensure refresh timer only after initial fetch attempt
      ensureRefreshTimer();
    });

    // also refresh on focus/visibility
    window.addEventListener('focus', fetchLatestFamilyMessage);
    document.addEventListener('visibilitychange', () => { if(!document.hidden) fetchLatestFamilyMessage(); });

    // expose for manual debug
    window.fetchLatestFamilyMessage = fetchLatestFamilyMessage;
    // expose current state
    window._familyMessages = messagesList;
    window._familyCurrentIndex = currentIndex;
  }

})();
