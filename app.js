
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

    addCopyOrderButton();
    render();
    update();
  })
  .catch(e => {
    $("grid").textContent = "Catalogue data could not be loaded. Please refresh the page.";
    console.error(e);
  });

function addCopyOrderButton() {
  if ($("copyOrder")) return;

  const btn = document.createElement("button");
  btn.id = "copyOrder";
  btn.type = "button";
  btn.textContent = "COPY ORDER FOR MESSENGER";
  btn.style.cssText = "display:block;width:100%;margin-top:12px;background:#22d3ee;color:#061018;border:0;font-weight:900;letter-spacing:.5px;padding:14px;border-radius:10px";
  btn.addEventListener("click", copyOrder);
  $("clear").insertAdjacentElement("afterend", btn);

  const note = document.createElement("p");
  note.id = "copyNote";
  note.style.cssText = "font-size:12px;color:#9aa6bb;margin:8px 0 0";
  note.textContent = "Select your games, then copy your order and paste it into Messenger.";
  btn.insertAdjacentElement("afterend", note);
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

async function copyOrder() {
  if (selected.size === 0) {
    $("copyNote").textContent = "Please select at least one game before copying your order.";
    $("copyNote").style.color = "#fb3c83";
    return;
  }

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

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(message);
    } else {
      const ta = document.createElement("textarea");
      ta.value = message;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const copied = document.execCommand("copy");
      ta.remove();
      if (!copied) throw new Error("Copy command failed");
    }

    $("copyNote").textContent = "✓ Order copied! Open Messenger, choose your chat, then press and hold the message box and tap Paste.";
    $("copyNote").style.color = "#22d3ee";
    $("copyOrder").textContent = "✓ ORDER COPIED — PASTE IN MESSENGER";
  } catch (e) {
    $("copyNote").textContent = "Copy was blocked by your browser. Please try again or use Chrome.";
    $("copyNote").style.color = "#fb3c83";
    console.error(e);
  }
}

["search", "genre", "mode"].forEach(id =>
  $(id).addEventListener(id === "search" ? "input" : "change", render)
);

$("drive").addEventListener("change", update);

$("clear").onclick = () => {
  selected.clear();
  render();
  update();

  if ($("copyNote")) {
    $("copyNote").textContent = "Selection cleared. Choose games to create a new order.";
    $("copyNote").style.color = "#9aa6bb";
  }

  if ($("copyOrder")) {
    $("copyOrder").textContent = "COPY ORDER FOR MESSENGER";
  }
};
