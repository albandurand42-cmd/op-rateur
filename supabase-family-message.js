(function(){
  // Supabase integration for index.html — fetch latest active family message using supabase-js SDK
  // Uses public anon key only (safe for frontend). Reuses same SUPABASE_URL/ANON as admin.js
  const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

  // Initialize supabase client (relies on the UMD global from CDN)
  let supabaseClient = null;
  if(typeof supabase !== 'undefined' && supabase && supabase.createClient){
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('supabase SDK not found — supabase-family-message requires the supabase-js UMD to be loaded before this script');
  }

  let cachedFamily = null;

  function nowTime(){
    const d = new Date();
    return d.toLocaleTimeString();
  }

  async function fetchLatestFamilyMessage(){
    console.log('Actualisation message familial :', nowTime());
    if(!supabaseClient){
      console.warn('Supabase client not initialized — skipping family message fetch');
      return;
    }

    try{
      // Fetch the most recent active messages (fetch a small batch to allow skipping expired ones client-side)
      const { data, error } = await supabaseClient
        .from('messages')
        .select('id,message,author,created_at,expires_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if(error){
        console.error('Erreur Supabase complète :', error);
        return;
      }

      console.log('Message Supabase reçu :', data);

      if(Array.isArray(data) && data.length > 0){
        const now = Date.now();
        const valid = data.find(m => {
          if(!m) return false;
          if(m.expires_at){
            const exp = new Date(m.expires_at).getTime();
            return exp > now;
          }
          return true; // no expires_at => permanent
        });

        if(valid){
          const textEl = document.getElementById('family-message-text');
          const srcEl = document.getElementById('family-message-source');
          if(textEl) textEl.textContent = (String(valid.message).startsWith('❤️') ? valid.message : '❤️ ' + valid.message);
          if(srcEl) srcEl.textContent = 'Envoyé par : ' + (valid.author || '');
          cachedFamily = valid;
          return;
        }
      }
      // no valid message found: keep cached or default (do nothing)
    }catch(e){
      console.error('Fetch family message failed:', e);
      if(cachedFamily){
        const textEl = document.getElementById('family-message-text');
        const srcEl = document.getElementById('family-message-source');
        if(textEl) textEl.textContent = (String(cachedFamily.message).startsWith('❤️') ? cachedFamily.message : '❤️ ' + cachedFamily.message);
        if(srcEl) srcEl.textContent = 'Envoyé par : ' + (cachedFamily.author || '');
      }
    }
  }

  // initial + poll + wake hooks (30s)
  if(typeof window !== 'undefined'){
    try{ fetchLatestFamilyMessage(); }catch(e){console.warn(e)}
    if(window._familyMessagePoll) clearInterval(window._familyMessagePoll);
    window._familyMessagePoll = setInterval(fetchLatestFamilyMessage, 30 * 1000);
    window.addEventListener('focus', fetchLatestFamilyMessage);
    document.addEventListener('visibilitychange', () => { if(!document.hidden) fetchLatestFamilyMessage(); });
    // expose for debugging
    window.fetchLatestFamilyMessage = fetchLatestFamilyMessage;
  }
})();
