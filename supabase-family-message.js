(function(){
  // Supabase integration for index.html — fetch latest active family message
  // Uses public anon key only (safe for frontend). Reuses same SUPABASE_URL/ANON as admin.js
  const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

  let cachedFamily = null;

  function nowTime(){
    const d = new Date();
    return d.toLocaleTimeString();
  }

  async function fetchLatestFamilyMessage(){
    console.log('Actualisation message familial :', nowTime());
    const params = new URLSearchParams({
      select: 'id,message,author,created_at,expires_at',
      order: 'created_at.desc',
      limit: '10'
    });
    const url = `${SUPABASE_URL}/rest/v1/messages?${params.toString()}&active=eq.true&t=${Date.now()}`;
    try{
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      console.log('Message Supabase reçu :', data);
      if(Array.isArray(data) && data.length>0){
        const now = Date.now();
        // find the first non-expired message
        const valid = data.find(m => {
          if(!m) return false;
          if(m.expires_at){
            const exp = new Date(m.expires_at).getTime();
            return exp > now;
          }
          return true; // no expires_at => permanent
        });
        if(valid){
          // update DOM
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
      // on error, keep cachedFamily displayed if any
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
  }
})();
