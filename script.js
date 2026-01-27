const SITE_BUILD = "2026-01-27-01";

const WORKER_URL = "https://plusviiwebworker.loganplayzu.workers.dev/";
const UNIVERSE_IDS = ["9535197929","7314795657","9061511409","9551746424"];

const DISCORD_INVITE = "https://discord.gg/vqQycdnQ";

const $carousel = document.getElementById("gamesCarousel");
const $playing  = document.getElementById("statPlaying");
const $visits   = document.getElementById("statVisits");
const $count    = document.getElementById("statCount");

const $bottomVisits  = document.getElementById("bottomVisits");
const $bottomGames   = document.getElementById("bottomGames");
const $bottomPlaying = document.getElementById("bottomPlaying");

const $toast = document.getElementById("toast");

function toast(msg){
  if(!$toast) return;
  $toast.textContent = msg;
  $toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => $toast.classList.remove("show"), 900);
}

const fmt = (n) => {
  if (n == null) return "—";
  const num = Number(n) || 0;
  if (num >= 1e9) return (num/1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num/1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num/1e3).toFixed(1) + "K";
  return String(num);
};

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchJsonNoCache(url, { retries = 4, timeoutMs = 9000 } = {}){
  const u = new URL(url);
  u.searchParams.set("cb", SITE_BUILD);
  u.searchParams.set("t", String(Date.now()));

  let lastErr;
  for(let i=0; i<retries; i++){
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);
    try{
      const r = await fetch(u.toString(), {
        cache: "no-store",
        headers: {
          "cache-control": "no-cache, no-store, max-age=0",
          "pragma": "no-cache"
        },
        signal: ac.signal
      });
      clearTimeout(to);

      if(!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    }catch(err){
      clearTimeout(to);
      lastErr = err;
      await sleep(250 + i * 350);
    }
  }
  throw lastErr;
}

function cacheKey(){
  return "plusvii_games_cache_v2";
}

function setAllStats({ playing, visits, count }){
  $playing.textContent = fmt(playing);
  $visits.textContent = fmt(visits);
  $count.textContent = fmt(count);

  if($bottomVisits) $bottomVisits.textContent = fmt(visits);
  if($bottomGames) $bottomGames.textContent = fmt(count);
  if($bottomPlaying) $bottomPlaying.textContent = fmt(playing);
}

function safeText(s){
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;"
  }[c]));
}

async function load(){
  if(!$carousel) return;

  $carousel.innerHTML = `
    <div class="gameCard">
      <div class="gameBody">
        <div class="gameName">Loading…</div>
        <div class="metaRow">
          <span class="badge">Fetching latest data</span>
          <span class="badge">No cache</span>
        </div>
      </div>
    </div>
  `;

  const ids = UNIVERSE_IDS.join(",");
  const url1 = `${WORKER_URL}?ids=${encodeURIComponent(ids)}`;
  const url2 = `${WORKER_URL}thumbs?ids=${encodeURIComponent(ids)}`;

  try{
    const j = await fetchJsonNoCache(url1, { retries: 5, timeoutMs: 9000 });
    const games = j.data || [];

    let p = 0, v = 0;
    games.forEach(g => { p += (g.playing || 0); v += (g.visits || 0); });

    setAllStats({ playing: p, visits: v, count: games.length });

    const tj = await fetchJsonNoCache(url2, { retries: 5, timeoutMs: 9000 });
    const thumbs = new Map();
    tj.data?.forEach(e => {
      const id = e.universeId != null ? String(e.universeId) : null;
      const img = e.thumbnails?.[0]?.imageUrl;
      if(id && img) thumbs.set(id, img);
    });

    $carousel.innerHTML = "";

    games.forEach(g => {
      const img0 = thumbs.get(String(g.id));
      const img = img0 ? (img0 + (img0.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(SITE_BUILD)) : null;

      const el = document.createElement("div");
      el.className = "gameCard";

      el.innerHTML = `
        <div class="gameThumbWrap">
          ${img ? `<img class="gameThumb" src="${img}" loading="lazy" alt="">` : ""}
        </div>
        <div class="gameBody">
          <div class="gameName">${safeText(g.name)}</div>
          <div class="metaRow">
            <span class="badge">👥 ${fmt(g.playing || 0)}</span>
            <span class="badge">▶ ${fmt(g.visits || 0)}</span>
          </div>
          <a class="playBtn" href="https://www.roblox.com/games/${encodeURIComponent(g.rootPlaceId)}" target="_blank" rel="noreferrer">Play Now</a>
        </div>
      `;
      $carousel.appendChild(el);
    });

    localStorage.setItem(cacheKey(), JSON.stringify({
      at: Date.now(),
      build: SITE_BUILD,
      games: games
    }));
  }catch(err){
    let usedCache = false;

    try{
      const cached = JSON.parse(localStorage.getItem(cacheKey()) || "null");
      if(cached?.games?.length){
        usedCache = true;

        const games = cached.games;
        let p = 0, v = 0;
        games.forEach(g => { p += (g.playing || 0); v += (g.visits || 0); });
        setAllStats({ playing: p, visits: v, count: games.length });

        $carousel.innerHTML = "";
        games.forEach(g => {
          const el = document.createElement("div");
          el.className = "gameCard";
          el.innerHTML = `
            <div class="gameThumbWrap"></div>
            <div class="gameBody">
              <div class="gameName">${safeText(g.name)}</div>
              <div class="metaRow">
                <span class="badge">Offline fallback</span>
                <span class="badge">Last known data</span>
              </div>
              <a class="playBtn" href="https://www.roblox.com/games/${encodeURIComponent(g.rootPlaceId)}" target="_blank" rel="noreferrer">Play Now</a>
            </div>
          `;
          $carousel.appendChild(el);
        });
      }
    }catch{}

    if(usedCache){
      toast("Using last known game data");
      return;
    }

    $carousel.innerHTML = `
      <div class="gameCard">
        <div class="gameBody">
          <div class="gameName">Couldn’t load games</div>
          <div class="metaRow">
            <span class="badge">Worker error / rate limit</span>
            <span class="badge">Try again</span>
          </div>
          <a class="playBtn" href="#games">Retry</a>
        </div>
      </div>
    `;
    toast("Failed to load games");
  }
}

/* Carousel nav */
document.getElementById("leftBtn").onclick =
  () => $carousel.scrollBy({ left: -420, behavior: "smooth" });

document.getElementById("rightBtn").onclick =
  () => $carousel.scrollBy({ left: 420, behavior: "smooth" });

/* Discord copy (topbar + hero button) */
async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

async function onDiscordCopy(){
  const ok = await copyText(DISCORD_INVITE);
  toast(ok ? "Discord link copied" : "Copy failed");
}

const d1 = document.getElementById("discordCopyBtn");
if(d1) d1.addEventListener("click", onDiscordCopy);

const d2 = document.getElementById("discordCopyBtn2");
if(d2) d2.addEventListener("click", onDiscordCopy);

/* Always re-load when user returns (fixes “stale tab”) */
load();
document.addEventListener("visibilitychange", () => {
  if(!document.hidden) load();
});
