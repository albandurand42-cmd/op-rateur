// admin.js — administration simple pour envoyer des messages vers Supabase
// Keep SUPABASE_URL and SUPABASE_ANON_KEY unchanged.

const SUPABASE_URL = 'https://tlsxaonegizlqytujgfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__35QXHG--q-PJlGKHvdleg_tune7NLD';

// Initialize Supabase client (UMD global from CDN)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Local storage key for author
const SAVED_AUTHOR_KEY = 'familyAuthor';

// UI refs
const emailEl = document.getElementById('email');
const sendLinkBtn = document.getElementById('send-link');
const authStatus = document.getElementById('auth-status');
const authForms = document.getElementById('auth-forms');
const signoutDiv = document.getElementById('signout');
const userEmailSpan = document.getElementById('user-email');
const authResult = document.getElementById('auth-result');

const composeCard = document.getElementById('compose-card');
const authorEl = document.getElementById('author');
const messageEl = document.getElementById('message');
const durationEl = document.getElementById('duration');
const sendBtn = document.getElementById('send');
const sendResult = document.getElementById('send-result');

const activeList = document.getElementById('active-list');
const logoutBtn = document.getElementById('logout');

// Prefill author from localStorage if present
try{
  const savedAuthor = localStorage.getItem(SAVED_AUTHOR_KEY);
  if(savedAuthor && authorEl) authorEl.value = savedAuthor;
}catch(e){console.warn('localStorage unavailable', e)}

async function initAuth(){
  // handle existing session (ensures persistence across reloads/devices where session stored)
  try{
    const { data } = await supabaseClient.auth.getSession();
    const session = data?.session;
    updateAuthUI(session?.user ?? null);
  }catch(e){
    console.error('Auth init error', e);
  }

  // listen to auth changes so UI updates immediately after magic-link complete
  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session?.user ?? null);
  });
}

function updateAuthUI(user){
  if(user){
    // show connected state with email
    authStatus.textContent = 'Connecté : ' + (user.email || '');
    authForms.style.display = 'none';
    signoutDiv.style.display = 'block';
    composeCard.style.display = 'block';
    userEmailSpan.textContent = user.email;
    // if saved author is present locally, keep it; else prefill with user email name
    try{
      const savedAuthor = localStorage.getItem(SAVED_AUTHOR_KEY);
      if(savedAuthor && authorEl) authorEl.value = savedAuthor;
      else if(authorEl && (!authorEl.value || authorEl.value.trim()==='')){
        const name = (user.email || '').split('@')[0];
        if(name) authorEl.value = name.charAt(0).toUpperCase() + name.slice(1);
      }
    }catch(e){/* ignore */}
    loadActiveMessages();
  } else {
    authStatus.textContent = 'Non connecté';
    authForms.style.display = 'block';
    signoutDiv.style.display = 'none';
    composeCard.style.display = 'none';
    try{
      const savedAuthor = localStorage.getItem(SAVED_AUTHOR_KEY);
      if(savedAuthor && authorEl) authorEl.value = savedAuthor;
    }catch(e){/* ignore */}
  }
}

// auth feedback handler — uses authResult (visible in auth area)
sendLinkBtn.addEventListener('click', async () => {
  const email = emailEl.value.trim();
  if (!email) {
    if(authResult) authResult.textContent = 'Renseigne une adresse e‑mail.';
    return;
  }

  // disable button to avoid double sends and show immediate feedback
  sendLinkBtn.disabled = true;
  if(authResult) authResult.textContent = 'Envoi du lien...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'https://albandurand42-cmd.github.io/op-rateur/admin.html'
      }
    });
    sendLinkBtn.disabled = false;

    if (error) {
      if(authResult) authResult.textContent = 'Erreur : ' + (error.message || String(error));
      return;
    }

    if(authResult) authResult.textContent = 'Lien de connexion envoyé par e‑mail ✓';
  } catch (err) {
    console.error('sendLink error', err);
    sendLinkBtn.disabled = false;
    if(authResult) authResult.textContent = 'Erreur réseau — réessaie.';
  }
});

logoutBtn.addEventListener('click', async ()=>{
  await supabaseClient.auth.signOut();
  updateAuthUI(null);
});

// send message
sendBtn.addEventListener('click', async ()=>{
  sendResult.textContent = '';
  const author = authorEl.value.trim() || 'Famille';
  const message = messageEl.value.trim();
  if(!message) return alert('Écris un message.');
  const duration = Number(durationEl.value); // days or 0 for permanent
  let expires_at = null;
  if(duration > 0){
    const d = new Date();
    d.setDate(d.getDate() + duration);
    expires_at = d.toISOString();
  }
  // get session user
  const { data } = await supabaseClient.auth.getSession();
  const session = data?.session;
  const user = session?.user;
  const payload = {
    message,
    author,
    expires_at,
    active: true,
    user_id: user?.id ?? null
  };
  const { data: insertData, error } = await supabaseClient.from('messages').insert([payload]).select().single();
  if(error){
    sendResult.textContent = 'Erreur envoi : ' + error.message;
  } else {
    // keep session, clear only message field, keep author
    sendResult.textContent = 'Message envoyé ✓';
    messageEl.value = '';
    try{ localStorage.setItem(SAVED_AUTHOR_KEY, author); }catch(e){/* ignore */}
    loadActiveMessages();
  }
});

// load active messages for admin view (with disable/delete)
async function loadActiveMessages(){
  activeList.textContent = 'Chargement...';
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(50);
  if(error) {
    activeList.textContent = 'Erreur chargement : ' + error.message;
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
}

function escapeHtml(unsafe){
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// init
initAuth();
loadActiveMessages();
