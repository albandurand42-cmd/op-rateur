(function(){
  // Supabase integration for index.html — fetch latest active family message
  // Values provided by user
  const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

  // cache to avoid overwriting on error
  let cachedFamily = null;

  const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';

  async function fetchLatestFamilyMessage(){
    // build REST URL to Supabase (REST endpoint)
    const params = new URLSearchParams({
      select: 'message,author,created_at,expires_at',
      order: 'created_at.desc',
      limit: '1'
    });
    const url = `${SUPABASE_URL}/rest/v1/messages?${params.toString()}&t=${Date.now()}`;
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
      if(Array.isArray(data) && data.length>0){
        const m = data[0];
        // check expires_at
        if(m.expires_at){
          const exp = new Date(m.expires_at);
          if(exp.getTime() <= Date.now()){
            // expired, treat as no message
            return;
          }
        }
        // update DOM
        const textEl = document.getElementById('family-message-text');
        const srcEl = document.getElementById('family-message-source');
        if(textEl) textEl.textContent = (m.message.startsWith('❤️') ? m.message : '❤️ ' + m.message);
        if(srcEl) srcEl.textContent = '— ' + (m.author || '');
        cachedFamily = m;
      }
    }catch(e){
      console.error('Fetch family message failed:', e);
      // keep cachedFamily if exists, else do nothing (keep default message)
      if(cachedFamily){
        const textEl = document.getElementById('family-message-text');
        const srcEl = document.getElementById('family-message-source');
        if(textEl) textEl.textContent = (cachedFamily.message.startsWith('❤️') ? cachedFamily.message : '❤️ ' + cachedFamily.message);
        if(srcEl) srcEl.textContent = '— ' + (cachedFamily.author || '');
      }
    }
  }

  // initial + poll + wake hooks
  if(typeof window !== 'undefined'){
    try{ fetchLatestFamilyMessage(); }catch(e){console.warn(e)}
    if(window._familyMessagePoll) clearInterval(window._familyMessagePoll);
    window._familyMessagePoll = setInterval(fetchLatestFamilyMessage, 60 * 1000);
    window.addEventListener('focus', fetchLatestFamilyMessage);
    document.addEventListener('visibilitychange', () => { if(!document.hidden) fetchLatestFamilyMessage(); });
  }
})();
