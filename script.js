// script.js — prototype simple, commenté et facile à modifier
// - affiche la date réelle
// - affiche le jour de la semaine
// - met à jour l'heure chaque seconde
// - gère un diaporama automatique avec images locales
// - récupère la météo réelle via Open-Meteo (remplace la météo simulée)
// - affiche des données simulées pour planning (pour l'instant)

// ----- Données simulées (à remplacer par API / Supabase plus tard) -----
const IMAGES = [
  { src: 'images/photo1.svg', caption: 'Promenade au parc', author: 'Alban', date: '2026-08-01', duration: 8000 },
  { src: 'images/photo2.svg', caption: 'Anniversaire en famille', author: 'Sophie', date: '2025-11-12', duration: 9000 },
  { src: 'images/photo3.svg', caption: 'Dimanche ensoleillé', author: 'Marc', date: '2026-04-05', duration: 7000 }
];

// ----- Planning simulé -----
const MOCK_EVENTS = [
  { time: '10:30', text: 'Coiffeuse' },
  { time: '15:00', text: 'Activité à la MARPA' },
  { time: '17:30', text: 'Alban vient te voir' }
];

const MOCK_UPCOMING = [
  { when: 'Dimanche', text: 'Repas de famille' },
  { when: '2026-09-12', text: 'Anniversaire : Tante Marie' }
];

// ----- Données du message familial (source incluse) -----
// Modifie ces valeurs pour changer le message et la personne/ le groupe qui l'envoie.
const FAMILY_MESSAGE = {
  text: 'Coucou Mamie, on pense à toi ❤️',
  source: 'Alban et toute la famille'
};

// ----- Configuration Open-Meteo (changer la localisation ici) -----
// Paramétrage mis à jour pour Saint-Romain-d’Urfé (Loire, 42430) fourni par l'utilisateur
const OPEN_METEO = {
  latitude: 45.88,    // Saint-Romain-d’Urfé (approx.)
  longitude: 3.83,    // Saint-Romain-d’Urfé (approx.)
  timezone: 'Europe/Paris', // utiliser le fuseau horaire fourni
  // fréquence de mise à jour en millisecondes (ex : 10 minutes)
  refreshInterval: 10 * 60 * 1000
};

// ----- Utils pour date / heure -----
function localizeDay(date){
  const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  return days[date.getDay()];
}
function formatFullDate(date){
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
updateDateTime();
setInterval(updateDateTime, 1000);

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

// ----- Message familial (modifiable) -----
function renderFamilyMessage(msg){
  const textEl = document.getElementById('family-message-text');
  const srcEl = document.getElementById('family-message-source');
  if(textEl) textEl.textContent = msg.text;
  if(srcEl) srcEl.textContent = 'Envoyé par : ' + msg.source;
}
renderFamilyMessage(FAMILY_MESSAGE);

// ----- Open-Meteo integration -----
// API gratuite, pas de clé requise : https://open-meteo.com/
// Nous demandons current_weather=true et timezone=auto pour avoir la température et le code météo.

// mapping météo (code Open-Meteo) -> icône et phrase simple en français
function weatherCodeToEmoji(code){
  // codes: https://open-meteo.com/en/docs#api_form
  if(code === 0) return '☀️'; // Clair
  if(code === 1 || code === 2) return '🌤️'; // Partiellement nuageux
  if(code === 3) return '☁️'; // Nuageux
  if(code === 45 || code === 48) return '🌫️'; // Brouillard
  if((51 <= code && code <= 67) || (80 <= code && code <= 82)) return '🌧️'; // Précipitations légères / averses
  if((71 <= code && code <= 77) || (85 <= code && code <= 86)) return '❄️'; // Neige
  if(code >= 95) return '⛈️'; // Orages
  return '🌈';
}
function weatherCodeToPhrase(code){
  if(code === 0) return 'Beau temps';
  if(code === 1 || code === 2) return 'Quelques nuages';
  if(code === 3) return 'Temps nuageux';
  if(code === 45 || code === 48) return 'Brouillard';
  if((51 <= code && code <= 67) || (80 <= code && code <= 82)) return 'Pluie / Averses';
  if((71 <= code && code <= 77) || (85 <= code && code <= 86)) return 'Neige';
  if(code >= 95) return 'Orages possibles';
  return 'Temps variable';
}

function timeOfDayPhrase(){
  const h = new Date().getHours();
  if(h >= 6 && h < 12) return "ce matin";
  if(h >= 12 && h < 18) return "cet après-midi";
  if(h >= 18 && h < 22) return "ce soir";
  return "la nuit";
}

async function fetchWeather(){
  const lat = OPEN_METEO.latitude;
  const lon = OPEN_METEO.longitude;
  const tz = OPEN_METEO.timezone || 'auto';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&timezone=${encodeURIComponent(tz)}`;

  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(!data.current_weather) throw new Error('Pas de current_weather dans la réponse');

    const cw = data.current_weather;
    // cw.temperature (°C), cw.weathercode (int)
    const temp = Math.round(cw.temperature);
    const code = cw.weathercode;
    const emoji = weatherCodeToEmoji(code);
    const phrase = weatherCodeToPhrase(code) + ' ' + timeOfDayPhrase();

    // Mettre à jour l'UI
    const emojiEl = document.getElementById('weather-emoji');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    if(emojiEl) emojiEl.textContent = emoji;
    if(tempEl) tempEl.textContent = `${temp} °C`;
    if(descEl) descEl.textContent = phrase;
  }catch(e){
    // En cas d'erreur, on conserve une météo de secours lisible
    console.warn('Open-Meteo fetch failed:', e);
    renderWeatherFallback();
  }
}

function renderWeatherFallback(){
  // météo lisible par défaut si l'API échoue
  const fallback = { emoji: '☀️', temp: '24 °C', desc: 'Beau temps cet après-midi' };
  const emojiEl = document.getElementById('weather-emoji');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');
  if(emojiEl) emojiEl.textContent = fallback.emoji;
  if(tempEl) tempEl.textContent = fallback.temp;
  if(descEl) descEl.textContent = fallback.desc;
}

// Lancement initial et planification des mises à jour
fetchWeather();
setInterval(fetchWeather, OPEN_METEO.refreshInterval);

// ----- Petite note pour développeur débutant -----
// - Pour changer la localisation de la météo, modifier OPEN_METEO.latitude et OPEN_METEO.longitude
//   dans le fichier script.js (ex: latitude: 48.8566, longitude: 2.3522).
// - Open-Meteo ne demande pas de clé. Si tu veux une localisation par nom de ville, utilise un service de géocodage
//   (par ex. Nominatim / OpenCage) pour obtenir latitude/longitude puis mettre à jour OPEN_METEO.
// - La description affichée est volontairement courte et en français pour Mamie. Tu peux modifier
//   weatherCodeToPhrase ou timeOfDayPhrase() pour adapter le texte.
