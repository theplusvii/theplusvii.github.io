// Your universe IDs
const UNIVERSE_IDS = ["9535197929","7314795657","9061511409","9551746424"];

/**
 * IMPORTANT:
 * Browsers often cannot fetch Roblox API domains directly due to CORS.
 * To make it 100% reliable, set PROXY_BASE to a same-origin endpoint you host:
 *   PROXY_BASE = "/api/roblox"
 * And that endpoint forwards Roblox requests + adds Access-Control-Allow-Origin.
 *
 * If you leave PROXY_BASE = "", we try direct Roblox and silently do nothing if blocked.
 */
const PROXY_BASE = ""; // e.g. "/api/roblox"

const $carousel = document.getElementById("gamesCarousel");
const $playing  = document.getElementById("statPlaying");
const $visits   = document.getElementById("statVisits");
const $count    = document.getElementById("statCount");

const $bottomVisits  = document.getElementById("bottomVisits");
const $bottomGames   = document.getElementById("bottomGames");
const $bottomPlaying = document.getElementById("bottomPlaying");

const fmt = (n) => {
  if (n == null) return "—";
  const num = Number(n) || 0;
  if (num >= 1e9) return (num/1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num/1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num/1e3).toFixed(1) + "K";
  return String(num);
};

function safeText(s){
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;"
  }[c]));
}

async function fetchJson(url){
  const u = new URL(url);
  u.searchParams.set("_", String(Date.now()));
  const r = await fetch(u.toString(), {
    cache: "no-store",
    headers: { "cache-control":"no-cache, no-store, max-age=0", "pragma":"no-cache" }
  });
  if(!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

function setStats({ playing, visits, count }){
  $playing.textContent = fmt(playing);
  $visits.textContent  = fmt(visits);
  $count.textContent   = fmt(count);

  if($bottomVisits)  $bottomVisits.textContent  = fmt(visits);
  if($bottomGames)   $bottomGames.textContent   = fmt(count);
  if($bottomPlaying) $bottomPlaying.textContent = fmt(playing);
}

function cardHTML({ name, playing, visits, rootPlaceId, iconUrl }){
  const link = rootPlaceId
    ? `https://www.roblox.com/games/${encodeURIComponent(rootPlaceId)}`
    : "https://www.roblox.com/discover#/";

  return `
    <div class="gameCard">
      <div class="gameThumbWrap">
        ${iconUrl ? `<img class="gameThumb" src="${iconUrl}" loading="lazy" alt="">` : ""}
      </div>
      <div class="gameBody">
        <div class="gameName">${safeText(name || "Game")}</div>
        <div class="metaRow">
          <span class="badge">👥 ${fmt(playing)}</span>
          <span class="badge">▶ ${fmt(visits)}</span>
        </div>
        <a class="playBtn" href="${link}" target="_blank" rel="noreferrer">Play Now</a>
      </div>
    </div>
  `;
}

function renderCards(cards){
  $carousel.innerHTML = cards.map(cardHTML).join("");
}

function buildUrls(){
  const ids = UNIVERSE_IDS.join(",");

  // If you have a proxy, use it.
  if (PROXY_BASE){
    return {
      gamesUrl: `${PROXY_BASE}/games?universeIds=${encodeURIComponent(ids)}`,
      iconsUrl: `${PROXY_BASE}/icons?universeIds=${encodeURIComponent(ids)}`
    };
  }

  // Direct Roblox calls (may be blocked by CORS in the browser)
  return {
    gamesUrl: `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(ids)}`,
    iconsUrl: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(ids)}&size=512x512&format=Png&isCircular=false`
  };
}

async function loadGames(){
  // No “AI looking” placeholders or error screens — keep it clean.
  $carousel.innerHTML = "";

  const { gamesUrl, iconsUrl } = buildUrls();

  try{
    const [gj, tj] = await Promise.all([fetchJson(gamesUrl), fetchJson(iconsUrl)]);

    const games = Array.isArray(gj.data) ? gj.data : [];
    const icons = Array.isArray(tj.data) ? tj.data : [];

    const iconByUniverse = new Map();
    for (const it of icons){
      const id = it.targetId != null ? String(it.targetId) : null;
      if (id && it.imageUrl) iconByUniverse.set(id, it.imageUrl);
    }

    let totalPlaying = 0;
    let totalVisits = 0;

    const cards = games.map(g => {
      totalPlaying += (g.playing || 0);
      totalVisits  += (g.visits || 0);

      return {
        name: g.name,
        playing: g.playing || 0,
        visits: g.visits || 0,
        rootPlaceId: g.rootPlaceId,
        iconUrl: iconByUniverse.get(String(g.id)) || null
      };
    });

    setStats({ playing: totalPlaying, visits: totalVisits, count: cards.length });
    renderCards(cards);
  }catch{
    // Silent fail (as requested). Leave stats as — and carousel empty.
    // If you want, we can also render static cards here (no errors), but you didn’t ask.
  }
}

/* Carousel nav */
document.getElementById("leftBtn").onclick  =
  () => $carousel.scrollBy({ left:-420, behavior:"smooth" });
document.getElementById("rightBtn").onclick =
  () => $carousel.scrollBy({ left:420, behavior:"smooth" });

loadGames();

// Refresh stats/icons when returning to the tab (still silent)
document.addEventListener("visibilitychange", () => {
  if(!document.hidden) loadGames();
});
