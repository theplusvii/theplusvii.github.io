const UNIVERSE_IDS = ["9535197929","7314795657","9061511409","9551746424"];

const $carousel = document.getElementById("gamesCarousel");
const $playing  = document.getElementById("statPlaying");
const $visits   = document.getElementById("statVisits");

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

  if($bottomVisits)  $bottomVisits.textContent  = fmt(visits);
  if($bottomGames)   $bottomGames.textContent   = fmt(count);
  if($bottomPlaying) $bottomPlaying.textContent = fmt(playing);
}

async function loadGames(){
  const ids = UNIVERSE_IDS.join(",");

  const gamesUrl =
    `https://games.roblox.com/v1/games?universeIds=${encodeURIComponent(ids)}`;

  const thumbsUrl =
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${encodeURIComponent(ids)}&size=512x512&format=Png&isCircular=false`;

  let games = [];
  let thumbsMap = new Map();

  try{
    const gj = await fetchJson(gamesUrl);
    games = Array.isArray(gj.data) ? gj.data : [];
  }catch{
    games = [];
  }

  try{
    const tj = await fetchJson(thumbsUrl);
    const arr = Array.isArray(tj.data) ? tj.data : [];
    for (const it of arr){
      const key = it.targetId != null ? String(it.targetId) : null;
      const img = it.imageUrl;
      if(key && img) thumbsMap.set(key, img);
    }
  }catch{
    thumbsMap = new Map();
  }

  let p = 0;
  let v = 0;

  for (const g of games){
    p += (g.playing || 0);
    v += (g.visits || 0);
  }

  setStats({ playing: p, visits: v, count: games.length });

  $carousel.innerHTML = "";

  for (const g of games){
    const img = thumbsMap.get(String(g.id));
    const rootPlaceId = g.rootPlaceId;
    const name = g.name;

    const el = document.createElement("div");
    el.className = "gameCard";

    el.innerHTML = `
      <div class="gameThumbWrap">
        ${img ? `<img class="gameThumb" src="${img}" loading="lazy" alt="">` : ""}
      </div>
      <div class="gameBody">
        <div class="gameName">${safeText(name)}</div>
        <div class="metaRow">
          <span class="badge">👥 ${fmt(g.playing || 0)}</span>
          <span class="badge">▶ ${fmt(g.visits || 0)}</span>
        </div>
        <a class="playBtn" href="https://www.roblox.com/games/${encodeURIComponent(rootPlaceId)}" target="_blank" rel="noreferrer">Play Now</a>
      </div>
    `;

    $carousel.appendChild(el);
  }
}

/* Page-style navigation */
function setPageFromHash(){
  const raw = (location.hash || "#home").replace("#","");
  const page = raw === "games" || raw === "links" ? raw : "home";

  const pages = document.querySelectorAll(".page");
  pages.forEach(p => p.classList.remove("active"));

  const target = document.querySelector(`.page[data-page="${page}"]`);
  if(target) target.classList.add("active");

  if(page === "games"){
    loadGames();
  }
}

window.addEventListener("hashchange", setPageFromHash);
setPageFromHash();

/* Carousel nav */
document.getElementById("leftBtn").onclick  =
  () => $carousel.scrollBy({ left:-420, behavior:"smooth" });
document.getElementById("rightBtn").onclick =
  () => $carousel.scrollBy({ left:420, behavior:"smooth" });
