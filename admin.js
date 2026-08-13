// admin.js — anonymous message sending to Supabase (no auth)
// Uses the public anon key only. Assumes supabase-js UMD is loaded in the page.

const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

const supabaseClient = (typeof supabase !== 'undefined' && supabase && supabase.createClient)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// UI refs
const authorEl = document.getElementById('author');
const messageEl = document.getElementById('message');
const durationEl = document.getElementById('duration');
const sendBtn = document.getElementById('send');
const sendResult = document.getElementById('send-result');
const activeList = document.getElementById('active-list');

// Prefill author from localStorage
try {
  const savedAuthor = localStorage.getItem('familyAuthor');
  if (savedAuthor && authorEl) authorEl.value = savedAuthor;
} catch (e) { console.warn('localStorage unavailable', e); }

function escapeHtml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadActiveMessages() {
  if (!supabaseClient) {
    activeList.textContent = 'Supabase non chargé';
    return;
  }
  activeList.textContent = 'Chargement...';
  try {
    const { data, error } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      activeList.textContent = 'Erreur chargement : ' + (error.message || JSON.stringify(error));
      console.error('Erreur Supabase complète :', error);
      return;
    }

    if (!data || data.length === 0) {
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

      // Disable button (will attempt an anonymous update; requires RLS to permit)
      const disableBtn = document.createElement('button');
      disableBtn.textContent = 'Désactiver';
      disableBtn.className = 'btn-muted';
      disableBtn.addEventListener('click', async () => {
        try {
          await supabaseClient.from('messages').update({ active: false }).eq('id', m.id);
        } catch (e) {
          console.error('Erreur désactivation :', e);
        }
        loadActiveMessages();
      });

      // Delete button (will attempt an anonymous delete; requires RLS to permit)
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Supprimer';
      delBtn.className = 'btn-danger';
      delBtn.addEventListener('click', async () => {
        if (!confirm('Supprimer définitivement ce message ?')) return;
        try {
          await supabaseClient.from('messages').delete().eq('id', m.id);
        } catch (e) {
          console.error('Erreur suppression :', e);
        }
        loadActiveMessages();
      });

      actions.appendChild(disableBtn);
      actions.appendChild(delBtn);
      wrapper.appendChild(actions);
      activeList.appendChild(wrapper);
    });
  } catch (e) {
    console.error('loadActiveMessages failed', e);
    activeList.textContent = 'Erreur chargement';
  }
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

  if (!supabaseClient) {
    sendResult.textContent = 'Supabase non initialisé';
    return;
  }

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
    try { localStorage.setItem('familyAuthor', author); } catch (e) { /* ignore */ }
    loadActiveMessages();
  } catch (e) {
    console.error('Envoi message échoué:', e);
    sendResult.textContent = 'Erreur réseau — réessaie.';
  }
});

// init
loadActiveMessages();
