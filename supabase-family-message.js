(function(){
  // supabase-family-message.js — rotation of active family messages fetched from Supabase
  // Uses the public anon key only (safe for frontend). Assumes supabase-js UMD is loaded on the page.
  const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

  // Rotation / refresh timings
  const ROTATE_INTERVAL_MS = 15000; // 15s
  const REFRESH_INTERVAL_MS = 30000; // 30s

  // state
  let supabaseClient = null;
  if(typeof supabase !== 'undefined' && supabase && supabase.createClient){
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('supabase SDK not found — supabase-family-message requires the supabase-js UMD to be loaded before this script');
  }

  let messagesList = []; // array of valid messages (most recent first)
  let currentIndex = 0;
  let rotateTimer = null;
  let refreshTimer = null;
  let cachedDefault = {
    text: null,
    source: null
  };

  function nowTime(){ return new Date().toLocaleTimeString(); }

  function renderMessage(msg){
    const textEl = document.getElementById('family-message-text');
    const srcEl = document.getElementById('family-message-source');
    if(!textEl || !srcEl) return;
    if(!msg){
      // restore default
      if(cachedDefault.text !== null) textEl.textContent = cachedDefault.text;
      if(cachedDefault.source !== null) srcEl.textContent = cachedDefault.source;
      return;
    }
    const text = String(msg.message || '');
    textEl.textContent = (text.startsWith('❤️') ? text : '❤️ ' + text);
    srcEl.textContent = 'Envoyé par : ' + (msg.author || '');
  }

  function captureDefault(){
    const textEl = document.getElementById('family-message-text');
    const srcEl = document.getElementById('family-message-source');
    cachedDefault.text = textEl ? textEl.textContent : '';
    cachedDefault.source = srcEl ? srcEl.textContent : '';
  }

  function startRotation(){
    // clear existing
    if(rotateTimer) clearInterval(rotateTimer);
    // if 0 or 1 message, no rotation necessary but keep timer to check if list grows
    rotateTimer = setInterval(() => {
      if(messagesList.length <= 1) return; // nothing to rotate
      currentIndex = (currentIndex + 1) % messagesList.length;
      renderMessage(messagesList[currentIndex]);
    }, ROTATE_INTERVAL_MS);
    // show current immediately
    if(messagesList.length > 0){
      // ensure currentIndex is within bounds
      if(currentIndex >= messagesList.length) currentIndex = 0;
      renderMessage(messagesList[currentIndex]);
    } else {
      renderMessage(null);
    }
  }

  async function fetchLatestFamilyMessage(){
    console.log('Actualisation message familial :', nowTime());
    if(!supabaseClient) {
      console.warn('Supabase client not initialized — skipping fetchLatestFamilyMessage');
      return;
    }

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

      // filter out expired messages and normalize
      const now = Date.now();
      const valid = (Array.isArray(data) ? data : []).filter(m => {
        if(!m) return false;
        if(m.expires_at && m.expires_at !== null){
          const t = new Date(m.expires_at).getTime();
          return t > now;
        }
        return true; // no expires_at => permanent
      });

      // messages are already ordered by created_at desc from the query
      // determine next messagesList while trying to avoid flicker
      if(valid.length === 0){
        // clear list
        messagesList = [];
        currentIndex = 0;
        renderMessage(null);
        return;
      }

      // find id of currently displayed message so we can keep it if still present
      const currentId = (messagesList[currentIndex] && messagesList[currentIndex].id) ? messagesList[currentIndex].id : null;

      // update list
      messagesList = valid;

      // attempt to preserve currentIndex to the same message id if still present
      if(currentId){
        const newIndex = messagesList.findIndex(m => m.id === currentId);
        if(newIndex !== -1){
          currentIndex = newIndex;
          // keep displaying same message (avoid flicker)
          renderMessage(messagesList[currentIndex]);
          return;
        }
      }

      // if no previous message or it disappeared, keep displaying the first message but try to avoid abrupt change
      currentIndex = 0;
      renderMessage(messagesList[currentIndex]);

    }catch(e){
      console.error('Fetch family message failed:', e);
      // do not clear messagesList, keep showing cached/default
      if(messagesList.length > 0){
        renderMessage(messagesList[currentIndex]);
      } else {
        renderMessage(null);
      }
    }
  }

  // boot sequence
  if(typeof window !== 'undefined'){
    // capture default text/source so we can restore when no messages
    try{ captureDefault(); }catch(e){/* ignore */}

    // initial fetch
    fetchLatestFamilyMessage();

    // refresh timer (Supabase polling every 30s)
    if(refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchLatestFamilyMessage, REFRESH_INTERVAL_MS);
    window._familyMessageRefresh = refreshTimer;

    // rotation timer (15s)
    if(rotateTimer) clearInterval(rotateTimer);
    rotateTimer = setInterval(() => {
      if(messagesList.length <= 1) return;
      currentIndex = (currentIndex + 1) % messagesList.length;
      renderMessage(messagesList[currentIndex]);
    }, ROTATE_INTERVAL_MS);
    window._familyMessageRotate = rotateTimer;

    // focus/visibility hooks
    window.addEventListener('focus', fetchLatestFamilyMessage);
    document.addEventListener('visibilitychange', () => { if(!document.hidden) fetchLatestFamilyMessage(); });

    // expose function for manual testing
    window.fetchLatestFamilyMessage = fetchLatestFamilyMessage;
  }

})();
