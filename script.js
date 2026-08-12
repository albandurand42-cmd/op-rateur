// script.js — Tableau de bord prototype
// Modifications : display event descriptions and poll the Web App every 60s (cache-busting)
// The rest of the dashboard (layout, weather, photos, message, date/time) is unchanged.

// ----- Images / diaporama (unchanged) -----
const IMAGES = [
  { src: 'images/photo1.svg', caption: 'Promenade au parc', author: 'Alban', date: '2026-08-01', duration: 8000 },
  { src: 'images/photo2.svg', caption: 'Anniversaire en famille', author: 'Sophie', date: '2025-11-12', duration: 9000 },
  { src: 'images/photo3.svg', caption: 'Dimanche ensoleillé', author: 'Marc', date: '2026-04-05', duration: 7000 }
];

// ----- Données simulées (fallback si nécessaire) -----
const MOCK_EVENTS = [
  { time: '10:30', text: 'Coiffeuse' },
  { time: '15:00', text: 'Activité à la MARPA' },
  { time: '17:30', text: 'Alban vient te voir' }
];
const MOCK_UPCOMING = [
  { when: 'Dimanche', text: 'Repas de famille' },
  { when: '2026-09-12', text: 'Anniversaire : Tante Marie' }
];

// ----- Message familial (unchanged) -----
const FAMILY_MESSAGE = {
  text: 'Coucou Mamie, on pense à toi ❤️',
  source: 'Alban et toute la famille'
};

// ----- Open-Meteo config (unchanged) -----
const OPEN_METEO = {
  latitude: 45.88,
  longitude: 3.83,
  timezone: 'Europe/Paris',
  refreshInterval: 10 * 60 * 1000
};

// ----- Utils date/heure -----
function localizeDay(date){
  const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  return days[date.getDay()];
}
function formatFullDate(date){
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
function twoDigits(n){return n<10? '0'+n : n}

// ----- Affichage date / heure -----
function updateDateTime(){
  const now = new Date();
  document.getElementById('day').textContent = localizeDay(now).toUpperCase();
  document.getElementById('date').textContent = formatFullDate(now);
  const timeStr = `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
  document.getElementById('time').textContent = timeStr;
}
updateDateTime();
setInterval(updateDateTime, 1000);

// ----- Upcoming (initially simulated) -----
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
// Web App URL provided by the user (corrected)
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyQtR3ZhgrKGzcCOdBuLy-TzhMFQwTlDbfN8MaaIDQYbIewbNcpW183iude96_jPP3cCA/exec';

// cache des dernières données affichées : en cas d'erreur, on conserve l'affichage
let cachedToday = null;
let cachedUpcoming = null;

// utilitaire : format heure HH:MM en utilisant le fuseau local (ou Europe/Paris)
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
  // normalize times to local midnight for comparison
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const oneDay = 24*60*60*1000;
  const diffDays = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - midnight)/oneDay);

  const weekdays = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

  if(diffDays === 1) return 'Demain';
  if(diffDays > 1 && diffDays <= 6){
    // weekday capitalized
    const name = weekdays[d.getDay()];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  // otherwise show "12 septembre"
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// render today's events into #events (keeps design unchanged)
function renderTodayEvents(items){
  const ul = document.getElementById('events');
  // if we have previous display, keep it until we update
  ul.innerHTML = '';
  if(!items || items.length === 0){
    const li = document.createElement('li');
    li.textContent = "Rien de prévu aujourd'hui";
    ul.appendChild(li);
    return;
  }
  items.forEach(ev => {
    const li = document.createElement('li');
    // create title line
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
    // description (optional)
    if(ev.description && ev.description.trim().length>0){
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
    // keep previous upcoming if exists, else use fallback
    if(cachedUpcoming && cachedUpcoming.length>0) items = cachedUpcoming;
    else items = MOCK_UPCOMING;
  }

  // build set of today's starts (date string) to avoid duplicates (compare date part)
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

  // limit number of upcoming items to keep UI clean
  let count = 0;
  for(const ev of items){
    // avoid duplicates: if ev.start date is in todayDates, skip
    if(ev.start){
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      if(todayDates.has(key)) continue;
    }
    const li = document.createElement('li');
    // label: day name or date
    const label = ev.start ? formatUpcomingLabel(ev.start) : formatUpcomingLabel(ev.start || new Date());
    // title line
    const titleDiv = document.createElement('div');
    titleDiv.className = 'event-title';
    titleDiv.textContent = `${label} — ${ev.title}`;
    li.appendChild(titleDiv);
    // description optional
    if(ev.description && ev.description.trim().length>0){
      const descDiv = document.createElement('div');
      descDiv.className = 'event-desc';
      descDiv.textContent = ev.description;
      li.appendChild(descDiv);
    }
    ul.appendChild(li);
    count++;
    if(count >= 6) break; // don't overload the UI
  }
}

// fetch from the Web App and update both sections. Keep previous display on error.
async function fetchEventsFromWebApp(){
  try{
    const url = WEBAPP_URL + '?t=' + Date.now(); // cache-busting timestamp
    const res = await fetch(url, {cache: 'no-store'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // expected structure: { updatedAt, today: [...], upcoming: [...] }
    const today = Array.isArray(data.today) ? data.today.slice() : [];
    const upcoming = Array.isArray(data.upcoming) ? data.upcoming.slice() : [];

    // Normalize items: ensure fields {title, description, start, end, allDay}
    const norm = arr => arr.map(it => ({
      title: it.title || '(sans titre)',
      description: it.description || '',
      start: it.start || null,
      end: it.end || null,
      allDay: !!it.allDay
    }));

    const todayNorm = norm(today);
    const upcomingNorm = norm(upcoming);

    // sort today by start time (all-day events get start at 00:00)
    todayNorm.sort((a,b)=>{
      const ta = a.start ? new Date(a.start).getTime() : 0;
      const tb = b.start ? new Date(b.start).getTime() : 0;
      return ta - tb;
    });

    // update caches and UI
    cachedToday = todayNorm;
    cachedUpcoming = upcomingNorm;

    renderTodayEvents(todayNorm);
    renderUpcomingEvents(upcomingNorm, todayNorm);
  }catch(e){
    // fail silently for the user: keep previous displayed data if exists, else fallback to simulated
    console.error('Fetch events failed:', e);
    if(cachedToday){
      renderTodayEvents(cachedToday);
    } else {
      renderTodayEvents(MOCK_EVENTS);
    }
    if(cachedUpcoming){
      renderUpcomingEvents(cachedUpcoming, cachedToday || []);
    } else {
      renderUpcoming(MOCK_UPCOMING);
    }
  }
}

// initial load and periodic refresh every 60 seconds
fetchEventsFromWebApp();
setInterval(fetchEventsFromWebApp, 60 * 1000);

// ----- Fin script.js -----
