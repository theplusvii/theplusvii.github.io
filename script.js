const UNIVERSE_IDS = ["9535197929","7314795657","9061511409","9551746424"];

/**
 * IMPORTANT:
 * Browser fetch to Roblox APIs may be blocked by CORS. That’s why you saw “nothing loads”.
 * We will:
 * 1) Try live APIs
 * 2) If blocked, silently fall back to STATIC_CARDS so site still looks clean.
 */
const STATIC_CARDS = [
  // If you want exact names/icons even in fallback mode, fill them in here.
  // The rootPlaceId will come from live mode; in fallback we can only link by universe -> unknown.
  // If you paste me each game’s rootPlaceId once, I’ll lock these perfectly.
  { universeId: "9535197929", name: "Game", rootPlaceId: null, iconUrl: null },
  { universeId: "7314795657", name: "Game", rootPlaceId: null, iconUrl: null },
  { universeId: "9061511409", name: "Game", rootPlaceId: null, iconUrl: null },
  { universeId: "9551746424", name: "Game", rootPlaceId: null, iconUrl: null },
];

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

async function fetchJsonNoCache(url){
  const u = new URL(url);
  u.searchParams.set("_", String(Date.now()));
  const r = await fetch(u.toString(), {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache, no-store, max-age=0",
      "pragma": "no-cache"
    }
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
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
    : "https://www.roblox.com/discover#/" ;

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

function renderCards(list){
  $carousel.innerHTML = list.map(cardHTML).join("");
}

async function loadGamesLive(){
  const ids = UNIVERSE_IDS.join(",");

  // Live endpoints (may be blocked by CORS on many hosts)
  const gamesUrl =
    `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(ids)}`;
  const iconsUrl =
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(ids)}&size=512x512&format=Png&isCircular=false`;

  const gj = await fetchJsonNoCache(gamesUrl);
  const games = Array.isArray(gj.data) ? gj.data : [];

  const tj = await fetchJsonNoCache(iconsUrl);
  const icons = Array.isArray(tj.data) ? tj.data : [];

  const iconByUniverse = new Map();
  for (const it of icons){
    const id = it.targetId != null ? String(it.targetId) : null;
    if(id && it.imageUrl) iconByUniverse.set(id, it.imageUrl);
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
}

function loadGamesFallback(){
  // No fake “errors”. Just render clean cards.
  setStats({ playing: null, visits: null, count: STATIC_CARDS.length });

  const cards = STATIC_CARDS.map(c => ({
    name: c.name || "Game",
    playing: null,
    visits: null,
    rootPlaceId: c.rootPlaceId,
    iconUrl: c.iconUrl
  }));

  renderCards(cards);
}

async function loadGames(){
  // Show nothing “error looking”: just keep it calm.
  $carousel.innerHTML = "";
  loadGamesFallback(); // immediate clean UI while live tries

  try{
    await loadGamesLive();
  }catch{
    // silent: keep fallback (no messages)
  }
}

/* Carousel buttons */
document.getElementById("leftBtn").onclick  =
  () => $carousel.scrollBy({ left:-420, behavior:"smooth" });

document.getElementById("rightBtn").onclick =
  () => $carousel.scrollBy({ left:420, behavior:"smooth" });

loadGames();
