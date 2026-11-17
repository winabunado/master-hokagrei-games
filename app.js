
let games = [];
let selected = new Set();

const $ = id => document.getElementById(id);
const usable = { "320": 280, "500": 460, "1000": 920, "2000": 1800 };
const fmt = n => Number(n.toFixed(1)) + " GB";

fetch("games.json")
  .then(r => {
    if (!r.ok) throw new Error("Could not load games.json");
    return r.json();
  })
  .then(d => {
    games = Array.isArray(d.games) ? d.games : [];
    $("resultCount").textContent = games.length + " TITLES";

    const genres = [...new Set(games.flatMap(g => g.genre || []))].sort();
    genres.forEach(g => {
      const o = document.createElement("option");
      o.value = g;
      o.textContent = g;
      $("genre").append(o);
    });

    addOrderButtons();
    render();
    update();
  })
  .catch(e => {
    $("grid").textContent = "Catalogue data could not be loaded. Please refresh the page.";
    console.error(e);
  });

function addOrderButtons() {
  if ($("copyOrder")) return;

  const wrap = document.createElement("div");
  wrap.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px";

  const copy = document.createElement("button");
  copy.id = "copyOrder";
  copy.type = "button";
  copy.textContent = "COPY ORDER";
  copy.style.cssText = "width:100%;background:#22d3ee;color:#061018;border:0;font-weight:900;padding:14px 8px;border-radius:10px";
  copy.addEventListener("click", copyOrder);

  const share = document.createElement("button");
  share.id = "shareOrder";
  share.type = "button";
  share.textContent = "SHARE ORDER";
  share.style.cssText = "width:100%;background:#fb3c83;color:#fff;border:0;font-weight:900;padding:14px 8px;border-radius:10px";
  share.addEventListener("click", shareOrder);

  wrap.append(copy, share);
  $("clear").insertAdjacentElement("afterend", wrap);

  const note = document.createElement("p");
  note.id = "copyNote";
  note.style.cssText = "font-size:12px;color:#9aa6bb;margin:8px 0 0";
  note.textContent = "Select games, then copy or share your order through Messenger.";
  wrap.insertAdjacentElement("afterend", note);
}

function render() {
  const q = $("search").value.toLowerCase();
  const genre = $("genre").value;
  const mode = $("mode").value;

  const list = games.filter(g =>
    (g.name || "").toLowerCase().includes(q) &&
    (!genre || (g.genre || []).includes(genre)) &&
    (mode !== "low" || g.lowEnd)
  );

  $("resultCount").textContent = list.length + " GAMES";
  $("grid").innerHTML = "";

  list.forEach(g => {
    const card = document.createElement("article");
    card.className = "game";

    const cover = document.createElement("div");
    cover.className = "cover";

    if (g.img) {
      const im = document.createElement("img");
      im.src = g.img;
      im.alt = g.name;
      im.loading = "lazy";
      im.onerror = () => {
        cover.innerHTML = '<span class="fallback"></span>';
        cover.firstChild.textContent = g.name;
      };
      cover.append(im);
    } else {
      const f = document.createElement("span");
      f.className = "fallback";
      f.textContent = g.name;
      cover.append(f);
    }

    const info = document.createElement("div");
    info.className = "info";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = g.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = fmt(Number(g.size) || 0) + " • " + (g.genre || []).join(", ");

    info.append(name, meta);

    if (g.lowEnd) {
      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = "LOW-END PICK";
      info.append(tag);
    }

    const b = document.createElement("button");
    b.className = "pick" + (selected.has(g.name) ? " active" : "");
    b.textContent = selected.has(g.name) ? "✓ SELECTED" : "+ ADD TO DRIVE";
    b.onclick = () => {
      selected.has(g.name) ? selected.delete(g.name) : selected.add(g.name);
      render();
      update();
    };

    info.append(b);
    card.append(cover, info);
    $("grid").append(card);
  });
}

function update() {
  const chosen = games.filter(g => selected.has(g.name));
  const size = chosen.reduce((s, g) => s + (Number(g.size) || 0), 0);
  const cap = usable[$("drive").value];

  $("selectedSize").textContent = fmt(size);
  $("capacityText").textContent =
    fmt(size) + " of " + cap + " GB usable capacity • " + selected.size + " games";
  $("barFill").style.width = Math.min(100, size / cap * 100) + "%";
  $("barFill").style.background = size > cap ? "#fb3c83" : "";
}

function buildOrderMessage() {
  const chosen = games.filter(g => selected.has(g.name));
  const total = chosen.reduce((s, g) => s + (Number(g.size) || 0), 0);
  const drive = $("drive").selectedOptions[0].textContent;
  const capacity = usable[$("drive").value];

  const lines = chosen.map((g, i) =>
    `${i + 1}. ${g.name} — ${fmt(Number(g.size) || 0)}`
  );

  const message = [
    "🎮 MASTER HOKAGREI — GAME DRIVE ORDER",
    "",
    `Drive: ${drive}`,
    `Selected games: ${chosen.length}`,
    "",
    "MY GAME LIST:",
    ...lines,
    "",
    `TOTAL SIZE: ${fmt(total)}`,
    `USABLE DRIVE CAPACITY: ${capacity} GB`,
    `REMAINING SPACE: ${fmt(Math.max(0, capacity - total))}`,
    "",
    "Please confirm availability, compatibility and final price. Thank you!"
  ].join("\n");

  return { message, count: chosen.length };
}

async function copyOrder() {
  const order = buildOrderMessage();

  if (!order.count) {
    showOrderNote("Please select at least one game first.", "#fb3c83");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(order.message);
    } else {
      const ta = document.createElement("textarea");
      ta.value = order.message;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const copied = document.execCommand("copy");
      ta.remove();
      if (!copied) throw new Error("Copy command failed");
    }

    showOrderNote("✓ Order copied! Open Messenger, choose a chat, then paste the message.", "#22d3ee");
    $("copyOrder").textContent = "✓ COPIED";
  } catch (e) {
    showOrderNote("Copy was blocked by your browser. Try SHARE ORDER instead.", "#fb3c83");
    console.error(e);
  }
}

async function shareOrder() {
  const order = buildOrderMessage();

  if (!order.count) {
    showOrderNote("Please select at least one game first.", "#fb3c83");
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Master HokaGrei Game Drive Order",
        text: order.message
      });
      showOrderNote("Share menu opened. Choose Messenger and select the recipient.", "#22d3ee");
    } catch (e) {
      if (e.name !== "AbortError") {
        showOrderNote("Sharing is unavailable in this browser. Use COPY ORDER instead.", "#fb3c83");
        console.error(e);
      }
    }
  } else {
    showOrderNote("This browser does not support direct sharing. Use COPY ORDER, then paste into Messenger.", "#fb3c83");
  }
}

function showOrderNote(message, color) {
  $("copyNote").textContent = message;
  $("copyNote").style.color = color;
}

["search", "genre", "mode"].forEach(id =>
  $(id).addEventListener(id === "search" ? "input" : "change", render)
);

$("drive").addEventListener("change", update);

$("clear").onclick = () => {
  selected.clear();
  render();
  update();
  if ($("copyNote")) showOrderNote("Selection cleared. Choose games to create a new order.", "#9aa6bb");
  if ($("copyOrder")) $("copyOrder").textContent = "COPY ORDER";
};
