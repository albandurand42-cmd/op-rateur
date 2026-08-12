// script.js — Tableau de bord prototype
// Corrections demandées :
// - utiliser APPS_SCRIPT_URL constant (never replace it)
// - single fetchCalendarEvents() function that fetches today/upcoming
// - cache-busting with ?t=Date.now(), fetch(..., {cache:'no-store'})
// - poll every 60s, plus focus/visibility listeners to wake the tablet
// - reload page every 30 minutes as safety
// - display event.description for today and upcoming
// - do NOT re-render MOCK data after a successful real fetch
// - keep the rest of the dashboard unchanged (weather, photos, date/time, message, layout)

// ----- Images / diaporama (unchanged) -----
const IMAGES = [
  { src: 'images/photo1.svg', caption: 'Promenade au parc', author: 'Alban', date: '2026-08-01', duration: 8000 },
  { src: 'images/photo2.svg', caption: 'Anniversaire en famille', author: 'Sophie', date: '2025-11-12', duration: 9000 },
  { src: 'images/photo3.svg', caption: 'Dimanche ensoleillé', author: 'Marc', date: '2026-04-05', duration: 7000 }
];

// ----- Données simulées (fallback si nécessaire, uniquement si AUCUNE donnée réelles n'a jamais été récupérée) -----
const MOCK_EVENTS = [
  { time: '10:30', text: 'Coiffeuse' },
  { time: '15:00', text: 'Activité à la MARPA' },
  { time: '17:30', text: 'Alban vient te voir' }
];
const MOCK_UPCOMING = [
  { when: 'Dimanche', text: 'Repas de famille' },
  { when: '2026-09-12', text: 'Anniversaire : Tante Marie' }
];

// ----- Message familial (unchangé) -----
const FAMILY_MESSAGE = {
  text: 'Coucou Mamie, on pense à toi ❤️',
  source: 'Alban et toute la famille'
};

// ----- Open-Meteo config (unchangé) -----
const OPEN_METEO = {
  latitude: 45.88,
  longitude: 3.83,
  timezone: 'Europe/Paris',
  refreshInterval: 10 * 60 * 1000
};

// ----- Utils date/heure (unchangé) -----
function localizeDay(date){
  const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  return days[date.getDay()];
}
function formatFullDate(date){
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function twoDigits(n){return n<10? '0'+n : n}

// ----- Affichage date / heure (unchangé) -----
function updateDateTime(){
  const now = new Date();
  document.getElementById('day').textContent = localizeDay(now).toUpperCase();
  document.getElementById('date').textContent = formatFullDate(now);
  const timeStr = `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
  document.getElementById('time').textContent = timeStr;
}
updateDateTime();
setInterval(updateDateTime, 1000);

// ----- Upcoming (initially simulated) (kept minimal until first real fetch) -----
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

// ----- Diaporama simple (unchanged) -----
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

// ----- Message familial (unchanged) -----
function renderFamilyMessage(msg){
  const textEl = document.getElementById('family-message-text');
  const srcEl = document.getElementById('family-message-source');
  if(textEl) textEl.textContent = msg.text;
  if(srcEl) srcEl.textContent = 'Envoyé par : ' + msg.source;
}
renderFamilyMessage(FAMILY_MESSAGE);

// ----- Open-Meteo integration (unchanged) -----
function weatherCodeToEmoji(code){
  if(code === 0) return '☀️';
  if(code === 1 || code === 2) return '🌤️';
  if(code === 3) return '☁️';
  if(code === 45 || code === 48) return '🌫️';
  if((51 <= code && code <= 67) || (80 <= code && code <= 82)) return '🌧️';
  if((71 <= code && code <= 77) || (85 <= code && code <= 86)) return '❄️';
  if(code >= 95) return '⛈️';
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
  const tz = OPEN_METEO.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&timezone=${encodeURIComponent(tz)}`;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(!data.current_weather) throw new Error('Pas de current_weather');
    const cw = data.current_weather;
    const temp = Math.round(cw.temperature);
    const code = cw.weathercode;
    const emoji = weatherCodeToEmoji(code);
    const phrase = weatherCodeToPhrase(code) + ' ' + timeOfDayPhrase();
    const emojiEl = document.getElementById('weather-emoji');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    if(emojiEl) emojiEl.textContent = emoji;
    if(tempEl) tempEl.textContent = `${temp} °C`;
    if(descEl) descEl.textContent = phrase;
  }catch(e){
    console.warn('Open-Meteo fetch failed:', e);
    const fallback = { emoji: '☀️', temp: '24 °C', desc: 'Beau temps cet après-midi' };
    const emojiEl = document.getElementById('weather-emoji');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    if(emojiEl) emojiEl.textContent = fallback.emoji;
    if(tempEl) tempEl.textContent = fallback.temp;
    if(descEl) descEl.textContent = fallback.desc;
  }
}
fetchWeather();
setInterval(fetchWeather, OPEN_METEO.refreshInterval);

// ----- Planning: connexion au Web App Google Apps Script fourni -----
// IMPORTANT: APPS_SCRIPT_URL MUST NOT BE CHANGED - use exactly this value
const APPS_SCRIPT_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnR83HuDmZP3hcqziZiu9mayHuLeXcEx8FsWHKMbxYJn7ZLQTxLacDReqpyDaEca5QlABeewj2CY1up-LktlY0VkbG7UB30-r-dhyBNh1UYUJYS8ZihR89Mfjg9nLgk25sf-8QtoGMuVoyzd7A5z0y1ZqHXgVYz5hLTkkwobkaODaKvPiE_cAleHTWoRRAF0IsELS2LmmHMdOmdivELOlwKq_GQv7-S-a9o2JbTtqnnnkyteiGv1MH0sImpKw7r9oOlHMO_EJ-5bi8dzTMl1Yd-s8thi0A&lib=M70QO8ab0Ri7XQqOqZPdPNxbNGQduxHHC';

// cache des dernières données affichées : en cas d'erreur, on conserve l'affichage
let cachedToday = null;
let cachedUpcoming = null;
let realDataLoaded = false; // becomes true after a successful fetch from Apps Script

// utilitaire : format heure HH:MM en utilisant le fuseau local (or Europe/Paris)
const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
function formatTimeLocalized(iso){
  try{
    const dt = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: DEVICE_TZ }).format(dt);
  }catch(e){
    return '';
  }
}

// utilitaire : formate les dates pour la section "Événements à venir"
function formatUpcomingLabel(iso){
  const d = new Date(iso);
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const oneDay = 24*60*60*1000;
  const diffDays = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - midnight)/oneDay);
  const weekdays = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  if(diffDays === 1) return 'Demain';
  if(diffDays > 1 && diffDays <= 6){
    const name = weekdays[d.getDay()];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// render today's events into #events
function renderTodayEvents(items){
  const ul = document.getElementById('events');
  ul.innerHTML = '';
  if(!items || items.length === 0){
    const li = document.createElement('li');
    li.textContent = "Rien de prévu aujourd'hui";
    ul.appendChild(li);
    return;
  }
  items.forEach(ev => {
    const li = document.createElement('li');
    const titleDiv = document.createElement('div');
    titleDiv.className = 'event-title';
    if(ev.allDay){
      titleDiv.textContent = ev.title;
    } else if(ev.start){
      const time = formatTimeLocalized(ev.start);
      titleDiv.textContent = `${time} — ${ev.title}`;
    } else {
      titleDiv.textContent = ev.title;
    }
    li.appendChild(titleDiv);
    // description (mandatory display if provided by Apps Script)
    if(ev.description && String(ev.description).trim().length>0){
      const descDiv = document.createElement('div');
      descDiv.className = 'event-desc';
      descDiv.textContent = ev.description;
      li.appendChild(descDiv);
    }
    ul.appendChild(li);
  });
}

// render upcoming events into #upcoming, avoid duplicates present in today's list
function renderUpcomingEvents(items, todayItems){
  const ul = document.getElementById('upcoming');
  ul.innerHTML = '';
  if(!items || items.length === 0){
    if(cachedUpcoming && cachedUpcoming.length>0) items = cachedUpcoming;
    else items = MOCK_UPCOMING;
  }
  const todayDates = new Set();
  if(todayItems){
    todayItems.forEach(t=>{
      if(t.start){
        const d = new Date(t.start);
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        todayDates.add(key);
      } else if(t.allDay && t.start){
        const d = new Date(t.start);
        const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
        todayDates.add(key);
      }
    });
  }
  let count = 0;
  for(const ev of items){
    if(ev.start){
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      if(todayDates.has(key)) continue;
    }
    const li = document.createElement('li');
    const label = ev.start ? formatUpcomingLabel(ev.start) : formatUpcomingLabel(ev.start || new Date());
    const titleDiv = document.createElement('div');
    titleDiv.className = 'event-title';
    titleDiv.textContent = `${label} — ${ev.title}`;
    li.appendChild(titleDiv);
    if(ev.description && String(ev.description).trim().length>0){
      const descDiv = document.createElement('div');
      descDiv.className = 'event-desc';
      descDiv.textContent = ev.description;
      li.appendChild(descDiv);
    }
    ul.appendChild(li);
    count++;
    if(count >= 6) break;
  }
}

// SINGLE function that fetches calendar events from Apps Script
async function fetchCalendarEvents(){
  console.log('Actualisation Google Calendar :', new Date().toLocaleTimeString());
  const requestUrl = `${APPS_SCRIPT_URL}?t=${Date.now()}`; // cache-busting param, do NOT change APPS_SCRIPT_URL
  try{
    const res = await fetch(requestUrl, { method: 'GET', cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    console.log('Données Calendar reçues :', data);
    const today = Array.isArray(data.today) ? data.today.slice() : [];
    const upcoming = Array.isArray(data.upcoming) ? data.upcoming.slice() : [];
    const norm = arr => arr.map(it => ({
      title: it.title || '(sans titre)',
      description: it.description || '',
      start: it.start || null,
      end: it.end || null,
      allDay: !!it.allDay
    }));
    const todayNorm = norm(today);
    const upcomingNorm = norm(upcoming);
    todayNorm.sort((a,b)=>{
      const ta = a.start ? new Date(a.start).getTime() : 0;
      const tb = b.start ? new Date(b.start).getTime() : 0;
      return ta - tb;
    });
    // mark that we have real data now
    realDataLoaded = true;
    cachedToday = todayNorm;
    cachedUpcoming = upcomingNorm;
    renderTodayEvents(todayNorm);
    renderUpcomingEvents(upcomingNorm, todayNorm);
  }catch(e){
    console.error('Fetch events failed:', e);
    // if we have previously loaded real data, keep it displayed
    if(realDataLoaded && cachedToday){
      renderTodayEvents(cachedToday);
      renderUpcomingEvents(cachedUpcoming, cachedToday || []);
      return;
    }
    // if no real data ever loaded, but we have cached (from previous attempts), keep it.
    if(cachedToday){
      renderTodayEvents(cachedToday);
      renderUpcomingEvents(cachedUpcoming, cachedToday || []);
      return;
    }
    // otherwise fallback to simulated data only once
    renderTodayEvents(MOCK_EVENTS);
    renderUpcoming(MOCK_UPCOMING);
  }
}

// start polling: initial call + every 60 seconds
fetchCalendarEvents();
// ensure only one interval controls calendar polling
if(window._calendarPollInterval) clearInterval(window._calendarPollInterval);
window._calendarPollInterval = setInterval(fetchCalendarEvents, 60 * 1000);

// wake-up hooks for Android / Chrome background throttling
window.addEventListener('focus', fetchCalendarEvents);
document.addEventListener('visibilitychange', () => {
  if(!document.hidden) fetchCalendarEvents();
});

// safety: full reload every 30 minutes
if(window._fullReloadInterval) clearInterval(window._fullReloadInterval);
window._fullReloadInterval = setInterval(() => {
  window.location.reload();
}, 30 * 60 * 1000);

// ----- End of script.js -----
