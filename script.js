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
