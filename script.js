// script.js — prototype simple, commenté et facile à modifier
// - affiche la date réelle
// - affiche le jour de la semaine
// - met à jour l'heure chaque seconde
// - gère un diaporama automatique avec images locales
// - affiche des données simulées pour météo et planning

// ----- Données simulées (à remplacer par API / Supabase plus tard) -----
const IMAGES = [
  { src: 'images/photo1.svg', caption: 'Promenade au parc', author: 'Alban', date: '2026-08-01', duration: 8000 },
  { src: 'images/photo2.svg', caption: 'Anniversaire en famille', author: 'Sophie', date: '2025-11-12', duration: 9000 },
  { src: 'images/photo3.svg', caption: 'Dimanche ensoleillé', author: 'Marc', date: '2026-04-05', duration: 7000 }
];

const MOCK_WEATHER = { emoji: '☀️', temp: '24 °C', desc: 'Beau temps cet après-midi' };

const MOCK_EVENTS = [
  { time: '10:30', text: 'Coiffeuse' },
  { time: '15:00', text: 'Activité à la MARPA' },
  { time: '17:30', text: 'Alban vient te voir' }
];

const MOCK_UPCOMING = [
  { when: 'Dimanche', text: 'Repas de famille' },
  { when: '2026-09-12', text: 'Anniversaire : Tante Marie' }
];

// ----- Utils pour date / heure -----
function localizeDay(date){
  // jours en français
  const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  return days[date.getDay()];
}
function formatFullDate(date){
  // ex: "mardi 12 août 2026"
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function twoDigits(n){return n<10? '0'+n : n}

// ----- Mise à jour de l'affichage de la date / heure -----
function updateDateTime(){
  const now = new Date();
  document.getElementById('day').textContent = localizeDay(now).toUpperCase();
  document.getElementById('date').textContent = formatFullDate(now);
  const timeStr = `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
  document.getElementById('time').textContent = timeStr;
}

// Mettre à jour chaque seconde l'heure (et la date si besoin)
updateDateTime();
setInterval(updateDateTime, 1000);

// ----- Affichage météo (simulé) -----
function renderWeather(w){
  document.getElementById('weather-emoji').textContent = w.emoji;
  document.getElementById('weather-temp').textContent = w.temp;
  document.getElementById('weather-desc').textContent = w.desc;
}
renderWeather(MOCK_WEATHER);

// ----- Affichage planning (simulé) -----
function renderEvents(events){
  const ul = document.getElementById('events');
  ul.innerHTML = '';
  events.forEach(ev =>{
    const li = document.createElement('li');
    li.textContent = `${ev.time} — ${ev.text}`;
    ul.appendChild(li);
  });
}
renderEvents(MOCK_EVENTS);

function renderUpcoming(list){
  const ul = document.getElementById('upcoming');
  ul.innerHTML = '';
  list.forEach(it=>{
    const li = document.createElement('li');
    li.textContent = `${it.when} — ${it.text}`;
    ul.appendChild(li);
  })
}
renderUpcoming(MOCK_UPCOMING);

// ----- Diaporama simple -----
let slideIndex = 0;
let slideTimer = null;

function showSlide(index){
  const data = IMAGES[index];
  const img = document.getElementById('slide-img');
  const caption = document.getElementById('photo-caption');
  const author = document.getElementById('photo-author');

  img.src = data.src;
  img.alt = data.caption + ' — ' + data.author;
  caption.textContent = data.caption;
  author.textContent = 'Envoyé par : ' + data.author;
}

function startSlideshow(){
  // précharger les images
  IMAGES.forEach(i=>{ const p = new Image(); p.src = i.src });

  function next(){
    showSlide(slideIndex);
    const duration = IMAGES[slideIndex].duration || 7000;
    slideIndex = (slideIndex + 1) % IMAGES.length;
    slideTimer = setTimeout(next, duration);
  }
  next();
}

startSlideshow();

// ----- Message familial (modifiable par la famille plus tard) -----
// Ici c'est statique. On pourra le récupérer depuis un stockage distant.
// Le message est déjà dans index.html par défaut.

// ----- Petite note pour développeur débutant -----
// Pour remplacer les images : déposer des fichiers dans le dossier images/ et
// modifier la constante IMAGES ci-dessus pour changer la légende, l'auteur, ou la durée.

// ---- Horloges multi-fuseaux (facile à configurer) ----
// Modifier la liste TIMEZONES pour ajouter / retirer des fuseaux.
// Utiliser des noms IANA valides (ex: "Europe/Paris", "America/New_York", "Asia/Tokyo").
const TIMEZONES = [
  { label: 'Paris (Mamie)', tz: 'Europe/Paris' },
  { label: 'UTC', tz: 'UTC' },
  { label: 'New York (Alban)', tz: 'America/New_York' },
  { label: 'São Paulo (Famille)', tz: 'America/Sao_Paulo' },
  { label: 'Tokyo', tz: 'Asia/Tokyo' }
];

// Crée l'interface HTML (une fois) puis met à jour chaque seconde
function initTimezones() {
  const container = document.getElementById('tz-clocks');
  if (!container) return; // si pas présent, on ne fait rien

  // créer les éléments
  container.innerHTML = '';
  TIMEZONES.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'tz-item';
    row.id = 'tz-' + i;

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';

    const label = document.createElement('div');
    label.className = 'tz-label';
    label.textContent = item.label;

    const sub = document.createElement('div');
    sub.className = 'tz-sub';
    sub.textContent = item.tz; // affiche le nom du fuseau (utile pour debug/modif)
    left.appendChild(label);
    left.appendChild(sub);

    const time = document.createElement('div');
    time.className = 'tz-time';
    time.textContent = '00:00:00';

    row.appendChild(left);
    row.appendChild(time);
    container.appendChild(row);
  });

  // lancer la mise à jour chaque seconde
  updateTimezones();
  setInterval(updateTimezones, 1000);
}

function formatTimeInZone(zone) {
  const now = new Date();
  try {
    // Intl.DateTimeFormat avec options : heures:minutes:secondes, 24h
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: zone
    }).format(now);
  } catch (e) {
    // fallback si le fuseau est invalide ou pas supporté
    return now.toLocaleTimeString('fr-FR');
  }
}

function formatDayInZone(zone) {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: zone }).format(now);
  } catch (e) {
    return '';
  }
}

function updateTimezones() {
  TIMEZONES.forEach((item, i) => {
    const row = document.getElementById('tz-' + i);
    if (!row) return;
    const timeEl = row.querySelector('.tz-time');
    timeEl.textContent = formatTimeInZone(item.tz);

    // optionnel : afficher la date/jour sur la même ligne (petite sous-phrase)
    const sub = row.querySelector('.tz-sub');
    if (sub) {
      sub.textContent = item.tz + ' • ' + formatDayInZone(item.tz);
    }
  });
}

// initialisation (appeler après le chargement du DOM)
// Si ton script.js est déjà exécuté en bas de page (comme maintenant), on peut appeler directement :
initTimezones();
