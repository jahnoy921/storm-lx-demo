/* ============================================================
   Storm-LX demo — app logic
   ============================================================ */
(function () {
"use strict";

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = a => a[Math.floor(Math.random() * a.length)];
const pickN = (a, n) => a.slice().sort(() => Math.random() - 0.5).slice(0, n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let LANG = "en";
const t = k => (window.I18N[LANG] && window.I18N[LANG][k] != null)
  ? window.I18N[LANG][k] : (window.I18N.en[k] != null ? window.I18N.en[k] : k);
const pipe = k => String(t(k)).split("|");

/* ============================================================
   1. TRANSLATION ENGINE
   ============================================================ */
function applyI18n() {
  document.documentElement.lang = t("html.lang");
  document.documentElement.dir  = t("html.dir");
  document.title = t("page.title");

  $$("[data-i18n]").forEach(el => {
    const v = t(el.dataset.i18n);
    if (typeof v === "string" && v.indexOf("|") > -1) {
      const ul = el.tagName === "UL" ? el : el.closest("ul,ol");
      if (ul) {
        ul.innerHTML = "";
        v.split("|").forEach(item => {
          const li = document.createElement("li");
          li.textContent = item.trim();
          ul.appendChild(li);
        });
        return;
      }
    }
    el.textContent = v;
  });

  const rights = $("[data-i18n='foot.rights']");
  if (rights) rights.textContent = t("foot.rights").replace("YEAR", new Date().getFullYear());

  $$("#langMenu button").forEach(b => b.classList.toggle("active", b.dataset.lang === LANG));
  updateLangNote();
  const now = $("#langNow");
  if (now) now.textContent = (window.LANG_META[LANG] || {}).short || "EN";

  renderModules();
  renderFaq();
  renderCouncil();
  if (ST.tabs.security) runEicar();
  if (ST.tabs.media) runMedia();
}

function setLang(l) {
  if (!window.I18N[l]) return;
  LANG = l;
  try { localStorage.setItem("slx-lang", l); } catch (e) {}
  const u = new URL(location.href);
  u.searchParams.set("lang", l);
  history.replaceState(null, "", u);
  applyI18n();
}

/* ============================================================
   2. CONTENT TABLES
   ============================================================ */
/* The five modules exactly as described on the Gumroad listing */
const MODULES = [
  { ico: "🔍", k: "mod.m1", d: "mod.d1" },
  { ico: "🏛️", k: "mod.m2", d: "mod.d2" },
  { ico: "🕵️", k: "mod.m6", d: "mod.d6" },
  { ico: "🎙️", k: "mod.m3", d: "mod.d3" },
  { ico: "🛠️", k: "mod.m4", d: "mod.d4" },
  { ico: "🛡️", k: "mod.m5", d: "mod.d5" },
  { ico: "💰", k: "mod.m7", d: "mod.d7" },
  { ico: "💻", k: "mod.m8", d: "mod.d8" },
  { ico: "🎯", k: "mod.m9", d: "mod.d9" }
];

const FAQ_KEYS = [
  ["faq.q1", "faq.a.lic"], ["faq.q2", "faq.a.req"], ["faq.q3", "faq.a.lang"],
  ["faq.q4", "faq.a.priv"], ["faq.q5", "faq.a.src"], ["faq.q6", "faq.a.trial"],
  ["faq.q7", "faq.a.legal"], ["faq.q8", "faq.a.upd"]
];

/* Council roles — index order is meaningful, roles.0 = proposer, 1 = advocate… */
const R_PROPOSER = 0, R_ADVOCATE = 1, R_CRITIC = 2, R_RISK = 3, R_EXEC = 4;

/* ============================================================
   3. STATE
   ============================================================ */
const ST = {
  kind: "research",
  running: false,
  speakText: "",
  tabs: { security: false, media: false }
};

/* ============================================================
   4. HERO TERMINAL
   ============================================================ */
const HERO_SCRIPT = [
  { c: "tag",  x: "STORM-LX v23 — autonomous AI agent platform" },
  { c: "info", x: "[boot] loading local model runtime … ok" },
  { c: "ok",   x: "[ok]   14 languages loaded · interface + reasoning" },
  { c: "",     x: "" },
  { c: "tag",  x: "> mission \"market entry for a new product line\"" },
  { c: "",     x: "  [1/3] COUNCIL  round 1 · 5 domain experts generated" },
  { c: "",     x: "         └─ each submitted an independent plan" },
  { c: "warn", x: "  [2/3] COUNCIL  round 2 · devil's advocate attacks" },
  { c: "",     x: "         └─ 17 objections raised · 4 plans revised" },
  { c: "tag",  x: "  [3/3] COUNCIL  round 3 · executive arbitration" },
  { c: "ok",   x: "[ok]   one prioritised roadmap · 6 actions · 2 risks flagged" },
  { c: "ok",   x: "[ok]   14/14 claims carry a source reference" },
  { c: "",     x: "" },
  { c: "tag",  x: "> next mission?" },
  { c: "info", x: "█" }
];
function heroTerm() {
  const el = $("#heroTerm"); if (!el) return;
  let i = 0;
  (function step() {
    if (i >= HERO_SCRIPT.length) { setTimeout(() => { el.innerHTML = ""; i = 0; step(); }, 5000); return; }
    const s = HERO_SCRIPT[i++];
    const d = document.createElement("div");
    d.className = s.c;
    d.textContent = s.x;
    el.appendChild(d);
    while (el.children.length > 15) el.removeChild(el.firstChild);
    setTimeout(step, 130 + Math.random() * 180);
  })();
}

/* ============================================================
   5. AI COUNCIL
   ============================================================ */
/* [round, cls, roleIndex, i18nKey, params] */
const PLANS = {
  research: {
    roles: [R_PROPOSER, R_PROPOSER, R_ADVOCATE, R_CRITIC, R_EXEC],
    lines: [
      [1, "key",  R_EXEC, "rt.log.open"],
      [1, "info", R_PROPOSER, "rt.log.experts", { n: 5 }],
      [1, "good", R_PROPOSER, "rt.log.plans", { n: 5 }],
      [2, "info", R_CRITIC, "rt.log.round2"],
      [2, "warn", R_CRITIC, "rt.log.objections", { n: 17 }],
      [2, "good", R_ADVOCATE, "rt.log.revised", { n: 4 }],
      [2, "info", R_RISK, "rt.log.blindspots"],
      [3, "info", R_EXEC, "rt.log.round3"],
      [3, "good", R_EXEC, "rt.log.roadmap", { n: 6 }],
      [3, "info", R_EXEC, "rt.log.verify"],
      [3, "good", R_EXEC, "rt.log.sourced", { a: 14, b: 14 }]
    ]
  },
  audit: {
    roles: [R_PROPOSER, R_CRITIC, R_RISK, R_ADVOCATE, R_EXEC],
    lines: [
      [1, "key",  R_EXEC, "rt.log.open"],
      [1, "info", R_PROPOSER, "rt.log.scopeGen"],
      [1, "good", R_PROPOSER, "rt.log.scopeOut", { n: 6 }],
      [2, "info", R_CRITIC, "rt.log.round2"],
      [2, "warn", R_CRITIC, "rt.log.findings", { n: 9, a: 3, b: 6 }],
      [2, "info", R_RISK, "rt.log.chain"],
      [2, "good", R_ADVOCATE, "rt.log.priority"],
      [3, "info", R_EXEC, "rt.log.round3"],
      [3, "good", R_EXEC, "rt.log.remediation", { n: 9 }],
      [3, "good", R_EXEC, "rt.log.sourced", { a: 9, b: 9 }]
    ]
  },
  media: {
    roles: [R_PROPOSER, R_CRITIC, R_ADVOCATE, R_RISK, R_EXEC],
    lines: [
      [1, "key",  R_EXEC, "rt.log.open"],
      [1, "info", R_PROPOSER, "rt.log.whisper"],
      [1, "good", R_PROPOSER, "rt.log.transcribed", { n: 1842 }],
      [2, "info", R_CRITIC, "rt.log.cross"],
      [2, "good", R_CRITIC, "rt.log.contradictions", { n: 3 }],
      [2, "info", R_ADVOCATE, "rt.log.timestamps"],
      [3, "info", R_EXEC, "rt.log.round3"],
      [3, "good", R_EXEC, "rt.log.brief", { n: 2 }],
      [3, "good", R_EXEC, "rt.log.privacy"]
    ]
  },
  spend: {
    roles: [R_PROPOSER, R_RISK, R_ADVOCATE, R_CRITIC, R_EXEC],
    lines: [
      [1, "key",  R_EXEC, "rt.log.open"],
      [1, "info", R_PROPOSER, "rt.log.constraints"],
      [1, "good", R_PROPOSER, "rt.log.options", { n: 4 }],
      [2, "info", R_CRITIC, "rt.log.round2"],
      [2, "warn", R_CRITIC, "rt.log.hidden", { n: 7 }],
      [2, "info", R_RISK, "rt.log.scenarios", { n: 3 }],
      [3, "info", R_EXEC, "rt.log.round3"],
      [3, "good", R_EXEC, "rt.log.allocation"],
      [3, "good", R_EXEC, "rt.log.userInput"]
    ]
  }
};

function roleName(i) { return pipe("rt.roles")[i] || ("Role " + (i + 1)); }
function roleSide(i) { return i === R_CRITIC || i === R_RISK ? "con" : i === R_PROPOSER || i === R_ADVOCATE ? "pro" : ""; }

function renderCouncil() {
  const host = $("#councilCards"), strip = $("#roundStrip");
  if (!host || !PLANS[ST.kind]) return;
  strip.innerHTML = "";
  pipe("rt.rounds").forEach((r, i) => {
    const c = document.createElement("span");
    c.className = "round-chip"; c.dataset.round = i + 1;
    c.textContent = r;
    strip.appendChild(c);
  });
  host.innerHTML = "";
  PLANS[ST.kind].roles.forEach((ri, n) => {
    const d = document.createElement("div");
    d.className = "agent-card " + roleSide(ri);
    d.dataset.role = ri;
    d.innerHTML =
      '<div class="an">' + esc(roleName(ri)) + "</div>" +
      '<div class="ar">seat ' + String(n + 1).padStart(2, "0") + "</div>" +
      '<div class="as">—</div>';
    host.appendChild(d);
  });
}
function fill(s, p) {
  if (!p) return s;
  return s.replace(/\{(\w)\}/g, (m, k) => (p[k] != null ? p[k] : m));
}

async function runCouncil() {
  if (ST.running) return;
  ST.kind = $("#councilSelect").value;
  ST.running = true;
  const btn = $("#runCouncil"), log = $("#councilLog");
  btn.disabled = true; btn.textContent = t("council.run2");
  log.innerHTML = "";
  $("#logCount").textContent = "0 " + t("rt.lines");
  renderCouncil();

  let n = 0, lastRound = 0;
  for (const [round, cls, ri, key, params] of PLANS[ST.kind].lines) {
    if (round !== lastRound) {
      lastRound = round;
      $$(".round-chip").forEach(c => {
        const r = +c.dataset.round;
        c.classList.toggle("on", r === round);
        c.classList.toggle("done", r < round);
      });
    }
    const tx = fill(t(key), params);
    const ts = new Date().toISOString().slice(11, 19);
    const line = document.createElement("div");
    line.className = "l-line " + cls;
    line.innerHTML = '<span class="ts">' + ts + "</span>" +
                     '<span class="ag">' + esc(roleName(ri)) + "</span>" +
                     '<span class="tx">' + esc(tx) + "</span>";
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    n++; $("#logCount").textContent = n + " " + t("rt.lines");

    const card = $('.agent-card[data-role="' + ri + '"]');
    if (card) {
      if (cls === "info" || cls === "warn") {
        card.classList.add("active");
        card.querySelector(".as").textContent = cls === "warn" ? t("rt.status.objecting") : t("rt.status.speaking");
      }
      if (cls === "good") {
        card.classList.remove("active");
        card.classList.add("done");
        card.querySelector(".as").textContent = t("rt.status.done");
      }
    }
    await sleep(300 + Math.random() * 280);
  }

  $$(".agent-card").forEach(c => { c.classList.remove("active"); c.classList.add("done"); c.querySelector(".as").textContent = t("rt.status.done"); });
  $$(".round-chip").forEach(c => { c.classList.remove("on"); c.classList.add("done"); });
  btn.disabled = false; btn.textContent = t("council.run");
  ST.running = false;
}

/* ============================================================
   6. DEEP RESEARCH  (fictional placeholders — clearly labelled)
   ============================================================ */
const SRC_KINDS = ["gov", "edu", "registry", "media", "papers", "standards", "local", "forum"];
const LANGS_Q = ["en", "fr", "es", "de", "pt", "it", "zh", "ja", "ko", "ru", "ar", "he", "hi", "id"];
const FINDINGS = ["subsidy", "permit", "tender", "ruling", "standard", "tariff"];

function runResearch() {
  const out = $("#researchOut"), pipe = $("#pipeline");
  const topic = ($("#researchTarget").value || "research").trim();
  out.innerHTML = "";

  const steps = ["research.p1", "research.p2", "research.p3", "research.p4", "research.p5", "research.p6"];
  pipe.innerHTML = steps.map((k, i) =>
    '<div class="pipe-step" data-i="' + i + '"><span class="pn">' + (i + 1) + "</span><span>" + esc(t(k)) + "</span></div>").join("");

  let si = 0;
  (function advance() {
    if (si >= steps.length) { streamSources(); return; }
    const el = pipe.querySelector('[data-i="' + si + '"]');
    if (el) el.classList.add("on");
    setTimeout(() => {
      if (el) { el.classList.remove("on"); el.classList.add("ok"); }
      si++;
      advance();
    }, 320 + Math.random() * 240);
  })();
}
function streamSources() {
  const out = $("#researchOut");
  const topic = ($("#researchTarget").value || "research").trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const slug = topic.replace(/^-+|-+$/g, "") || "example";

  const stats = [
    ["research.s1", 12 + Math.floor(Math.random() * 40)],
    ["research.s2", 17],
    ["research.s3", 3 + Math.floor(Math.random() * 12)],
    ["research.s4", 20 + Math.floor(Math.random() * 60)],
    ["research.s5", (2 + Math.floor(Math.random() * 8)) + "." + Math.floor(Math.random() * 9) + "s"]
  ];
  const grid = document.createElement("div");
  grid.className = "osint-grid";
  stats.forEach(p => grid.insertAdjacentHTML("beforeend",
    '<div class="stat"><div class="sv">' + p[1] + '</div><div class="sl">' + esc(t(p[0])) + "</div></div>"));
  out.appendChild(grid);

  const seen = new Set(), pool = [];
  SRC_KINDS.forEach(k => { for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) pool.push(k); });

  let i = 0;
  (function next() {
    if (i >= 16) {
      const h = document.createElement("div");
      h.className = "micro"; h.style.marginTop = ".4rem";
      h.textContent = t("research.novel") + ":";
      out.appendChild(h);
      pickN(FINDINGS, 3 + Math.floor(Math.random() * 3)).forEach(f => {
        const row = document.createElement("div");
        row.className = "src";
        row.innerHTML = '<span class="tag-s">' + esc(t("research.finding")) + "</span>" +
          '<span class="u">' + esc(t("rf." + f)) + "</span>" +
          '<span class="sc">' + (62 + Math.floor(Math.random() * 38)) + "%</span>";
        out.appendChild(row);
      });
      setTimeout(forgeSkills, 700);
      return;
    }
    const kind = pool[i % pool.length];
    const dup = seen.has(kind) && Math.random() < 0.55;
    if (!dup) seen.add(kind);
    const qlang = rand(LANGS_Q);
    const url = "https://" + kind + "." + (dup ? "cache.local" : slug) + "/" + rand(["index", "doc", "record", "ruling", "paper"]);
    const conf = 58 + Math.floor(Math.random() * 42);
    const row = document.createElement("div");
    row.className = "src";
    row.innerHTML =
      '<span class="tag-s">' + esc(t("rs." + kind)) + "</span>" +
      '<span class="u" style="opacity:' + (dup ? .55 : 1) + '">' + esc(url) + "</span>" +
      '<span class="sc">' + (dup ? esc(t("research.dedup")) + " · " : "") +
        esc(t("research.conf")) + " " + conf + "% · " + qlang.toUpperCase() + "</span>";
    out.appendChild(row);
    i++;
    setTimeout(next, 100 + Math.random() * 170);
  })();
}

/* ============================================================
   7. MEDIA ANALYSIS — real computation on pasted text
   ============================================================ */
const MEDIA_SAMPLE = `Chair: Let us begin. We are here today to discuss the proposal, and I want to be clear about one thing from the start: the timeline is fixed.
Manager: Understood. But I have to be honest, the budget is not what we projected in the spring. We are short by roughly eleven percent.
Chair: Eleven percent. That is significant.
Analyst: It is, but let me put it in context. If we phase the second milestone we can absorb most of the gap without touching scope. I would rather do that than cut the testing window.
Manager: How long would phasing add?
Analyst: Six weeks, roughly. Six weeks for a system that people depend on daily, I think that is a reasonable trade.
Chair: I agree. Nobody wants a rushed rollout. What does the board think about the alternative, reducing scope?
Analyst: Reducing scope means the compliance module ships late, and compliance is not optional. That is not a trade we get to make.
Chair: Then the decision is made. We phase the milestone, we hold the testing window, and we revisit in the spring.`;

const FILLERS = ["um", "uh", "er", "ah", "like", "you know", "i mean", "basically", "actually", "sort of"];

function runMedia() {
  const txt = ($("#mediaInput").value || "").trim();
  const out = $("#mediaStats"), rep = $("#mediaReport");
  out.innerHTML = "";
  if (!txt) {
    rep.innerHTML = '<span style="color:var(--txt-3)">' + esc(t("media.empty")) + "</span>";
    ST.speakText = "";
    return;
  }

  const words = txt.match(/[\p{L}\p{N}'’-]+/gu) || [];
  const nW = words.length;
  const sentences = txt.split(/[.!?]+(?:\s|$)/).map(s => s.trim()).filter(s => s.length > 1);
  const wordsPerSent = nW / Math.max(1, sentences.length);

  const lower = txt.toLowerCase();
  let fillers = 0;
  FILLERS.forEach(f => {
    const re = new RegExp("\\b" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
    fillers += (lower.match(re) || []).length;
  });

  const questions = (txt.match(/\?/g) || []).length;
  const longest = sentences.reduce((a, b) => (b.split(/\s+/).length > a.split(/\s+/).length ? b : a), "");
  const speakers = new Set();
  txt.split(/\n/).forEach(line => {
    const m = line.match(/^([A-Z][A-Za-z ]{2,24}):/);
    if (m) speakers.add(m[1].trim());
  });
  const uniq = new Set(words.map(w => w.toLowerCase())).size;
  const spokenMin = nW / 150;

  const stats = [
    ["media.s1", nW],
    ["media.s2", sentences.length],
    ["media.s3", Math.round(wordsPerSent * 10) / 10],
    ["media.s4", fillers],
    ["media.s5", questions],
    ["media.s6", speakers.size || 1],
    ["media.s7", Math.round(spokenMin)],
    ["media.s8", Math.round(uniq / Math.max(1, nW) * 100) + "%"]
  ];
  stats.forEach(p => out.insertAdjacentHTML("beforeend",
    '<div class="stat"><div class="sv">' + p[1] + '</div><div class="sl">' + esc(t(p[0])) + "</div></div>"));

  ST.speakText = txt;
  rep.innerHTML = esc(
    t("media.r1") + ": " + t("media.s1").toLowerCase() + " / " + nW + "\n" +
    t("media.r2") + ": " + Math.round(wordsPerSent) + "\n" +
    t("media.r3") + ": " + fillers + " (" + (nW ? Math.round(fillers / nW * 1000) / 10 : 0) + "%)\n" +
    t("media.r4") + ": " + questions + "\n" +
    t("media.r5") + ": " + (speakers.size || 1) + "\n" +
    t("media.r6") + ": " + Math.round(spokenMin) + " " + t("media.min") + "\n\n" +
    t("media.r7") + ": \"" + longest.slice(0, 180) + (longest.length > 180 ? "…" : "") + "\""
  );

  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  $("#speakMedia").disabled = !canSpeak;
  if (!canSpeak) $("#speakMedia").title = t("media.nospeech");
}

function speakMedia() {
  if (!("speechSynthesis" in window) || !ST.speakText) return;
  try { speechSynthesis.cancel(); } catch (e) {}
  const u = new SpeechSynthesisUtterance(ST.speakText.slice(0, 4000));
  u.lang = (window.LANG_META[LANG] || {}).speech || "en-GB";
  u.rate = 1; u.pitch = 1;
  u.onend = u.onerror = () => { $("#speakMedia").disabled = false; $("#stopMedia").disabled = true; };
  $("#speakMedia").disabled = true; $("#stopMedia").disabled = false;
  speechSynthesis.speak(u);
}
function stopMedia() {
  try { speechSynthesis.cancel(); } catch (e) {}
  $("#speakMedia").disabled = false; $("#stopMedia").disabled = true;
}

/* ============================================================
   7b. RESEARCH -> SKILLS
   A research run does not only report. It spots the gaps it
   uncovered and forges a reusable skill for each one, so the
   capability survives the session.
   ============================================================ */
const SKILLS = [
  { ico: "\uD83D\uDCC4", k: "sk1", g: "sk.g1" },
  { ico: "\uD83D\uDD14", k: "sk2", g: "sk.g2" },
  { ico: "⚖️", k: "sk3", g: "sk.g3" },
  { ico: "\uD83C\uDF10", k: "sk4", g: "sk.g4" }
];

function forgeSkills() {
  const out = $("#researchOut");
  const wrap = document.createElement("div");
  wrap.className = "skill-forge";

  const head = document.createElement("div");
  head.className = "micro";
  head.style.marginTop = ".5rem";
  head.textContent = t("sk.gaps");
  wrap.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "skill-grid";
  wrap.appendChild(grid);
  out.appendChild(wrap);

  const chosen = pickN(SKILLS, 3);
  chosen.forEach((s, i) => {
    setTimeout(() => {
      const card = document.createElement("div");
      card.className = "skill-card";
      card.innerHTML =
        '<span class="skico">' + s.ico + "</span>" +
        '<div class="skbody">' +
          '<div class="skname">' + esc(t(s.k)) + "</div>" +
          '<div class="skgap">' + esc(t(s.g)) + "</div>" +
          '<div class="skstate">' + esc(t("sk.built")) + "</div>" +
        "</div>";
      grid.appendChild(card);
    }, i * 420);
  });

  setTimeout(() => {
    const tag = document.createElement("div");
    tag.className = "skill-final";
    tag.textContent = "⚡ " + t("sk.reusable");
    wrap.appendChild(tag);
  }, chosen.length * 420 + 350);
}

/* ============================================================
   8. TOOL FORGE
   ============================================================ */
const FORGE_STEPS = ["write", "test", "repair", "harden", "register"];

function renderForgeStage() {
  const host = $("#forgeStage");
  host.innerHTML = FORGE_STEPS.map((s, i) =>
    '<div class="forge-card" data-f="' + i + '">' +
    '<span class="fcico">' + ["✍️", "▶️", "🔧", "🔒", "📦"][i] + "</span>" +
    '<div class="fcn">' + esc(t("forge.s." + s)) + "</div></div>").join("");
}

async function runForge() {
  const need = ($("#forgeTarget").value || "a tool").trim();
  const log = $("#forgeLog");
  log.innerHTML = "";
  renderForgeStage();

  const lines = [
    ["key",  "forge.log.read", { n: 42 }],
    ["info", "forge.log.none", { s: need }],
    ["info", "forge.log.plan", { n: 4 }],
    ["info", "forge.log.write", { n: 186 }],
    ["warn", "forge.log.fail1", { n: 1 }],
    ["info", "forge.log.read2"],
    ["good", "forge.log.fix", { n: 3 }],
    ["good", "forge.log.pass", { n: 12 }],
    ["info", "forge.log.harden"],
    ["good", "forge.log.register", { s: need }]
  ];

  let stage = -1, n = 0;
  for (const [cls, key, params] of lines) {
    const line = document.createElement("div");
    line.className = "l-line " + cls;
    line.innerHTML = '<span class="ts">' + new Date().toISOString().slice(11, 19) + "</span>" +
                     '<span class="ag">FORGE</span><span class="tx">' + esc(fill(t(key), params)) + "</span>";
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    n++; $("#logCount").textContent = n + " " + t("rt.lines");

    if (n >= 3 && stage < 0) stage = 0;
    else if (n >= 4 && stage < 1) stage = 1;
    else if (n >= 5 && stage < 2) stage = 2;
    else if (n >= 9 && stage < 3) stage = 3;
    else if (n >= 10 && stage < 4) stage = 4;
    if (stage >= 0) {
      $$(".forge-card").forEach(c => {
        const i = +c.dataset.f;
        c.classList.toggle("on", i === stage);
        c.classList.toggle("ok", i < stage || cls === "good");
      });
    }
    await sleep(320 + Math.random() * 300);
  }
  $$(".forge-card").forEach(c => { c.classList.remove("on"); c.classList.add("ok"); });
}

/* ============================================================
   9. SECURITY SUITE
   ============================================================ */
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
function hex32(x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }
function le32(x) {
  x = x >>> 0;
  return (x & 255).toString(16).padStart(2, "0") + ((x >>> 8) & 255).toString(16).padStart(2, "0") +
         ((x >>> 16) & 255).toString(16).padStart(2, "0") + ((x >>> 24) & 255).toString(16).padStart(2, "0");
}
function padMsg(bytes, bigEndian) {
  const len = bytes.length, bitLen = len * 8, withOne = len + 1;
  const pad = (56 - (withOne % 64) + 64) % 64, total = withOne + pad + 8;
  const buf = new Uint8Array(total);
  buf.set(bytes, 0);
  buf[len] = 0x80;
  const hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
  // SHA-256 appends the length big-endian, MD5 little-endian.
  const order = bigEndian
    ? [[hi, 0], [lo, 4]]
    : [[lo, 0], [hi, 4]];
  order.forEach(function (pair) {
    const v = pair[0], base = total - 8 + pair[1];
    for (let i = 0; i < 4; i++) {
      buf[base + i] = (v >>> (bigEndian ? 8 * (3 - i) : 8 * i)) & 255;
    }
  });
  return buf;
}
const K256 = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function sha256js(bytes) {
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const buf = padMsg(bytes, true), w = new Uint32Array(64);
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = (buf[off+i*4]<<24)|(buf[off+i*4+1]<<16)|(buf[off+i*4+2]<<8)|buf[off+i*4+3];
    for (let i = 16; i < 64; i++) {
      const x = w[i-15], y = w[i-2];
      w[i] = (w[i-16] + (rotr(x,7)^rotr(x,18)^(x>>>3)) + w[i-7] + (rotr(y,17)^rotr(y,19)^(y>>>10))) >>> 0;
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e,6)^rotr(e,11)^rotr(e,25)) + ((e&f)^(~e&g)) + K256[i] + w[i]) >>> 0;
      const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
  }
  let out = ""; for (let j = 0; j < 8; j++) out += hex32(H[j]);
  return out;
}
const MD5_S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
const MD5_K = (function(){ const k = new Uint32Array(64);
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0; return k; })();
function md5js(bytes) {
  const buf = padMsg(bytes, false), M = new Uint32Array(16);
  let a0=0x67452301, b0=0xefcdab89, c0=0x98badcfe, d0=0x10325476;
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = buf[off+i*4] | (buf[off+i*4+1]<<8) | (buf[off+i*4+2]<<16) | (buf[off+i*4+3]<<24);
    let A=a0,B=b0,C=c0,D=d0;
    for (let i = 0; i < 64; i++) {
      let F,g;
      if (i<16)      { F=(B&C)|(~B&D); g=i; }
      else if (i<32) { F=(D&B)|(~D&C); g=(5*i+1)%16; }
      else if (i<48) { F=B^C^D;        g=(3*i+5)%16; }
      else           { F=C^(B|~D);     g=(7*i)%16; }
      F=(F+A+MD5_K[i]+M[g])>>>0; A=D; D=C; C=B;
      B=(B+((F<<MD5_S[i])|(F>>>(32-MD5_S[i]))))>>>0;
    }
    a0=(a0+A)>>>0; b0=(b0+B)>>>0; c0=(c0+C)>>>0; d0=(d0+D)>>>0;
  }
  return le32(a0)+le32(b0)+le32(c0)+le32(d0);
}
async function runEicar() {
  const out = $("#eicarOut");
  if (!out) return;
  out.innerHTML = "";
  const bytes = new TextEncoder().encode(EICAR);
  const toHex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
  async function sub(a) {
    try { return (!window.crypto || !crypto.subtle) ? null : toHex(await crypto.subtle.digest(a, bytes)); }
    catch (e) { return null; }
  }
  let sha = await sub("SHA-256"), md5 = await sub("MD-5");
  if (!sha) sha = sha256js(bytes);
  if (!md5) md5 = md5js(bytes);
  const b64 = btoa(Array.from(bytes).map(x => String.fromCharCode(x)).join(""));
  const kv = (k, v) => '<span class="k">' + esc(k) + '</span><span class="v">' + v + "</span>";
  out.innerHTML =
    '<div class="eicar-str">' + esc(EICAR) + "</div>" +
    '<div class="kv">' +
      kv(t("sec.k.string"), '<span style="color:var(--brand-2)">' + esc(EICAR) + "</span>") +
      kv(t("sec.k.bytes"), bytes.length + "") +
      kv(t("sec.k.sha"), '<span style="color:var(--brand-2)">' + esc(sha) + "</span>") +
      kv(t("sec.k.md5"), esc(md5)) +
      kv(t("sec.k.b64"), esc(b64)) +
    "</div>";
}

/* --- real static audit --- */
const RULES = [
  { sev: "high", k: "audit.f.secret",
    re: /(api[_-]?key|secret|passwd|password|token|access[_-]?key|client[_-]?secret)\s*[:=]\s*["'][^"'\n]{8,}["']/gi,
    fix: "Move the value to an environment variable or secret manager, and rotate the exposed credential." },
  { sev: "high", k: "audit.f.eval",
    re: /\beval\s*\(|\bexec\s*\(\s*["']|\bnew\s+Function\s*\(/g,
    fix: "Replace dynamic evaluation with an explicit parser or a dispatch table." },
  { sev: "high", k: "audit.f.shell",
    re: /os\.system\s*\(\s*(f["']|["'][^"']*["']\s*\+)|(?:subprocess\.(?:call|run|Popen)|check_output)\s*\([^)]*\+|shell\s*=\s*True\s*\)/g,
    fix: "Use subprocess with an argument list; never interpolate untrusted input into a command string." },
  { sev: "med",  k: "audit.f.tls",
    re: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|\s-k(\s|$)|--insecure/g,
    fix: "Keep certificate verification enabled; pin the expected certificate if you need strict control." },
  { sev: "med",  k: "audit.f.tmp",
    re: /\/tmp\/[A-Za-z0-9_.-]+|tempfile\.mktemp\s*\(/g,
    fix: "Use tempfile.mkstemp() or mkdtemp() so the path cannot be predicted or symlinked." },
  { sev: "low",  k: "audit.f.line",
    re: /^.{121,}$/gm,
    fix: "Split the line — long lines hide logic and defeat most linters and reviewers." }
];
const CLEAN_SAMPLE = `import os
import tempfile

def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return dict(line.split("=", 1) for line in handle if "=" in line)

def extract(archive: str) -> str:
    tmp = tempfile.mkdtemp(prefix="extract-")
    target = os.path.join(tmp, "payload")
    with open(target, "wb") as handle:
        handle.write(b"safe-bytes")
    return target`;
const DIRTY_SAMPLE = `password = "hunter2"
api_key = "sk-live-9f8a7b6c5d4e3f2a"

def run(cmd):
    os.system("tar czf out.tgz " + path)
    eval(payload)`;

function runAudit() {
  const src = ($("#auditInput") || {}).value || "";
  const out = $("#auditOut");
  if (!out) return;
  out.innerHTML = "";
  const findings = [];
  RULES.forEach(rule => {
    const re = new RegExp(rule.re.source, rule.re.flags);
    let m, guard = 0;
    while ((m = re.exec(src)) !== null && guard++ < 5) {
      findings.push({ sev: rule.sev, key: rule.k, fix: rule.fix, match: m[0] });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  });
  if (!findings.length) {
    out.innerHTML = '<div class="finding low"><div class="fh"><span class="sev">OK</span>' +
      '<span class="fn2">' + esc(t("audit.clean")) + "</span></div></div>";
    return;
  }
  findings.forEach(f => {
    const idx = src.indexOf(f.match);
    const line = src.slice(0, idx < 0 ? 0 : idx).split("\n").length || 1;
    const d = document.createElement("div");
    d.className = "finding " + f.sev;
    d.innerHTML =
      '<div class="fh"><span class="sev">' + esc(t("audit.sev." + f.sev)) + "</span>" +
      '<span class="fn2">' + esc(t(f.key)) + '</span><span class="fl">L' + line + "</span></div>" +
      '<div class="fx">' + esc(f.match.trim().slice(0, 170)) + "</div>" +
      '<div class="ffix">→ ' + esc(f.fix) + "</div>";
    out.appendChild(d);
  });
}


/* --- OSINT tools --- */
async function runOsint() {
  const target = ($("#osintTarget") || {}).value || "";
  const out = $("#osintOut"); if (!out) return;
  out.innerHTML = '<div class="note note-info">Scanning &hellip;</div>';
  await sleep(450);
  const handles = [target, target.replace(/\./g, ""), target + "_official", "the_" + target.split(".")[0]];
  const emails = ["contact@" + target, "admin@" + target, "press@" + target];
  const tag = (k, v) => '<span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + "</span>";
  out.innerHTML =
    '<div class="kv">' +
      tag("Target", target) +
      tag("Usernames found", handles.length + " (LinkedIn, X, GitHub, Reddit)") +
      tag("Email patterns", emails.join(", ")) +
      tag("Subdomains", "api." + target + ", blog." + target + ", cdn." + target) +
      tag("Images linked", "4 (2 re-used on 3 sites)") +
      tag("Risk score", "Medium") +
    "</div>" +
    '<div class="log-window"><div class="log-bar"><span class="tb-title">osint.log</span></div><div class="log-body">' +
    handles.map((h, i) => '<div class="log-line"><span class="ts">[' + String(i).padStart(2,"0") + ':00]</span><span class="lvl info">info</span><span class="msg">pivot ' + esc(h) + "</span></div>").join("") +
    '<div class="log-line"><span class="ts">[99:99]</span><span class="lvl ok">ok</span><span class="msg">done - ' + emails.length + ' addresses, ' + handles.length + ' identities</span></div>' +
    "</div></div>";
}

/* --- FinBot --- */
async function runFinbot() {
  const strat = ($("#finbotSelect") || {}).value || "momentum";
  const out = $("#finbotOut"); if (!out) return;
  out.innerHTML = '<div class="note note-warn">Running paper session &hellip;</div>';
  await sleep(600);
  const trades = Math.floor(12 + Math.random() * 30);
  const pnl = (Math.random() * 8 - 2).toFixed(2);
  const win = (50 + Math.random() * 25).toFixed(1);
  const dd = (Math.random() * 4).toFixed(2);
  out.innerHTML =
    '<div class="kv">' +
      '<span class="k">Strategy</span><span class="v">' + esc(strat) + '</span>' +
      '<span class="k">Trades</span><span class="v">' + trades + '</span>' +
      '<span class="k">Win rate</span><span class="v">' + win + '%</span>' +
      '<span class="k">Net PnL</span><span class="v" style="color:var(--brand-2)">' + pnl + '%</span>' +
      '<span class="k">Max drawdown</span><span class="v">' + dd + '%</span>' +
      '<span class="k">Status</span><span class="v">Paper only - no real orders</span>' +
    '</div>' +
    '<div class="log-window"><div class="log-bar"><span class="tb-title">finbot.log</span></div><div class="log-body">' +
    '<div class="log-line"><span class="ts">[00:00]</span><span class="lvl info">info</span><span class="msg">regime: trending</span></div>' +
    '<div class="log-line"><span class="ts">[00:01]</span><span class="lvl info">info</span><span class="msg">risk guard: max 2% per trade</span></div>' +
    '<div class="log-line"><span class="ts">[00:02]</span><span class="lvl ok">ok</span><span class="msg">session complete - full audit trail saved</span></div>' +
    '</div></div>';
}

/* --- AutoResearch Code --- */
async function runCode() {
  const repo = ($("#codeTarget") || {}).value || "";
  const q = ($("#codeQ") || {}).value || "";
  const out = $("#codeOut"); if (!out) return;
  out.innerHTML = '<div class="note note-info">Searching &hellip;</div>';
  await sleep(500);
  out.innerHTML =
    '<div class="log-window"><div class="log-bar"><span class="tb-title">code.log</span></div><div class="log-body">' +
    '<div class="log-line"><span class="ts">[00:00]</span><span class="lvl info">info</span><span class="msg">repo: ' + esc(repo) + '</span></div>' +
    '<div class="log-line"><span class="ts">[00:01]</span><span class="lvl info">info</span><span class="msg">question: ' + esc(q) + '</span></div>' +
    '<div class="log-line"><span class="ts">[00:02]</span><span class="lvl ok">ok</span><span class="msg">files scanned: 142, matches: 7</span></div>' +
    '</div></div>' +
    '<div class="audit-out" style="margin-top:12px">' +
    '<div class="finding low"><div class="fh"><span class="sev">ANSWER</span><span class="fn2">The plugin loader lives in src/plugin/loader.py and is called from boot() in src/main.py.</span></div><div class="ffix">Citation: loader.py:1-48, main.py:112-130. Suggested patch: register new plugins via plugins.json.</div></div>' +
    '</div>';
}

/* --- Pentest Trainer --- */
async function runPentest() {
  const drill = ($("#pentestSelect") || {}).value || "recon";
  const out = $("#pentestOut"); if (!out) return;
  out.innerHTML = '<div class="note note-safe">Starting drill &hellip;</div>';
  await sleep(500);
  const steps = {
    recon: ["Identify live hosts on your own subnet", "Run a service scan against your own host", "Read the output, no false positives"],
    web: ["Map forms and parameters", "Test one input for injection safely", "Review the WAF response"],
    privesc: ["Enumerate sudo and SUID", "Find a writable path", "Get root in the VM, never the host"]
  }[drill];
  out.innerHTML = '<div class="log-window"><div class="log-bar"><span class="tb-title">drill.log</span></div><div class="log-body">' +
    steps.map((s, i) => '<div class="log-line"><span class="ts">[' + String(i).padStart(2,"0") + ':00]</span><span class="lvl info">step</span><span class="msg">' + esc(s) + '</span></div>').join("") +
    '<div class="log-line"><span class="ts">[99:99]</span><span class="lvl ok">ok</span><span class="msg">score: 3/3 - debrief ready</span></div>' +
    '</div></div>';
}

/* ============================================================
   10. LEGAL
   ============================================================ */
const LEGAL = {
  terms: {
    en: ["Terms of sale","STORM-LX is sold as a digital download and delivered immediately after payment.<br><br>You receive a personal, non-exclusive, non-transferable licence for one user, on the number of devices you purchased. The product is delivered in compiled, obfuscated form; source code is not included. It exposes a plugin API and an interface builder. Redistribution, resale, decompilation or repackaging of the product — original or modified — is strictly prohibited.<br><br>The product is provided as-is, without warranty. To the maximum extent permitted by law, the author is not liable for indirect or consequential damages arising from use of the software, including data loss or loss of profit.<br><br>By purchasing, you confirm that you will use the software only on systems you own or for which you hold written authorisation."],
    fr: ["Conditions de vente","STORM-LX est vendu sous forme de téléchargement numérique et livré immédiatement après paiement.<br><br>Vous recevez une licence personnelle, non exclusive et non transférable pour un utilisateur, sur le nombre d'appareils achetés. Le produit est livré sous forme compilée et obfusquée ; le code source n'est pas inclus. Il expose une API de plugins et un constructeur d'interface. La redistribution, la revente, le décompilage ou le reconditionnement du produit — original ou modifié — sont strictement interdits.<br><br>Le produit est fourni tel quel, sans garantie. Dans la limite permise par la loi, l'auteur n'est pas responsable des dommages indirects ou consécutifs liés à l'usage du logiciel, y compris perte de données ou de profit.<br><br>En achetant, vous confirmez n'utiliser le logiciel que sur des systèmes que vous possédez ou pour lesquels vous détenez une autorisation écrite."],
    es: ["Condiciones de venta","STORM-LX se vende como descarga digital y se entrega inmediatamente tras el pago.<br><br>Recibes una licencia personal, no exclusiva ni transferible para un usuario, en los dispositivos que compres. El producto se entrega en forma compilada y ofuscada; no incluye el código fuente. Expone una API de plugins y un constructor de interfaz. La redistribución, reventa, descompilación o reempaquetado del producto — original o modificado — están estrictamente prohibidos.<br><br>El producto se entrega tal cual, sin garantía. En la medida máxima permitida por la ley, el autor no responde de daños indirectos o consecuentes derivados del uso del software, incluida la pérdida de datos o beneficios.<br><br>Al comprar confirmas que usarás el software solo en sistemas de tu propiedad o para los que tengas autorización por escrito."],
    de: ["Verkaufsbedingungen","STORM-LX wird als digitaler Download verkauft und sofort nach der Zahlung geliefert.<br><br>Sie erhalten eine persönliche, nicht ausschließliche, nicht übertragbare Lizenz für einen Benutzer auf der gekauften Anzahl Geräte. Das Produkt wird in kompilierter, obfuskierter Form geliefert; der Quellcode ist nicht enthalten. Es stellt eine Plugin-Schnittstelle und einen Oberflächen-Baukasten bereit. Weitergabe, Wiederverkauf, Dekompilieren oder Repaketieren des Produkts — original oder verändert — ist untersagt.<br><br>Das Produkt wird ohne Gewährleistung im Ist-Zustand geliefert. Soweit gesetzlich zulässig, haftet der Autor nicht für indirekte oder Folgeschäden aus der Nutzung, einschließlich Datenverlust oder entgangenem Gewinn.<br><br>Mit dem Kauf bestätigen Sie, die Software nur auf Systemen zu nutzen, die Ihnen gehören oder für die Sie eine schriftliche Genehmigung besitzen."],
    it: ["Condizioni di vendita","STORM-LX è venduto come download digitale e consegnato immediatamente dopo il pagamento.<br><br>Ricevi una licenza personale, non esclusiva e non trasferibile per un utente, sul numero di dispositivi acquistati. Il prodotto viene fornito in forma compilata e offuscata; il codice sorgente non è incluso. Espone un'API per i plugin e un costruttore di interfaccia. La ridistribuzione, la rivendita, il decompilazione o il repackaging del prodotto — originale o modificato — sono severamente vietati.<br><br>Il prodotto è fornito così com'è, senza garanzia. Nella misura massima consentita dalla legge, l'autore non è responsabile di danni indiretti o consequenti derivanti dall'uso del software, inclusa la perdita di dati o di profitto.<br><br>Acquistando confermi di utilizzare il software solo su sistemi di tua proprietà o per i quali possiedi un'autorizzazione scritta."],
    pt: ["Condições de venda","O STORM-LX é vendido como download digital e entregue imediatamente após o pagamento.<br><br>Recebes uma licença pessoal, não exclusiva e não transferível para um utilizador, no número de dispositivos comprados. O produto é entregue em forma compilada e ofuscada; o código-fonte não está incluído. Expõe uma API de plugins e um construtor de interface. A redistribuição, revenda, descompilação ou reempacotamento do produto — original ou modificado — são estritamente proibidos.<br><br>O produto é fornecido tal como está, sem garantia. Na máxima medida permitida por lei, o autor não responde por danos indirectos ou consequentes resultantes da utilização, incluindo perda de dados ou de lucro.<br><br>Ao comprar confirmas que usarás o software apenas em sistemas que te pertencem ou para os quais tens autorização escrita."],
    nl: ["Verkoopvoorwaarden","STORM-LX wordt verkocht als digitale download en direct na betaling geleverd.<br><br>Je ontvangt een persoonlijke, niet-exclusieve, niet-overdrachtelijke licentie voor één gebruiker, op het aantal apparaten dat je hebt gekocht. Het product wordt geleverd in gecompileerde, geobfusceerde vorm; broncode is niet inbegrepen. Het biedt een plugin-API en een interfacebouwer. Herverdeling, doorverkoop, decompilatie of herverpakking van het product — origineel of gewijzigd — is strikt verboden.<br><br>Het product wordt geleverd zoals het is, zonder garantie. In de maximale mate die de wet toestaat is de auteur niet aansprakelijk voor indirecte of gevolgschade door gebruik van de software, inclusief gegevensverlies of winstverlies.<br><br>Bij aankoop bevestig je dat je de software alleen gebruikt op systemen die je bezit of waarvoor je schriftelijke toestemming hebt."],
    ar: ["شروط البيع","يُباع STORM-LX كتنزيل رقمي ويُسلَّم فوراً بعد الدفع.<br><br>تحصل على رخصة شخصية وغير حصرية وغير قابلة للنقل لمستخدم واحد، على عدد الأجهزة التي تشتريها. يتضمن المنتج شيفرة مصدر Python كاملة وغير مقيّدة. يُمنع منعاً باتاً إعادة التوزيع أو إعادة البيع أو فك الترجمة أو إعادة التغليف — أصلياً أو بعد تعديله.<br><br>يُقدَّم المنتج كما هو دون ضمان. وفي الحد الأقصى الذي يسمح به القانون، لا يتحمل المؤلف مسؤولية أي أضرار غير مباشرة أو تبعية ناتجة عن الاستخدام، بما في ذلك فقدان البيانات أو الأرباح.<br><br>بشرائك تؤكد أنك ستستخدم البرنامج فقط على أنظمة تملكها أو تملك تخويلاً خطياً بها."],
    he: ["תנאי מכירה","‏STORM-LX נמכר כהורדה דיגיטלית ונמסר מיד לאחר התשלום.<br><br>‏אתה מקבל רישיון אישי, לא בלעדי ולא ניתן להעברה עבור משתמש אחד, במספר המכשירים שרכשת. המוצר כולל קוד מקור Python מלא ולא מוגבל. הפצה מחדש, מכירה חוזרת, פירוק או אריזה מחדש של המוצר — מקורי או משונה — אסורים בתכלית.<br><br>‏המוצר מסופק כמות שהוא, ללא אחריות. ככל האפשר לפי החוק, המחבר אינו אחראי לנזקים עקיפים או נובעים הנובעים משימוש בתוכנה, לרבות אובדן נתונים או הפסד רווח.<br><br>‏רכישה מאשרת שתשתמש בתוכנה רק במערכות שבבעלותך או שיש לך הרשאה כתובה לבדוק בהן."],
    hi: ["बिक्री की शर्तें","STORM-LX एक डिजिटल डाउनलोड के रूप में बेचा जाता है और भुगतान के तुरंत बाद भेज दिया जाता है।<br><br>आपको एक व्यक्तिगत, गैर-विशिष्ट, गैर-हस्तांतरणीय लाइसेंस मिलता है, उसी संख्या के उपकरणों के लिए जो आपने खरीदे हैं। उत्पाद में पूर्ण, अप्रतिबंधित Python स्रोत कोड शामिल है। उत्पाद का पुनर्वितरण, पुनर्विक्रय, डीकंपाइलिंग या पुनः पैकेजिंग — मूल या संशोधित — सख्ती से निषिद्ध है।<br><br>उत्पाद ज्यों का त्यों दिया जाता है, बिना वारंटी के। कानून की अनुमति अधिकतम सीमा तक, लेखक सॉफ़्टवेयर के उपयोग से उत्पन्न अप्रत्यक्ष या परिणामी क्षतियों के लिए जिम्मेदार नहीं है, जिसमें डेटा हानि या लाभ हानि शामिल है।<br><br>खरीद करके आप पुष्टि करते हैं कि आप इस सॉफ़्टवेयर का उपयोग केवल उन प्रणालियों पर करेंगे जो आपकी हैं या जिनके लिए आपके पास लिखित प्राधिकार है।"],
    id: ["Ketentuan penjualan","STORM-LX dijual sebagai unduhan digital dan dikirimkan segera setelah pembayaran.<br><br>Anda memperoleh lisensi pribadi, non-eksklusif, dan tidak dapat dialihkan untuk satu pengguna, pada jumlah perangkat yang Anda beli. Produk ini menyertakan kode sumber Python lengkap dan tanpa batasan. Distribusi ulang, penjualan kembali, dekompilasi, atau pengemasan ulang produk — asli atau dimodifikasi — dilarang keras.<br><br>Produk disediakan sebagaimana adanya, tanpa jaminan. sejauh diizinkan oleh hukum, penulis tidak bertanggung jawab atas kerugian tidak langsung atau konsekuensi yang timbul dari penggunaan perangkat lunak, termasuk kehilangan data atau keuntungan.<br><br>Dengan membeli, Anda mengonfirmasi bahwa Anda hanya akan menggunakan perangkat lunak ini pada sistem yang Anda miliki atau yang Anda miliki izin tertulis untuk mengujinya."],
    ru: ["Условия продажи","STORM-LX продаётся как цифровая загрузка и доставляется сразу после оплаты.<br><br>Вы получаете личную, неисключительную непередаваемую лицензию для одного пользователя на количество приобретённых устройств. Продукт поставляется в скомпилированном, обфусцированном виде; исходный код не входит. Он предоставляет API плагинов и конструктор интерфейса. Перераспределение, перепродажа, декомпиляция или перепаковка продукта — оригинального или изменённого — строго запрещены.<br><br>Продукт предоставляется «как есть», без гарантий. В максимально допустимой законом мере автор не несёт ответственности за косвенные или последующие убытки, возникшие в результате использования программного обеспечения, включая потерю данных или прибыли.<br><br>Покупая продукт, вы подтверждаете, что будете использовать его только на системах, принадлежащих вам, или на системах, для которых у вас есть письменное разрешение."],
    zh: ["销售条款","STORM-LX 以数字下载形式销售，付款后立即交付。<br><br>您获得个人、非独占、不可转让的许可，仅限一位用户在你所购买的设备数量上使用。本产品以编译混淆形式交付，不包含源代码。它开放插件 API 与界面构建器。禁止以原始或修改后的形式对本产品进行再分发、转售、反编译或重新打包。<br><br>本产品按现状提供，不附带担保。在法律允许的最大范围内，作者不对因使用本软件而产生的间接或后果性损害承担责任，包括数据丢失或利润损失。<br><br>购买即表示你确认，仅在你自己拥有或已获得书面授权的系统上使用本软件。"],
    ja: ["販売条件","STORM-LX はデジタルダウンロードとして販売し、支払い後まもなく納品されます。<br><br>あなたは、購入したデバイス数に対して、1 ユーザー分の個人・非独占・譲渡不可のライセンスを取得します。製品には完全かつ制限のない Python ソースコードが含まれます。製品（オリジナルまたは改変品）の再配布、再販売、デコンパイル、再パッケージングは固���禁止されています。<br><br>本製品は現状のまま提供され、保証はありません。法律が許容する範囲の最大において、作者は、データの損失や利益の損失を含む、ソフトウェアの使用に起因する間接的または結果的損害について責任を負いません。<br><br>購入により、本ソフトウェアを自分が所有するシステム、または書面の許可を得たシステムでのみ使用することを確認したものとみなされます。"],
    ko: ["판매 조건","STORM-LX는 디지털 다운로드로 판매되며 결제 후 즉시 제공됩니다.<br><br>귀하는 개인적이고 독점적이지 않으며 양도할 수 없는 라이선스를 한 사용자에게, 구매한 기기 수에 한해 제공받습니다. 제품에는 완전하고 제한 없는 Python 소스 코드가 포함됩니다. 제품의 재배포, 재판매, 디컴파일 또는 재패키징 — 원본 또는 수정본 모두 — 은 엄격히 금지됩니다.<br><br>제품은 있는 그대로 제공되며 보증은 없습니다. 법률이 허용하는 최대 범위에서 작성자는 소프트웨어 사용으로 인해 발생한 간접적 또는 결과적 손해, 데이터 손실이나 이익 손실을 포함하여 책임지지 않습니다.<br><br>구매를 통해 귀하는 본 소프트웨어를 자신이 소유한 시스템 또는 서면으로 허가를 받은 시스템에서만 사용함을 확인합니다."]
  },
  refund: {
    en: ["Refund policy","Send one email from the address used for the purchase. Approved refunds are returned to the original payment method within 5 business days. Platform fees already charged to the seller may not be recoverable.<br><br>Because the product is a compiled digital download, the sale is normally final once the download has been accessed."],
    fr: ["Politique de remboursement","Envoyez un e-mail depuis l'adresse utilisée pour l'achat. Les remboursements approuvés sont reversés sur le moyen de paiement d'origine sous 5 jours ouvrés. Les frais de plateforme déjà débités au vendeur peuvent ne pas être récupérables.<br><br>Le produit étant un téléchargement numérique incluant le code source, la vente est normalement définitive une fois le fichier consulté."],
    es: ["Política de reembolso","Envía un correo desde la dirección usada en la compra. Los reembolsos aprobados se devuelven al método de pago original en 5 días laborables. Las comisiones de plataforma ya cobradas al vendedor pueden no ser recuperables.<br><br>Al ser el producto una descarga digital compilada, la venta es normalmente firme una vez accedido al archivo."],
    de: ["Rückerstattungsrichtlinie","Senden Sie eine E-Mail von der beim Kauf genutzten Adresse. Genehmigte Rückerstattungen werden innerhalb von 5 Werktagen auf das ursprüngliche Zahlungsmittel zurückgebucht. Bereits dem Verkäufer belastete Plattformgebühren sind unter Umständen nicht erstattungsfähig.<br><br>Da es sich um einen kompilierten digitalen Download handelt, ist der Kauf mit dem Zugriff auf die Datei normalerweise abgeschlossen."],
    it: ["Informativa sui rimborsi","Invia un'email dall'indirizzo usato per l'acquisto. I rimborsi approvati vengono restituiti sul metodo di pagamento originale entro 5 giorni lavorativi. Le commissioni della piattaforma già addebitate al venditore potrebbero non essere recuperabili.<br><br>Poiché il prodotto è un download digitale compilato, la vendita è normalmente definitiva una volta scaricato il file."],
    pt: ["Política de reembolso","Envie um e-mail a partir do endereço usado na compra. Os reembolsos aprovados são devolvidos ao método de pagamento original em 5 dias úteis. As comissões de plataforma já cobradas ao vendedor podem não ser recuperáveis.<br><br>Sendo o produto um download digital que inclui o código-fonte, a venda é normalmente final depois de aceder ao ficheiro."],
    nl: ["Terugbetalingsbeleid","Stuur één e-mail vanaf het adres dat bij de aankoop is gebruikt. Goedgekeurde terugbetalingen worden binnen 5 werkdagen teruggestort op de oorspronkelijke betaalmethode. Platformkosten die al aan de verkoper zijn doorberekend, kunnen niet terugvorderbaar zijn.<br><br>Omdat het product een gecompileerde digitale download is, is de verkoop normaal definitief zodra het bestand is gedownload."],
    ar: ["سياسة الاسترداد","أرسل بريداً إلكترونياً من العنوان المستخدم في الشراء. تُعاد المبالغ المعتمدة إلى وسيلة الدفع الأصلية خلال 5 أيام عمل. قد لا يكون بالإمكان استرداد رسوم المنصة التي خُصمت من البائع.<br><br>ولأن المنتج تنزيل رقمي يتضمن شيفرة المصدر، فإن البيع يصبح نهائياً عادةً بمجرد الوصول إلى الملف."],
    he: ["מדיניות החזרים","שלח דוא\"ל אחד מהכתובת ששימשה לרכישה. החזרים מאושרים מוחזרים לאמצעי התשלום המקורי תוך 5 ימי עסקים. דמי פלטפורמה שכבר חויבו בערך המוכר עשויים שלא להיות ניתנים לשיבוש.<br><br>מכיוון שהמוצר הוא הורדה דיגיטלית הכוללת קוד מקור, המכירה היא סופית בדרך כלל עם הגישה לקובץ."],
    hi: ["रिफंड नीति","खरीद के समय उपयोग किए गए पते से एक ईमेल भेजें। स्वीकृत रिफंड 5 कार्यदिवसों के भीतर मूल भुगतान विधि में वापस कर दिए जाते हैं। विक्रेता से पहले ही कटौती गई प्लेटफ़ॉर्म शुल्क वापस नहीं मिल सकते।<br><br>चूँकि उत्पाद स्रोत कोड सहित एक डिजिटल डाउनलोड है, इसलिए फ़ाइल तक पहुँचने के बाद बिक्री सामान्यतः अंतिम मानी जाती है।"],
    id: ["Kebijakan pengembalian dana","Kirim satu email dari alamat yang digunakan untuk pembelian. Pengembalian yang disetujui dikembalikan ke metode pembayaran asli dalam 5 hari kerja. Biaya platform yang sudah dibebankan kepada penjual mungkin tidak dapat dikembalikan.<br><br>Karena produk ini adalah unduhan digital yang menyertakan kode sumber, penjualan umumnya bersifat final setelah berkas diunduh."],
    ru: ["Политика возврата","Отправьте одно письмо с адреса, использованного при покупке. Одобренные возвраты перечисляются на исходный способ оплаты в течение 5 рабочих дней. Комиссии платформы, уже удержанные с продавца, могут быть невозвратимы.<br><br>Поскольку продукт представляет собой скомпилированную цифровую загрузку, продажа считается окончательной после доступа к файлу."],
    zh: ["退款政策","请使用购买时所用的邮箱发送一封邮件。获批的退款将在 5 个工作日内原路退回。已向卖家收取的平台手续费可能无法退还。<br><br>由于本产品为已编译的数字下载，一旦访问下载文件，销售通常即视为完成。"],
    ja: ["返金ポリシー","購入時に使用したアドレスからメールを 1 通送信してください。承認された返金は、5 営業日以内に元のお支払い方法へ返金されます。販売者に既に課されたプラットフォーム手数料は返金されない場合があります。<br><br>本製品はソースコードを含むデジタルダウンロードのため、ファイルの取得時点で販売は原則として完了となります。"],
    ko: ["환불 정책","구매 시 사용한 주소에서 이메일 한 통을 보내주십시오. 승인된 환불은 영업일 기준 5일 이내에 원래 결제 수단으로 반환됩니다. 판매자에게 이미 부과된 플랫폼 수수료는 환불되지 않을 수 있습니다.<br><br>본 제품은 소스 코드를 포함한 디지털 다운로드이므로 파일에 접근하는 순간 판매가 원칙적으로 완료됩니다."]
  },
  use: {
    en: ["Authorised use only","STORM-LX is a productivity and automation platform. It ships with modules that interact with your operating system, your files and the network.<br><br>You must only use it on systems that you own, or on systems for which you hold explicit written authorisation from the system owner. Using it against third-party systems without authorisation may be illegal under computer-misuse and data-protection laws in your country, and may expose you to civil and criminal liability.<br><br>The security suite generates EICAR test vectors for validating your own defences. The EICAR string contains no malicious code and exists specifically to be safe — but even so, deploy it only where you are authorised to test."],
    fr: ["Usage autorisé uniquement","STORM-LX est une plateforme de productivité et d'automatisation. Elle contient des modules qui interagissent avec votre système d'exploitation, vos fichiers et le réseau.<br><br>Vous ne devez l'utiliser que sur des systèmes que vous possédez, ou pour lesquels vous détenez une autorisation écrite explicite du propriétaire. L'utiliser contre des systèmes tiers sans autorisation peut être illégal selon la législation sur la cybercriminalité et la protection des données, et vous exposer à une responsabilité civile et pénale.<br><br>La suite de sécurité génère des vecteurs EICAR pour valider vos propres défenses. La chaîne EICAR ne contient aucun code malveillant et existe précisément pour être sûre — mais même ainsi, ne la déployez que là où vous êtes autorisé à tester."],
    es: ["Solo uso autorizado","STORM-LX es una plataforma de productividad y automatización. Incluye módulos que interactúan con tu sistema operativo, tus archivos y la red.<br><br>Solo debes usarlo en sistemas de tu propiedad o para los que tengas autorización escrita explícita del propietario. Usarlo contra sistemas de terceros sin autorización puede ser ilegal según la legislación sobre ciberdelitos y protección de datos, y exponerte a responsabilidad civil y penal.<br><br>La suite de seguridad genera vectores EICAR para validar tus propias defensas. La cadena EICAR no contiene código malicioso y existe precisamente para ser segura — aun así, despliega solo donde tengas autorización para probar."],
    de: ["Nur mit Genehmigung","STORM-LX ist eine Produktivitäts- und Automatisierungsplattform. Sie enthält Module, die mit Ihrem Betriebssystem, Ihren Dateien und dem Netzwerk interagieren.<br><br>Sie dürfen sie nur auf Systemen einsetzen, die Ihnen gehören, oder für die Sie eine ausdrückliche schriftliche Genehmigung des Eigentümers besitzen. Der Einsatz gegen Drittsysteme ohne Genehmigung kann nach den Cyberstraf- und Datenschutzgesetzen Ihres Landes strafbar sein und Sie civil- und strafrechtlich haften.<br><br>Die Security Suite erzeugt EICAR-Testvektoren zur Validierung Ihrer eigenen Verteidigung. Die EICAR-Zeichenfolge enthält keinen Schadcode und existiert gerade wegen ihrer Harmlosigkeit — deployen Sie sie dennoch nur dort, wo Sie testen dürfen."],
    it: ["Solo uso autorizzato","STORM-LX è una piattaforma di produttività e automazione. Include moduli che interagiscono con il tuo sistema operativo, i tuoi file e la rete.<br><br>Devi usarlo solo su sistemi di tua proprietà o per i quali possiedi un'autorizzazione scritta esplicita del proprietario. Utilizzarlo contro sistemi di terzi senza autorizzazione può essere illegale secondo la normativa su cibercrimini e protezione dei dati, esponendoti a responsabilità civile e penale.<br><br>La suite di sicurezza genera vettori EICAR per convalidare le tue difese. La stringa EICAR non contiene codice malevolo ed esiste proprio per essere sicura — anche così, distribuiscila solo dove sei autorizzato a testare."],
    pt: ["Apenas uso autorizado","O STORM-LX é uma plataforma de produtividade e automatização. Inclui módulos que interagem com o teu sistema operativo, os teus ficheiros e a rede.<br><br>Só deves usá-lo em sistemas que te pertencem ou para os quais tenhas autorização escrita explícita do proprietário. Usá-lo contra sistemas de terceiros sem autorização pode ser ilegal segundo a legislação sobre cibercrime e proteção de dados, expondo-te a responsabilidade civil e penal.<br><br>A suíte de segurança gera vetores EICAR para validar as tuas próprias defesas. A cadeia EICAR não contém código malicioso e existe precisamente por ser segura — mesmo assim, implementa apenas onde tenhas autorização para testar."],
    nl: ["Alleen geautoriseerd gebruik","STORM-LX is een productiviteits- en automatiseringsplatform. Het bevat modules die communiceren met je besturingssysteem, je bestanden en het netwerk.<br><br>Je mag het alleen gebruiken op systemen die je bezit, of waarvoor je expliciete schriftelijke toestemming van de eigenaar hebt. Gebruik tegen systemen van derden zonder toestemming kan volgens de wetgeving over computercriminaliteit en gegevensbescherming verboden zijn, met civiel en strafrechtelijk risico.<br><br>De beveiligingssuite genereert EICAR-testvectoren om je eigen verdediging te valideren. De EICAR-tekenreeks bevat geen schadelijke code en bestaat juist om veilig te zijn — deploy hem toch alleen waar je mag testen."],
    ar: ["الاستخدام المصرّح به فقط","STORM-LX منصة إنتاجية وأتمتة. تحتوي على وحدات تتفاعل مع نظام التشغيل والملفات والشبكة.<br><br>يجب ألا تستخدمها إلا على أنظمة تملكها، أو على أنظمة تملك تخويلاً خطياً صريحاً من المالك. استخدامها ضد أنظمة الغير دون تخويل قد يكون غير قانوني وفق قوانين الجرائم الإلكترونية وحماية البيانات في بلدك، وقد يعرّضك للمسؤولية المدنية والجنائية.<br><br>تولّد مجموعة الأمان متجهات EICAR للتحقق من دفاعاتك الخاصة. سلسلة EICAR لا تحتوي شيفرة ضارية وهي موجودة تحديداً لكونها آمنة — ومع ذلك فلا تزرعها إلا في الأماكن التي تملك فيها تخويلاً للاختبار."],
    he: ["שימוש מורשה בלבד","‏STORM-LX הוא פלטפורמת פרודוקטיביות ואוטומציה. הוא כולל מודולים המתקשרים למערכת ההפעלה, לקבצים שלך ולרשת.<br><br>מותר להשתמש בו רק במערכות שבבעלותך, או במערכות שיש לך עליהן הרשאה כתובה מפורשת מבעל המערכת. שימוש במערכות של צד שלישי ללא הרשאה עלול להיות חוקי לפי חוקי הפשע המחשבי והגנת המידע במדינתך, ולחשוף אותך לאחריות אזרחית ופלילית.<br><br>‏חבילת האבטחה מפיקה וקטורי בדיקה מסוג EICAR לאימות ההגנות שלך עצמך. מחרוזת EICAR אינה מכילה קוד זהיר וקיימת דווקא כדי להיות בטוחה — אך גם כך, פרוס אותה רק במקומות שבהם מותר לך לבדוק."],
    hi: ["केवल अधिकृत उपयोग","STORM-LX एक उत्पादकता और स्वचालन प्लेटफ़ॉर्म है। इसमें ऐसे मॉड्यूल शामिल हैं जो आपके ऑपरेटिंग सिस्टम, फ़ाइलों और नेटवर्क से संपर्क करते हैं।<br><br>आपको इसे केवल उन प्रणालियों पर उपयोग करना चाहिए जो आपकी हैं, या जिनके लिए आपके पास स्वामी से स्पष्ट लिखित प्राधिकार है। बिना प्राधिकार के किसी तीसरे पक्ष की प्रणाली पर इसका उपयोग आपके देश के साइबर अपराध और डेटा संरक्षण कानूनों के तहत अवैध हो सकता है और आपको दीवानी एवं फ़ौजदारी ज़िम्मेदारी में डाल सकता है।<br><br>सुरक्षा सूट आपके अपने सुरक्षा-मूल्यांकन के लिए EICAR परीक्षण वेक्टर बनाता है। EICAR स्ट्रिंग में कोई दुर्भावनापूर्ण कोड नहीं होता और यह ठीक सुरक्षित रहने के लिए ही मौजूद है — फिर भी, इसे केवल वहीं पर लगाएँ जहाँ आपको परीक्षण की अनुमति है।"],
    id: ["Hanya penggunaan yang diizinkan","STORM-LX adalah platform produktivitas dan otomatisasi yang berisi modul yang berinteraksi dengan sistem operasi, berkas, dan jaringan Anda.<br><br>Anda hanya boleh menggunakannya pada sistem yang Anda miliki, atau sistem yang Anda miliki izin tertulis eksplisit dari pemiliknya. Menggunakannya terhadap sistem pihak ketiga tanpa izin dapat ilegal menurut hukum kepolisian komputer dan perlindungan data di negara Anda, serta dapat menempatkan Anda pada tanggung jawab sipil dan pidana.<br><br>Suite keamanan menghasilkan vektor uji EICAR untuk memvalidasi pertahanan Anda sendiri. Rangkaian EICAR tidak mengandung kode berbahaya dan ada justru agar aman — meski begitu, gunakan hanya di tempat Anda berwenang mengujinya."],
    ru: ["Только авторизованное использование","STORM-LX — платформа для продуктивности и автоматизации. В неё входят модули, взаимодействующие с вашей операционной системой, файлами и сетью.<br><br>Вы должны использовать её только на системах, принадлежащих вам, либо на системах, для которых у вас есть явное письменное разрешение владельца. Использование против чужих систем без разрешения может быть незаконным по законодательству о киберпреступности и защите данных в вашей стране и повлечь гражданскую и уголовную ответственность.<br><br>Пакет безопасности создаёт тестовые векторы EICAR для проверки вашей собственной защиты. Строка EICAR не содержит вредоносного кода и существует именно потому, что безопасна — но всё же применяйте её только там, где вам разрешено тестирование."],
    zh: ["仅限授权使用","STORM-LX 是一个生产力与自动化平台，其中包含会与你的操作系统、文件及网络交互的模块。<br><br>你只能将其用于自己拥有的系统，或你已获得系统所有者明确书面授权的系统。未经授权将其用于第三方系统，可能违反你所在国家的计算机滥用与数据保护法律，并使你承担民事与刑事责任。<br><br>安全套件会生成 EICAR 测试向量以验证你自己的防御。EICAR 字符串不包含任何恶意代码，正是因为无害才被设计出来 —— 即便如此，也请仅在你被授权测试的系统中部署它。"],
    ja: ["認可された使用のみ","STORM-LX は生産性・自動化プラットフォームです。オペレーティングシステム、ファイル、ネットワークと相互作用するモジュールを搭載しています。<br><br>使用できるのは、自分が所有するシステム、または所有者の明示的な書面の許可 mentahシステムのみです。許可なく第三者のシステムに対して使用すると、お住まいの地域の不正アクセス禁止や個人情報保護に関する法律に抵触し、民事・刑事上の責任を負う可能性があります。<br><br>セキュリティスイートは、EICAR テストベクターを生成して防御機能を検証します。EICAR 文字列には悪意あるコードは含まれておらず、そもそも安全であるために存在しています — それでもなお、テストが許可された環境でのみ使用してください。"],
    ko: ["인가된 사용만 허용됩니다","STORM-LX는 생산성 및 자동화 플랫폼으로, 운영체제·파일·네트워크와 상호작용하는 모듈을 포함합니다.<br><br>본인이 소유한 시스템 또는 소유자의 명시적인 서면 허가를 받은 시스템에서만 사용해야 합니다. 허가 없이 타인의 시스템에 사용하면 해당국의 사이버범죄 및 개인정보 보호 법률을 위반할 수 있으며 민사·형사 책임을 질 수 있습니다.<br><br>보안 스위트는 자체 방어를 검증하기 위한 EICAR 테스트 벡터를 생성합니다. EICAR 문자열에는 악성 코드가 없으며 애초에 안전하도록 만들어졌습니다 — 그럼에도 테스트가 허용된 환경에서만 배포하십시오."]
  }
};

/* ============================================================
   11. RENDERERS
   ============================================================ */
function renderModules() {
  const g = $("#modGrid"); if (!g) return;
  g.innerHTML = "";
  MODULES.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = "mod";
    d.style.animation = "fade .3s " + (i * 55) + "ms both";
    d.innerHTML = '<span class="ico">' + m.ico + "</span><h3>" + esc(t(m.k)) + "</h3><p>" + esc(t(m.d)) + "</p>";
    g.appendChild(d);
  });
}
function renderFaq() {
  const l = $("#faqList"); if (!l) return;
  l.innerHTML = "";
  FAQ_KEYS.forEach(pair => {
    const item = document.createElement("div");
    item.className = "faq-item";
    item.innerHTML =
      '<button class="faq-q" type="button" aria-expanded="false">' +
        "<span>" + esc(t(pair[0])) + '</span><span class="chev">+</span></button>' +
      '<div class="faq-a"><div>' + esc(t(pair[1])) + "</div></div>";
    l.appendChild(item);
  });
}
function openLegal(key) {
  const set = LEGAL[key][LANG] || LEGAL[key].en;
  $("#legalModal").hidden = false;
  $("#modalTitle").textContent = set[0];
  $("#modalBody").innerHTML = set[1];
  document.body.style.overflow = "hidden";
  $("#modalClose").focus();
}
function closeLegal() {
  $("#legalModal").hidden = true;
  document.body.style.overflow = "";
}

/* ============================================================
   12. LANGUAGE MENU
   ============================================================ */
function buildLangMenu() {
  const menu = $("#langMenu");
  const list = Object.keys(window.LANG_META);
  menu.innerHTML = list.map(code => {
    const m = window.LANG_META[code];
    return '<button type="button" role="menuitem" data-lang="' + code + '">' +
           '<span class="flag">' + m.flag + "</span>" +
           "<span>" + esc(m.name) + "</span></button>";
  }).join("") +
  '<div class="langdd-note" id="langNote"></div>';
  updateLangNote();
  menu.addEventListener("click", e => {
    const b = e.target.closest("button[data-lang]");
    if (!b) return;
    setLang(b.dataset.lang);
    closeLang();
  });
}
function updateLangNote() {
  const el = $("#langNote");
  if (el) el.textContent = t("lang.note");
}
function openLang() {
  $("#langMenu").hidden = false;
  $("#langDD").classList.add("open");
  $("#langBtn").setAttribute("aria-expanded", "true");
}
function closeLang() {
  $("#langMenu").hidden = true;
  $("#langDD").classList.remove("open");
  $("#langBtn").setAttribute("aria-expanded", "false");
}

/* ============================================================
   13. WIRING
   ============================================================ */
function wire() {
  $("#langBtn").addEventListener("click", e => {
    e.stopPropagation();
    $("#langMenu").hidden ? openLang() : closeLang();
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#langDD")) closeLang();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeLang(); closeLegal(); }
  });

  $$("#demoTabs .tab").forEach(tab => tab.addEventListener("click", () => {
    $$("#demoTabs .tab").forEach(x => x.classList.remove("active"));
    $$(".panel").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    const p = $("#panel-" + tab.dataset.tab);
    if (p) p.classList.add("active");
    if (tab.dataset.tab === "security" && !ST.tabs.security) { ST.tabs.security = true; runEicar(); runAudit(); }
    if (tab.dataset.tab === "media" && !ST.tabs.media) { ST.tabs.media = true; runMedia(); }
    if (tab.dataset.tab === "forge") renderForgeStage();
  }));

  $("#runCouncil").addEventListener("click", runCouncil);
  $("#runResearch").addEventListener("click", runResearch);
  $("#runMedia").addEventListener("click", runMedia);
  $("#speakMedia").addEventListener("click", speakMedia);
  $("#stopMedia").addEventListener("click", stopMedia);
  $("#mediaSample").addEventListener("click", () => {
    const input = $("#mediaInput");
    input.value = MEDIA_SAMPLE;
    const lang = (window.LANG_META[LANG] || {}).speech || "en-GB";
    if (LANG !== "en") input.value = t("media.sampleText");
    input.lang = lang;
    runMedia();
  });
  $("#runForge").addEventListener("click", runForge);
  $("#runEicar").addEventListener("click", runEicar);
  $("#runAudit").addEventListener("click", runAudit);
  $("#runOsint").addEventListener("click", runOsint);
  $("#runFinbot").addEventListener("click", runFinbot);
  $("#runCode").addEventListener("click", runCode);
  $("#runPentest").addEventListener("click", runPentest);

  $("#faqList").addEventListener("click", e => {
    const q = e.target.closest(".faq-q"); if (!q) return;
    const item = q.parentElement, ans = item.querySelector(".faq-a");
    const wasOpen = item.classList.contains("open");
    $$(".faq-item").forEach(i => {
      i.classList.remove("open");
      i.querySelector(".faq-a").style.maxHeight = null;
      i.querySelector(".faq-q").setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) { item.classList.add("open"); ans.style.maxHeight = ans.scrollHeight + "px"; q.setAttribute("aria-expanded", "true"); }
  });

  $$("[data-legal]").forEach(a => a.addEventListener("click", ev => { ev.preventDefault(); openLegal(a.dataset.legal); }));
  $("#modalClose").addEventListener("click", closeLegal);
  $("#legalModal").addEventListener("click", e => { if (e.target.id === "legalModal") closeLegal(); });

  $("#burger").addEventListener("click", () => {
    const n = $("#nav"), open = n.classList.toggle("open");
    $("#burger").setAttribute("aria-expanded", open ? "true" : "false");
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => $("#nav").classList.remove("open")));

  // seed
  $("#auditInput").value = DIRTY_SAMPLE;
  $("#mediaInput").value = LANG === "en" ? MEDIA_SAMPLE : t("media.sampleText");
  runAudit();
  renderForgeStage();
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
}

/* ============================================================
   14. BOOT
   ============================================================ */
function boot() {
  const q = new URL(location.href).searchParams.get("lang");
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  let saved = null;
  try { saved = localStorage.getItem("slx-lang"); } catch (e) {}
  LANG = (q && window.I18N[q]) ? q
       : (saved && window.I18N[saved]) ? saved
       : (window.I18N[nav] ? nav : "en");

  buildLangMenu();
  wire();
  applyI18n();
  heroTerm();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

})();