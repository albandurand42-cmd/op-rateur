// admin.js — anonymous message sending to Supabase

const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI refs
const authorEl = document.getElementById('author');
const messageEl = document.getElementById('message');
const durationEl = document.getElementById('duration');
const sendBtn = document.getElementById('send');
const sendResult = document.getElementById('send-result');
const activeList = document.getElementById('active-list');

// Prefill author from localStorage
try{
  const savedAuthor = localStorage.getItem('familyAuthor');
  if(savedAuthor && authorEl) authorEl.value = savedAuthor;
}catch(e){console.warn('localStorage unavailable', e)}

async function loadActiveMessages(){
  if(!supabaseClient) return;
  activeList.textContent = 'Chargement...';
  try{
    const { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if(error){
      activeList.textContent = 'Erreur chargement : ' + (error.message || JSON.stringify(error));
      console.error('Erreur Supabase complète :', error);
      return;
    }
    if(!data || data.length === 0){
      activeList.textContent = 'Aucun message actif';
      return;
    }
    activeList.innerHTML = '';
    data.forEach(m => {
      const wrapper = document.createElement('div');
      wrapper.className = 'msg';
      wrapper.innerHTML = `<div>${escapeHtml(m.message)}</div><div class="author">— ${escapeHtml(m.author || 'Anonyme')} • ${new Date(m.created_at).toLocaleString()}</div>`;
      const actions = document.createElement('div');
      actions.className = 'actions';
      const disableBtn = document.createElement('button');
      disableBtn.textContent = 'Désactiver';
      disableBtn.className = 'btn-muted';
      disableBtn.addEventListener('click', async () => {
        await supabaseClient.from('messages').update({ active: false }).eq('id', m.id);
        loadActiveMessages();
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Supprimer';
      delBtn.className = 'btn-danger';
      delBtn.addEventListener('click', async () => {
        if(!confirm('Supprimer définitivement ce message ?')) return;
        await supabaseClient.from('messages').delete().eq('id', m.id);
        loadActiveMessages();
      });
      actions.appendChild(disableBtn);
      actions.appendChild(delBtn);
      wrapper.appendChild(actions);
      activeList.appendChild(wrapper);
    });
  }catch(e){
    console.error('loadActiveMessages failed', e);
    activeList.textContent = 'Erreur chargement';
  }
}

function escapeHtml(unsafe){
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// send message — anonymous insert (no auth required)
sendBtn.addEventListener('click', async () => {
  sendResult.textContent = '';
  const author = (authorEl.value || '').trim() || 'Famille';
  const message = (messageEl.value || '').trim();
  if (!message) return alert('Écris un message.');

  const duration = Number(durationEl.value); // days or 0 for permanent
  let expires_at = null;
  if (duration > 0) {
    const d = new Date();
    d.setDate(d.getDate() + duration);
    expires_at = d.toISOString();
  }

  const payload = {
    message,
    author,
    expires_at,
    active: true,
    user_id: null
  };

  try {
    const { data: insertData, error } = await supabaseClient
      .from('messages')
      .insert([payload])
      .select()
      .single();

    if (error) {
      sendResult.textContent = 'Erreur envoi : ' + (error.message || JSON.stringify(error));
      console.error('Erreur Supabase complète :', error);
      return;
    }

    sendResult.textContent = 'Message envoyé ✓';
    messageEl.value = ''; // vider seulement message
    // remember author locally
    try{ localStorage.setItem('familyAuthor', author); }catch(e){/* ignore */}
    loadActiveMessages();
  } catch (e) {
    console.error('Envoi message échoué:', e);
    sendResult.textContent = 'Erreur réseau — réessaie.';
  }
});

// init
loadActiveMessages();
