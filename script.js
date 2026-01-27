const WORKER_URL = "https://plusviiwebworker.loganplayzu.workers.dev/";
const UNIVERSE_IDS = ["9535197929","7314795657","9061511409","9551746424"];

const $carousel = document.getElementById("gamesCarousel");
const $playing  = document.getElementById("statPlaying");
const $visits   = document.getElementById("statVisits");

const fmt = n =>
  n >= 1e6 ? (n/1e6).toFixed(1)+"M" :
  n >= 1e3 ? (n/1e3).toFixed(1)+"K" :
  n;

async function load(){
  const r = await fetch(
    `${WORKER_URL}?ids=${UNIVERSE_IDS.join(",")}&_=${Date.now()}`,
    { cache:"no-store" }
  );
  const j = await r.json();
  const games = j.data || [];

  let p=0,v=0;
  games.forEach(g=>{ p+=g.playing||0; v+=g.visits||0; });
  $playing.textContent = fmt(p);
  $visits.textContent  = fmt(v);

  const t = await fetch(
    `${WORKER_URL}thumbs?ids=${UNIVERSE_IDS.join(",")}&_=${Date.now()}`,
    { cache:"no-store" }
  );
  const tj = await t.json();
  const thumbs = new Map();
  tj.data?.forEach(e=>{
    if(e.universeId && e.thumbnails?.[0]?.imageUrl){
      thumbs.set(String(e.universeId), e.thumbnails[0].imageUrl);
    }
  });

  $carousel.innerHTML = "";

  games.forEach(g=>{
    const img = thumbs.get(String(g.id));
    const el = document.createElement("div");
    el.className="gameCard";
    el.innerHTML = `
      <div class="gameThumbWrap">
        ${img ? `<img class="gameThumb" src="${img}" loading="lazy">` : ""}
      </div>
      <div class="gameBody">
        <div class="gameName">${g.name}</div>
        <div class="metaRow">
          <span class="badge">👥 ${fmt(g.playing||0)}</span>
          <span class="badge">▶ ${fmt(g.visits||0)}</span>
        </div>
        <a class="playBtn" href="https://www.roblox.com/games/${g.rootPlaceId}" target="_blank">Play Now</a>
      </div>`;
    $carousel.appendChild(el);
  });
}

document.getElementById("leftBtn").onclick  =
  () => $carousel.scrollBy({ left:-420, behavior:"smooth" });
document.getElementById("rightBtn").onclick =
  () => $carousel.scrollBy({ left:420, behavior:"smooth" });

load();
