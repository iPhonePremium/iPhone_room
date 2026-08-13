
const $ = s => document.querySelector(s);
let sanity = 100;
const originalTitle = document.title;
let audioCtx = null, noiseNode = null, droneGain = null;

// ==========================================
// 1. Web Audio API 音響シンセサイザー (暗黒BGM & 心音)
// ==========================================
function initHorrorAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  // 低音ドローン
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  droneGain = audioCtx.createGain();

  droneGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(50, audioCtx.currentTime);
  osc2.type = 'sine'; osc2.frequency.setValueAtTime(53, audioCtx.currentTime);

  filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, audioCtx.currentTime);

  osc1.connect(filter); osc2.connect(filter);
  filter.connect(droneGain); droneGain.connect(audioCtx.destination);
  osc1.start(); osc2.start();

  // 心音リズム
  setInterval(() => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    const beat = audioCtx.createOscillator();
    const bGain = audioCtx.createGain();
    beat.type = 'sine';
    beat.frequency.setValueAtTime(65, now);
    beat.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    bGain.gain.setValueAtTime(0.2, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    beat.connect(bGain); bGain.connect(audioCtx.destination);
    beat.start(now); beat.stop(now + 0.2);
  }, 1200);
}

// 起動画面タップで音響とジャイロを解放
$("#bootScreen").onclick = () => {
  initHorrorAudio();
  if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  $("#bootScreen").style.opacity = "0";
  setTimeout(() => $("#bootScreen").remove(), 800);
};

// ==========================================
// 2. キャンバス軽量ノイズアニメーション
// ==========================================
const noiseCanvas = $("#noiseCanvas");
const nCtx = noiseCanvas.getContext('2d');
function resizeNoise() {
  noiseCanvas.width = window.innerWidth / 2;
  noiseCanvas.height = window.innerHeight / 2;
}
resizeNoise();
window.onresize = resizeNoise;

function drawNoise() {
  if (!nCtx) return;
  const w = noiseCanvas.width, h = noiseCanvas.height;
  const id = nCtx.createImageData(w, h);
  const buf = new Uint32Array(id.data.buffer);
  for(let i=0; i<buf.length; i++) {
    if(Math.random() < 0.12) buf[i] = 0xffffffff;
  }
  nCtx.putImageData(id, 0, 0);
  requestAnimationFrame(drawNoise);
}
requestAnimationFrame(drawNoise);

// ==========================================
// 3. SAN値管理 & 崩壊システム
// ==========================================
function updateSan(n) {
  sanity = Math.max(0, Math.min(100, n));
  $("#sanFill").style.width = sanity + "%";
  $("#sanVal").textContent = sanity + "%";
  if (sanity <= 50 && !insane) corruptTexts();
  if (sanity <= 0 && !insane) startInsanity();
}

// スクロールプログレス & ランダムブラックアウト
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  $("#progress").style.width = (scrollY / Math.max(1, max) * 100) + "%";
  if (!insane && Math.random() < 0.003) triggerBlackout();
});

function triggerBlackout() {
  const b = $("#blackout");
  b.style.opacity = 1; b.querySelector("span").style.opacity = 1;
  setTimeout(() => { b.style.opacity = 0; b.querySelector("span").style.opacity = 0; }, 120);
  updateSan(sanity - 8);
}

// タブ監視（第4の壁）
window.onblur = () => { if(!insane) document.title = "どこへ行くの…？"; };
window.onfocus = () => { if(!insane) document.title = originalTitle; };

// ==========================================
// 4. ターミナルコンソール対話システム
// ==========================================
const commands = {
  help: "COMMANDS: help, status, whoami, look_behind, reset, clear",
  status: () => `SYSTEM STATUS: CRITICAL. SANITY LEVEL AT ${sanity}%.`,
  whoami: "YOU ARE HER HOSTAGE.",
  look_behind: "I TOLD YOU NOT TO LOOK.",
  reset: "THERE IS NO ESCAPE.",
  clear: "__CLEAR__"
};

async function terminal() {
  const input = $("#termInput"), body = $("#termBody");
  async function typeText(el, text, speed = 25) {
    el.classList.add("typing");
    for(let i=0; i<text.length; i++) {
      el.innerHTML += text.charAt(i);
      body.scrollTop = body.scrollHeight;
      await new Promise(r => setTimeout(r, speed + Math.random()*20));
    }
    el.classList.remove("typing");
  }

  async function run() {
    const v = input.value.trim().toLowerCase();
    if(!v || body.querySelector('.typing')) return;
    input.value = "";
    const u = document.createElement("div"); u.className = "termLine"; u.textContent = "> " + v;
    body.appendChild(u);
    let res = commands[v];
    if(typeof res === "function") res = res();
    if(!res) res = "COMMAND REJECTED. IT IS WATCHING YOU.";
    if(res === "__CLEAR__") { body.innerHTML = ""; return; }
    const out = document.createElement("div"); out.className = "termLine red";
    body.appendChild(out);
    await typeText(out, res);
    if(v === "look_behind") { setTimeout(triggerBlackout, 400); updateSan(sanity - 15); }
  }
  $("#termSend").onclick = run;
  input.onkeydown = e => { if(e.key === "Enter") run(); };
}
terminal();

// ==========================================
// 5. 文字化け（Zalgo）エンジン
// ==========================================
const zalgo = ['̍','̎','̄','̅','̿','̑','̆','̐','͒','͗','͑','̇','̈','̊','͂','̓','̈́','͊','͋','͌','̃','̂','̌','͐','̀','́','̋','̏','̒','̓','̔','̽','̉'];
function corruptTexts() {
  document.querySelectorAll(".scramble-text").forEach(el => {
    if(Math.random() > 0.6) return;
    let t = el.innerText, nt = "";
    for(let i=0; i<t.length; i++) {
      nt += t[i];
      if(Math.random() > 0.75) for(let j=0; j<2; j++) nt += zalgo[Math.floor(Math.random()*zalgo.length)];
    }
    el.innerText = nt;
  });
}

// =========================================================
// 6. 発狂モード // EXTREME FULLSCREEN LOCK ENGINE
// =========================================================
const INSANITY_DURATION = 12000;
let insane = false;
let insaneStartedAt = 0;
let insaneFrame = 0;
let insaneTimer = null;
let insaneShardTimer = null;
let insaneFlashTimer = null;
let previousScrollY = 0;
let previousOverflow = "";
let previousTouchAction = "";
let previousBodyTransform = "";

const insanityOverlay = $("#insanityOverlay");
const insanityTimer = $("#insanityTimer");
const insanityTimerFill = $("#insanityTimerFill");
const insanityStatus = $("#insanityStatus");
const insanityTitle = $("#insanityTitle");

const INSANE_WORDS = [
  "見てる", "逃げるな", "うしろ", "まだいる", "■■■■",
  "こっち", "開けて", "閉じないで", "見つけた", "聞こえる？",
  "止めないで", "戻れない", "ずっと", "視線", "眼",
  "そこ", "今", "まだ", "いるよ", "近い", "近い", "近い"
];

const INSANE_STATUS = [
  "操作を受け付けていません。",
  "スクロールは無効化されています。",
  "入力経路を一時遮断しています。",
  "表示領域を固定しています。",
  "タイマーがゼロになるまで終了できません。",
  "画面外へ逃げても、レイヤーは消えません。",
  "あと少し。",
  "見ないで。",
  "もう少しだけ。"
];

function setInsanityOverlay(active) {
  insanityOverlay.classList.toggle("active", active);
  insanityOverlay.setAttribute("aria-hidden", String(!active));
}

function savePageInputState() {
  previousOverflow = document.body.style.overflow;
  previousTouchAction = document.body.style.touchAction;
  previousBodyTransform = document.body.style.transform;
}

function lockPageInput() {
  savePageInputState();
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
  document.documentElement.style.overscrollBehavior = "none";
}

function restorePageInput() {
  document.body.style.overflow = previousOverflow;
  document.body.style.touchAction = previousTouchAction;
  document.body.style.transform = previousBodyTransform;
  document.documentElement.style.overscrollBehavior = "";
}

function keepViewportFixed() {
  if (!insane) return;
  if (window.scrollY !== previousScrollY) {
    window.scrollTo(0, previousScrollY);
  }
}

function blockInsanityInput(event) {
  if (!insane) return;
  if (event.target && event.target.closest("#insanityOverlay")) {
    event.preventDefault();
    event.stopPropagation();
  } else {
    event.preventDefault();
    event.stopPropagation();
  }
}

const insanityBlockedEvents = [
  "wheel", "touchstart", "touchmove", "touchend",
  "pointerdown", "pointerup", "click", "dblclick",
  "contextmenu", "dragstart", "selectstart"
];

insanityBlockedEvents.forEach(type => {
  window.addEventListener(type, blockInsanityInput, { capture: true, passive: false });
});

window.addEventListener("keydown", event => {
  if (!insane) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, { capture: true });

window.addEventListener("beforeunload", event => {
  if (!insane) return;
  // ブラウザを強制的に閉じることはせず、ページ内ロックだけを行う。
  // ユーザーのブラウザ操作そのものは妨害しない。
});

window.addEventListener("scroll", keepViewportFixed, { passive: true });

function spawnInsaneShard() {
  if (!insane || !insanityOverlay.classList.contains("active")) return;
  const el = document.createElement("div");
  el.className = "insaneShard";
  el.textContent = INSANE_WORDS[Math.floor(Math.random() * INSANE_WORDS.length)];
  const left = Math.random() * 92;
  const top = 8 + Math.random() * 82;
  const life = 0.8 + Math.random() * 2.8;
  const dx = (-30 + Math.random() * 60) + "vw";
  const dy = (-50 + Math.random() * 40) + "vh";
  const rot = (-35 + Math.random() * 70) + "deg";

  el.style.left = left + "vw";
  el.style.top = top + "vh";
  el.style.setProperty("--life", life + "s");
  el.style.setProperty("--dx", dx);
  el.style.setProperty("--dy", dy);
  el.style.setProperty("--rot", rot);

  insanityOverlay.appendChild(el);
  setTimeout(() => el.remove(), (life + 0.2) * 1000);
}

function spawnInsaneFlash() {
  if (!insane) return;
  const flash = document.createElement("div");
  flash.className = "insaneFlash";
  insanityOverlay.appendChild(flash);
  setTimeout(() => flash.remove(), 160);
}

function updateInsanityTimer(now = performance.now()) {
  if (!insane) return;
  const elapsed = now - insaneStartedAt;
  const left = Math.max(0, INSANITY_DURATION - elapsed);
  const ratio = left / INSANITY_DURATION;

  insanityTimer.textContent = (left / 1000).toFixed(1);
  insanityTimerFill.style.transform = `scaleX(${ratio})`;

  if (left <= 3800) {
    insanityOverlay.dataset.phase = "critical";
    insanityStatus.textContent =
      INSANE_STATUS[Math.floor((elapsed / 420) % INSANE_STATUS.length)];
  } else {
    insanityOverlay.dataset.phase = "normal";
    insanityStatus.textContent =
      INSANE_STATUS[Math.floor((elapsed / 1050) % INSANE_STATUS.length)];
  }

  if (left <= 0) {
    endInsanity("timeout");
    return;
  }

  insaneFrame = requestAnimationFrame(updateInsanityTimer);
}

function beginInsanityCountdown() {
  cancelAnimationFrame(insaneFrame);
  insaneStartedAt = performance.now();
  updateInsanityTimer(insaneStartedAt);
}

function endInsanity(reason = "timeout") {
  if (!insane) return;

  insane = false;
  cancelAnimationFrame(insaneFrame);
  clearInterval(insaneShardTimer);
  clearTimeout(insaneFlashTimer);
  insaneShardTimer = null;
  insaneFlashTimer = null;

  insanityOverlay.dataset.phase = "release";
  insanityStatus.textContent =
    reason === "timeout"
      ? "LOCK RELEASED // セッションを解放しました。"
      : "SESSION ENDED.";

  document.body.classList.remove("insane");
  restorePageInput();
  updateSan(35);

  clearTimeout(insanityTimer);
  clearTimeout(window.__insanityReleaseCleanup);

  window.__insanityReleaseCleanup = setTimeout(() => {
    setInsanityOverlay(false);
    insanityOverlay.dataset.phase = "normal";
    document.querySelectorAll(".insaneShard").forEach(x => x.remove());
    insanityTimer.textContent = "0.0";
    insanityTimerFill.style.transform = "scaleX(0)";
    document.title = originalTitle;
    $("#insanityBtn").style.display = "inline-block";
    $("#resetBtn").style.display = "none";
    updateSan(Math.max(35, sanity));
  }, 1200);
}

function startInsanity() {
  if (insane) return;

  insane = true;
  previousScrollY = window.scrollY;
  savePageInputState();
  lockPageInput();

  document.body.classList.add("insane");
  setInsanityOverlay(true);

  document.title = "■■■ 発狂 // FULLSCREEN LOCK ■■■";
  $("#insanityBtn").style.display = "none";
  $("#resetBtn").style.display = "none";

  sanity = 0;
  $("#sanFill").style.width = "0%";
  $("#sanVal").textContent = "0%";

  insanityTimer.textContent = (INSANITY_DURATION / 1000).toFixed(1);
  insanityTimerFill.style.transform = "scaleX(1)";
  insanityStatus.textContent = "画面を固定しています……";

  // 初期バースト
  for (let i = 0; i < 26; i++) {
    setTimeout(() => spawnInsaneShard(), i * 24);
  }

  // 発狂中は一定頻度で画面上の文字を生成
  insaneShardTimer = setInterval(() => {
    const burst = Math.random() < 0.22 ? 4 : 1;
    for (let i = 0; i < burst; i++) spawnInsaneShard();
  }, 105);

  // ランダムな白フラッシュ
  insaneFlashTimer = setInterval(() => {
    if (Math.random() < 0.35) spawnInsaneFlash();
  }, 480);

  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (droneGain) {
      droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
      droneGain.gain.setTargetAtTime(.34, audioCtx.currentTime, .08);
    }
  }

  beginInsanityCountdown();
}

// 緊急停止は「強制終了」ではなく、発狂モードの自然な終了フローを呼ぶ。
function resetInsanity() {
  if (insane) endInsanity("manual");
}

$("#insanityBtn").onclick = startInsanity;
$("#resetBtn").onclick = resetInsanity;

// ボタン連打による重複起動を防止。
$("#insanityBtn").addEventListener("dblclick", event => {
  event.preventDefault();
  event.stopPropagation();
});

// 発狂中はリンク移動もページ内操作も停止。
document.addEventListener("click", event => {
  if (!insane) return;
  if (!event.target.closest("#insanityOverlay")) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

// 発狂終了後の音量をゆっくり復帰。
const originalDroneGain = 0.08;
function recoverDrone() {
  if (!audioCtx || !droneGain) return;
  droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
  droneGain.gain.setTargetAtTime(originalDroneGain, audioCtx.currentTime, .35);
}
const originalEndInsanity = endInsanity;
endInsanity = function(reason = "timeout") {
  originalEndInsanity(reason);
  setTimeout(recoverDrone, 300);
};

// 自動SAN値減少

setInterval(() => {
  if (!insane && document.visibilityState === "visible") updateSan(sanity - 1);
}, 2500);

// スクロールフェードイン
const io = new IntersectionObserver(es => es.forEach(e => {
  if(e.isIntersecting) { e.target.classList.add("show"); io.unobserve(e.target); }
}), { threshold: .1, rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".reveal").forEach(x => io.observe(x));

// ライトボックス処理
const lb = $("#lightbox"), li = $("#lightImg");
document.querySelectorAll(".g").forEach(g => {
  g.onclick = () => { li.src = g.dataset.img || g.querySelector("img").src; lb.classList.add("open"); updateSan(sanity - 4); };
});
$("#closeLight").onclick = () => lb.classList.remove("open");
lb.onclick = e => { if(e.target === lb) lb.classList.remove("open"); };


/* =========================================================
   DEEP HORROR LOG BANK // DATA-DRIVEN VISUAL NOISE
   ========================================================= */
const DEEP_HORROR_LOGS = [
  "LOG_00_00 // 見てる / 視線 / ■■■",
  "LOG_00_01 // 見てる / 足音 / …",
  "LOG_00_02 // 見てる / 呼吸 / …",
  "LOG_00_03 // 見てる / ドア / ■■■",
  "LOG_00_04 // 見てる / 窓 / …",
  "LOG_00_05 // 見てる / 反射 / …",
  "LOG_00_06 // 見てる / 影 / ■■■",
  "LOG_00_07 // 見てる / 記録 / …",
  "LOG_00_08 // 見てる / ノイズ / …",
  "LOG_00_09 // 見てる / 記憶 / ■■■",
  "LOG_00_10 // 見てる / 時計 / …",
  "LOG_00_11 // 見てる / 部屋 / …",
  "LOG_00_12 // 見てる / 画面 / ■■■",
  "LOG_00_13 // 見てる / 声 / …",
  "LOG_00_14 // 見てる / 手 / …",
  "LOG_00_15 // 見てる / 眼 / ■■■",
  "LOG_01_00 // まだいる / 視線 / …",
  "LOG_01_01 // まだいる / 足音 / …",
  "LOG_01_02 // まだいる / 呼吸 / ■■■",
  "LOG_01_03 // まだいる / ドア / …",
  "LOG_01_04 // まだいる / 窓 / …",
  "LOG_01_05 // まだいる / 反射 / ■■■",
  "LOG_01_06 // まだいる / 影 / …",
  "LOG_01_07 // まだいる / 記録 / …",
  "LOG_01_08 // まだいる / ノイズ / ■■■",
  "LOG_01_09 // まだいる / 記憶 / …",
  "LOG_01_10 // まだいる / 時計 / …",
  "LOG_01_11 // まだいる / 部屋 / ■■■",
  "LOG_01_12 // まだいる / 画面 / …",
  "LOG_01_13 // まだいる / 声 / …",
  "LOG_01_14 // まだいる / 手 / ■■■",
  "LOG_01_15 // まだいる / 眼 / …",
  "LOG_02_00 // うしろ / 視線 / …",
  "LOG_02_01 // うしろ / 足音 / ■■■",
  "LOG_02_02 // うしろ / 呼吸 / …",
  "LOG_02_03 // うしろ / ドア / …",
  "LOG_02_04 // うしろ / 窓 / ■■■",
  "LOG_02_05 // うしろ / 反射 / …",
  "LOG_02_06 // うしろ / 影 / …",
  "LOG_02_07 // うしろ / 記録 / ■■■",
  "LOG_02_08 // うしろ / ノイズ / …",
  "LOG_02_09 // うしろ / 記憶 / …",
  "LOG_02_10 // うしろ / 時計 / ■■■",
  "LOG_02_11 // うしろ / 部屋 / …",
  "LOG_02_12 // うしろ / 画面 / …",
  "LOG_02_13 // うしろ / 声 / ■■■",
  "LOG_02_14 // うしろ / 手 / …",
  "LOG_02_15 // うしろ / 眼 / …",
  "LOG_03_00 // 閉じないで / 視線 / ■■■",
  "LOG_03_01 // 閉じないで / 足音 / …",
  "LOG_03_02 // 閉じないで / 呼吸 / …",
  "LOG_03_03 // 閉じないで / ドア / ■■■",
  "LOG_03_04 // 閉じないで / 窓 / …",
  "LOG_03_05 // 閉じないで / 反射 / …",
  "LOG_03_06 // 閉じないで / 影 / ■■■",
  "LOG_03_07 // 閉じないで / 記録 / …",
  "LOG_03_08 // 閉じないで / ノイズ / …",
  "LOG_03_09 // 閉じないで / 記憶 / ■■■",
  "LOG_03_10 // 閉じないで / 時計 / …",
  "LOG_03_11 // 閉じないで / 部屋 / …",
  "LOG_03_12 // 閉じないで / 画面 / ■■■",
  "LOG_03_13 // 閉じないで / 声 / …",
  "LOG_03_14 // 閉じないで / 手 / …",
  "LOG_03_15 // 閉じないで / 眼 / ■■■",
  "LOG_04_00 // 聞こえる？ / 視線 / …",
  "LOG_04_01 // 聞こえる？ / 足音 / …",
  "LOG_04_02 // 聞こえる？ / 呼吸 / ■■■",
  "LOG_04_03 // 聞こえる？ / ドア / …",
  "LOG_04_04 // 聞こえる？ / 窓 / …",
  "LOG_04_05 // 聞こえる？ / 反射 / ■■■",
  "LOG_04_06 // 聞こえる？ / 影 / …",
  "LOG_04_07 // 聞こえる？ / 記録 / …",
  "LOG_04_08 // 聞こえる？ / ノイズ / ■■■",
  "LOG_04_09 // 聞こえる？ / 記憶 / …",
  "LOG_04_10 // 聞こえる？ / 時計 / …",
  "LOG_04_11 // 聞こえる？ / 部屋 / ■■■",
  "LOG_04_12 // 聞こえる？ / 画面 / …",
  "LOG_04_13 // 聞こえる？ / 声 / …",
  "LOG_04_14 // 聞こえる？ / 手 / ■■■",
  "LOG_04_15 // 聞こえる？ / 眼 / …",
  "LOG_05_00 // ここにいる / 視線 / …",
  "LOG_05_01 // ここにいる / 足音 / ■■■",
  "LOG_05_02 // ここにいる / 呼吸 / …",
  "LOG_05_03 // ここにいる / ドア / …",
  "LOG_05_04 // ここにいる / 窓 / ■■■",
  "LOG_05_05 // ここにいる / 反射 / …",
  "LOG_05_06 // ここにいる / 影 / …",
  "LOG_05_07 // ここにいる / 記録 / ■■■",
  "LOG_05_08 // ここにいる / ノイズ / …",
  "LOG_05_09 // ここにいる / 記憶 / …",
  "LOG_05_10 // ここにいる / 時計 / ■■■",
  "LOG_05_11 // ここにいる / 部屋 / …",
  "LOG_05_12 // ここにいる / 画面 / …",
  "LOG_05_13 // ここにいる / 声 / ■■■",
  "LOG_05_14 // ここにいる / 手 / …",
  "LOG_05_15 // ここにいる / 眼 / …",
  "LOG_06_00 // 見つけた / 視線 / ■■■",
  "LOG_06_01 // 見つけた / 足音 / …",
  "LOG_06_02 // 見つけた / 呼吸 / …",
  "LOG_06_03 // 見つけた / ドア / ■■■",
  "LOG_06_04 // 見つけた / 窓 / …",
  "LOG_06_05 // 見つけた / 反射 / …",
  "LOG_06_06 // 見つけた / 影 / ■■■",
  "LOG_06_07 // 見つけた / 記録 / …",
  "LOG_06_08 // 見つけた / ノイズ / …",
  "LOG_06_09 // 見つけた / 記憶 / ■■■",
  "LOG_06_10 // 見つけた / 時計 / …",
  "LOG_06_11 // 見つけた / 部屋 / …",
  "LOG_06_12 // 見つけた / 画面 / ■■■",
  "LOG_06_13 // 見つけた / 声 / …",
  "LOG_06_14 // 見つけた / 手 / …",
  "LOG_06_15 // 見つけた / 眼 / ■■■",
  "LOG_07_00 // 戻れない / 視線 / …",
  "LOG_07_01 // 戻れない / 足音 / …",
  "LOG_07_02 // 戻れない / 呼吸 / ■■■",
  "LOG_07_03 // 戻れない / ドア / …",
  "LOG_07_04 // 戻れない / 窓 / …",
  "LOG_07_05 // 戻れない / 反射 / ■■■",
  "LOG_07_06 // 戻れない / 影 / …",
  "LOG_07_07 // 戻れない / 記録 / …",
  "LOG_07_08 // 戻れない / ノイズ / ■■■",
  "LOG_07_09 // 戻れない / 記憶 / …",
  "LOG_07_10 // 戻れない / 時計 / …",
  "LOG_07_11 // 戻れない / 部屋 / ■■■",
  "LOG_07_12 // 戻れない / 画面 / …",
  "LOG_07_13 // 戻れない / 声 / …",
  "LOG_07_14 // 戻れない / 手 / ■■■",
  "LOG_07_15 // 戻れない / 眼 / …",
  "LOG_08_00 // 逃げないで / 視線 / …",
  "LOG_08_01 // 逃げないで / 足音 / ■■■",
  "LOG_08_02 // 逃げないで / 呼吸 / …",
  "LOG_08_03 // 逃げないで / ドア / …",
  "LOG_08_04 // 逃げないで / 窓 / ■■■",
  "LOG_08_05 // 逃げないで / 反射 / …",
  "LOG_08_06 // 逃げないで / 影 / …",
  "LOG_08_07 // 逃げないで / 記録 / ■■■",
  "LOG_08_08 // 逃げないで / ノイズ / …",
  "LOG_08_09 // 逃げないで / 記憶 / …",
  "LOG_08_10 // 逃げないで / 時計 / ■■■",
  "LOG_08_11 // 逃げないで / 部屋 / …",
  "LOG_08_12 // 逃げないで / 画面 / …",
  "LOG_08_13 // 逃げないで / 声 / ■■■",
  "LOG_08_14 // 逃げないで / 手 / …",
  "LOG_08_15 // 逃げないで / 眼 / …",
  "LOG_09_00 // 画面の外 / 視線 / ■■■",
  "LOG_09_01 // 画面の外 / 足音 / …",
  "LOG_09_02 // 画面の外 / 呼吸 / …",
  "LOG_09_03 // 画面の外 / ドア / ■■■",
  "LOG_09_04 // 画面の外 / 窓 / …",
  "LOG_09_05 // 画面の外 / 反射 / …",
  "LOG_09_06 // 画面の外 / 影 / ■■■",
  "LOG_09_07 // 画面の外 / 記録 / …",
  "LOG_09_08 // 画面の外 / ノイズ / …",
  "LOG_09_09 // 画面の外 / 記憶 / ■■■",
  "LOG_09_10 // 画面の外 / 時計 / …",
  "LOG_09_11 // 画面の外 / 部屋 / …",
  "LOG_09_12 // 画面の外 / 画面 / ■■■",
  "LOG_09_13 // 画面の外 / 声 / …",
  "LOG_09_14 // 画面の外 / 手 / …",
  "LOG_09_15 // 画面の外 / 眼 / ■■■",
  "LOG_10_00 // そこじゃない / 視線 / …",
  "LOG_10_01 // そこじゃない / 足音 / …",
  "LOG_10_02 // そこじゃない / 呼吸 / ■■■",
  "LOG_10_03 // そこじゃない / ドア / …",
  "LOG_10_04 // そこじゃない / 窓 / …",
  "LOG_10_05 // そこじゃない / 反射 / ■■■",
  "LOG_10_06 // そこじゃない / 影 / …",
  "LOG_10_07 // そこじゃない / 記録 / …",
  "LOG_10_08 // そこじゃない / ノイズ / ■■■",
  "LOG_10_09 // そこじゃない / 記憶 / …",
  "LOG_10_10 // そこじゃない / 時計 / …",
  "LOG_10_11 // そこじゃない / 部屋 / ■■■",
  "LOG_10_12 // そこじゃない / 画面 / …",
  "LOG_10_13 // そこじゃない / 声 / …",
  "LOG_10_14 // そこじゃない / 手 / ■■■",
  "LOG_10_15 // そこじゃない / 眼 / …",
  "LOG_11_00 // 目をそらすな / 視線 / …",
  "LOG_11_01 // 目をそらすな / 足音 / ■■■",
  "LOG_11_02 // 目をそらすな / 呼吸 / …",
  "LOG_11_03 // 目をそらすな / ドア / …",
  "LOG_11_04 // 目をそらすな / 窓 / ■■■",
  "LOG_11_05 // 目をそらすな / 反射 / …",
  "LOG_11_06 // 目をそらすな / 影 / …",
  "LOG_11_07 // 目をそらすな / 記録 / ■■■",
  "LOG_11_08 // 目をそらすな / ノイズ / …",
  "LOG_11_09 // 目をそらすな / 記憶 / …",
  "LOG_11_10 // 目をそらすな / 時計 / ■■■",
  "LOG_11_11 // 目をそらすな / 部屋 / …",
  "LOG_11_12 // 目をそらすな / 画面 / …",
  "LOG_11_13 // 目をそらすな / 声 / ■■■",
  "LOG_11_14 // 目をそらすな / 手 / …",
  "LOG_11_15 // 目をそらすな / 眼 / …",
  "LOG_12_00 // まだ終わらない / 視線 / ■■■",
  "LOG_12_01 // まだ終わらない / 足音 / …",
  "LOG_12_02 // まだ終わらない / 呼吸 / …",
  "LOG_12_03 // まだ終わらない / ドア / ■■■",
  "LOG_12_04 // まだ終わらない / 窓 / …",
  "LOG_12_05 // まだ終わらない / 反射 / …",
  "LOG_12_06 // まだ終わらない / 影 / ■■■",
  "LOG_12_07 // まだ終わらない / 記録 / …",
  "LOG_12_08 // まだ終わらない / ノイズ / …",
  "LOG_12_09 // まだ終わらない / 記憶 / ■■■",
  "LOG_12_10 // まだ終わらない / 時計 / …",
  "LOG_12_11 // まだ終わらない / 部屋 / …",
  "LOG_12_12 // まだ終わらない / 画面 / ■■■",
  "LOG_12_13 // まだ終わらない / 声 / …",
  "LOG_12_14 // まだ終わらない / 手 / …",
  "LOG_12_15 // まだ終わらない / 眼 / ■■■",
  "LOG_13_00 // 近い / 視線 / …",
  "LOG_13_01 // 近い / 足音 / …",
  "LOG_13_02 // 近い / 呼吸 / ■■■",
  "LOG_13_03 // 近い / ドア / …",
  "LOG_13_04 // 近い / 窓 / …",
  "LOG_13_05 // 近い / 反射 / ■■■",
  "LOG_13_06 // 近い / 影 / …",
  "LOG_13_07 // 近い / 記録 / …",
  "LOG_13_08 // 近い / ノイズ / ■■■",
  "LOG_13_09 // 近い / 記憶 / …",
  "LOG_13_10 // 近い / 時計 / …",
  "LOG_13_11 // 近い / 部屋 / ■■■",
  "LOG_13_12 // 近い / 画面 / …",
  "LOG_13_13 // 近い / 声 / …",
  "LOG_13_14 // 近い / 手 / ■■■",
  "LOG_13_15 // 近い / 眼 / …",
  "LOG_14_00 // 近いよ / 視線 / …",
  "LOG_14_01 // 近いよ / 足音 / ■■■",
  "LOG_14_02 // 近いよ / 呼吸 / …",
  "LOG_14_03 // 近いよ / ドア / …",
  "LOG_14_04 // 近いよ / 窓 / ■■■",
  "LOG_14_05 // 近いよ / 反射 / …",
  "LOG_14_06 // 近いよ / 影 / …",
  "LOG_14_07 // 近いよ / 記録 / ■■■",
  "LOG_14_08 // 近いよ / ノイズ / …",
  "LOG_14_09 // 近いよ / 記憶 / …",
  "LOG_14_10 // 近いよ / 時計 / ■■■",
  "LOG_14_11 // 近いよ / 部屋 / …",
  "LOG_14_12 // 近いよ / 画面 / …",
  "LOG_14_13 // 近いよ / 声 / ■■■",
  "LOG_14_14 // 近いよ / 手 / …",
  "LOG_14_15 // 近いよ / 眼 / …",
  "LOG_15_00 // 開けて / 視線 / ■■■",
  "LOG_15_01 // 開けて / 足音 / …",
  "LOG_15_02 // 開けて / 呼吸 / …",
  "LOG_15_03 // 開けて / ドア / ■■■",
  "LOG_15_04 // 開けて / 窓 / …",
  "LOG_15_05 // 開けて / 反射 / …",
  "LOG_15_06 // 開けて / 影 / ■■■",
  "LOG_15_07 // 開けて / 記録 / …",
  "LOG_15_08 // 開けて / ノイズ / …",
  "LOG_15_09 // 開けて / 記憶 / ■■■",
  "LOG_15_10 // 開けて / 時計 / …",
  "LOG_15_11 // 開けて / 部屋 / …",
  "LOG_15_12 // 開けて / 画面 / ■■■",
  "LOG_15_13 // 開けて / 声 / …",
  "LOG_15_14 // 開けて / 手 / …",
  "LOG_15_15 // 開けて / 眼 / ■■■",
  "LOG_16_00 // 暗くしないで / 視線 / …",
  "LOG_16_01 // 暗くしないで / 足音 / …",
  "LOG_16_02 // 暗くしないで / 呼吸 / ■■■",
  "LOG_16_03 // 暗くしないで / ドア / …",
  "LOG_16_04 // 暗くしないで / 窓 / …",
  "LOG_16_05 // 暗くしないで / 反射 / ■■■",
  "LOG_16_06 // 暗くしないで / 影 / …",
  "LOG_16_07 // 暗くしないで / 記録 / …",
  "LOG_16_08 // 暗くしないで / ノイズ / ■■■",
  "LOG_16_09 // 暗くしないで / 記憶 / …",
  "LOG_16_10 // 暗くしないで / 時計 / …",
  "LOG_16_11 // 暗くしないで / 部屋 / ■■■",
  "LOG_16_12 // 暗くしないで / 画面 / …",
  "LOG_16_13 // 暗くしないで / 声 / …",
  "LOG_16_14 // 暗くしないで / 手 / ■■■",
  "LOG_16_15 // 暗くしないで / 眼 / …",
  "LOG_17_00 // 名前を呼んだ / 視線 / …",
  "LOG_17_01 // 名前を呼んだ / 足音 / ■■■",
  "LOG_17_02 // 名前を呼んだ / 呼吸 / …",
  "LOG_17_03 // 名前を呼んだ / ドア / …",
  "LOG_17_04 // 名前を呼んだ / 窓 / ■■■",
  "LOG_17_05 // 名前を呼んだ / 反射 / …",
  "LOG_17_06 // 名前を呼んだ / 影 / …",
  "LOG_17_07 // 名前を呼んだ / 記録 / ■■■",
  "LOG_17_08 // 名前を呼んだ / ノイズ / …",
  "LOG_17_09 // 名前を呼んだ / 記憶 / …",
  "LOG_17_10 // 名前を呼んだ / 時計 / ■■■",
  "LOG_17_11 // 名前を呼んだ / 部屋 / …",
  "LOG_17_12 // 名前を呼んだ / 画面 / …",
  "LOG_17_13 // 名前を呼んだ / 声 / ■■■",
  "LOG_17_14 // 名前を呼んだ / 手 / …",
  "LOG_17_15 // 名前を呼んだ / 眼 / …",
  "LOG_18_00 // さっきからいる / 視線 / ■■■",
  "LOG_18_01 // さっきからいる / 足音 / …",
  "LOG_18_02 // さっきからいる / 呼吸 / …",
  "LOG_18_03 // さっきからいる / ドア / ■■■",
  "LOG_18_04 // さっきからいる / 窓 / …",
  "LOG_18_05 // さっきからいる / 反射 / …",
  "LOG_18_06 // さっきからいる / 影 / ■■■",
  "LOG_18_07 // さっきからいる / 記録 / …",
  "LOG_18_08 // さっきからいる / ノイズ / …",
  "LOG_18_09 // さっきからいる / 記憶 / ■■■",
  "LOG_18_10 // さっきからいる / 時計 / …",
  "LOG_18_11 // さっきからいる / 部屋 / …",
  "LOG_18_12 // さっきからいる / 画面 / ■■■",
  "LOG_18_13 // さっきからいる / 声 / …",
  "LOG_18_14 // さっきからいる / 手 / …",
  "LOG_18_15 // さっきからいる / 眼 / ■■■",
  "LOG_19_00 // 気づいて / 視線 / …",
  "LOG_19_01 // 気づいて / 足音 / …",
  "LOG_19_02 // 気づいて / 呼吸 / ■■■",
  "LOG_19_03 // 気づいて / ドア / …",
  "LOG_19_04 // 気づいて / 窓 / …",
  "LOG_19_05 // 気づいて / 反射 / ■■■",
  "LOG_19_06 // 気づいて / 影 / …",
  "LOG_19_07 // 気づいて / 記録 / …",
  "LOG_19_08 // 気づいて / ノイズ / ■■■",
  "LOG_19_09 // 気づいて / 記憶 / …",
  "LOG_19_10 // 気づいて / 時計 / …",
  "LOG_19_11 // 気づいて / 部屋 / ■■■",
  "LOG_19_12 // 気づいて / 画面 / …",
  "LOG_19_13 // 気づいて / 声 / …",
  "LOG_19_14 // 気づいて / 手 / ■■■",
  "LOG_19_15 // 気づいて / 眼 / …",
  "ARCHIVE_000 // 窓の向こうが動いた",
  "ARCHIVE_001 // 暗い廊下が近づいている",
  "ARCHIVE_002 // あなたの影が動いた",
  "ARCHIVE_003 // 左上が近づいている",
  "ARCHIVE_004 // 右下が動いた",
  "ARCHIVE_005 // 背後が近づいている",
  "ARCHIVE_006 // 反射面が動いた",
  "ARCHIVE_007 // 時計の秒針が近づいている",
  "ARCHIVE_008 // 窓の向こうが動いた",
  "ARCHIVE_009 // 暗い廊下が近づいている",
  "ARCHIVE_010 // あなたの影が動いた",
  "ARCHIVE_011 // 左上が近づいている",
  "ARCHIVE_012 // 右下が動いた",
  "ARCHIVE_013 // 背後が近づいている",
  "ARCHIVE_014 // 反射面が動いた",
  "ARCHIVE_015 // 時計の秒針が近づいている",
  "ARCHIVE_016 // 窓の向こうが動いた",
  "ARCHIVE_017 // 暗い廊下が近づいている",
  "ARCHIVE_018 // あなたの影が動いた",
  "ARCHIVE_019 // 左上が近づいている",
  "ARCHIVE_020 // 右下が動いた",
  "ARCHIVE_021 // 背後が近づいている",
  "ARCHIVE_022 // 反射面が動いた",
  "ARCHIVE_023 // 時計の秒針が近づいている",
  "ARCHIVE_024 // 窓の向こうが動いた",
  "ARCHIVE_025 // 暗い廊下が近づいている",
  "ARCHIVE_026 // あなたの影が動いた",
  "ARCHIVE_027 // 左上が近づいている",
  "ARCHIVE_028 // 右下が動いた",
  "ARCHIVE_029 // 背後が近づいている",
  "ARCHIVE_030 // 反射面が動いた",
  "ARCHIVE_031 // 時計の秒針が近づいている",
  "ARCHIVE_032 // 窓の向こうが動いた",
  "ARCHIVE_033 // 暗い廊下が近づいている",
  "ARCHIVE_034 // あなたの影が動いた",
  "ARCHIVE_035 // 左上が近づいている",
  "ARCHIVE_036 // 右下が動いた",
  "ARCHIVE_037 // 背後が近づいている",
  "ARCHIVE_038 // 反射面が動いた",
  "ARCHIVE_039 // 時計の秒針が近づいている",
  "ARCHIVE_040 // 窓の向こうが動いた",
  "ARCHIVE_041 // 暗い廊下が近づいている",
  "ARCHIVE_042 // あなたの影が動いた",
  "ARCHIVE_043 // 左上が近づいている",
  "ARCHIVE_044 // 右下が動いた",
  "ARCHIVE_045 // 背後が近づいている",
  "ARCHIVE_046 // 反射面が動いた",
  "ARCHIVE_047 // 時計の秒針が近づいている",
  "ARCHIVE_048 // 窓の向こうが動いた",
  "ARCHIVE_049 // 暗い廊下が近づいている",
  "ARCHIVE_050 // あなたの影が動いた",
  "ARCHIVE_051 // 左上が近づいている",
  "ARCHIVE_052 // 右下が動いた",
  "ARCHIVE_053 // 背後が近づいている",
  "ARCHIVE_054 // 反射面が動いた",
  "ARCHIVE_055 // 時計の秒針が近づいている",
  "ARCHIVE_056 // 窓の向こうが動いた",
  "ARCHIVE_057 // 暗い廊下が近づいている",
  "ARCHIVE_058 // あなたの影が動いた",
  "ARCHIVE_059 // 左上が近づいている",
  "ARCHIVE_060 // 右下が動いた",
  "ARCHIVE_061 // 背後が近づいている",
  "ARCHIVE_062 // 反射面が動いた",
  "ARCHIVE_063 // 時計の秒針が近づいている",
  "ARCHIVE_064 // 窓の向こうが動いた",
  "ARCHIVE_065 // 暗い廊下が近づいている",
  "ARCHIVE_066 // あなたの影が動いた",
  "ARCHIVE_067 // 左上が近づいている",
  "ARCHIVE_068 // 右下が動いた",
  "ARCHIVE_069 // 背後が近づいている",
  "ARCHIVE_070 // 反射面が動いた",
  "ARCHIVE_071 // 時計の秒針が近づいている",
  "ARCHIVE_072 // 窓の向こうが動いた",
  "ARCHIVE_073 // 暗い廊下が近づいている",
  "ARCHIVE_074 // あなたの影が動いた",
  "ARCHIVE_075 // 左上が近づいている",
  "ARCHIVE_076 // 右下が動いた",
  "ARCHIVE_077 // 背後が近づいている",
  "ARCHIVE_078 // 反射面が動いた",
  "ARCHIVE_079 // 時計の秒針が近づいている",
  "ARCHIVE_080 // 窓の向こうが動いた",
  "ARCHIVE_081 // 暗い廊下が近づいている",
  "ARCHIVE_082 // あなたの影が動いた",
  "ARCHIVE_083 // 左上が近づいている",
  "ARCHIVE_084 // 右下が動いた",
  "ARCHIVE_085 // 背後が近づいている",
  "ARCHIVE_086 // 反射面が動いた",
  "ARCHIVE_087 // 時計の秒針が近づいている",
  "ARCHIVE_088 // 窓の向こうが動いた",
  "ARCHIVE_089 // 暗い廊下が近づいている",
  "ARCHIVE_090 // あなたの影が動いた",
  "ARCHIVE_091 // 左上が近づいている",
  "ARCHIVE_092 // 右下が動いた",
  "ARCHIVE_093 // 背後が近づいている",
  "ARCHIVE_094 // 反射面が動いた",
  "ARCHIVE_095 // 時計の秒針が近づいている",
  "ARCHIVE_096 // 窓の向こうが動いた",
  "ARCHIVE_097 // 暗い廊下が近づいている",
  "ARCHIVE_098 // あなたの影が動いた",
  "ARCHIVE_099 // 左上が近づいている",
  "ARCHIVE_100 // 右下が動いた",
  "ARCHIVE_101 // 背後が近づいている",
  "ARCHIVE_102 // 反射面が動いた",
  "ARCHIVE_103 // 時計の秒針が近づいている",
  "ARCHIVE_104 // 窓の向こうが動いた",
  "ARCHIVE_105 // 暗い廊下が近づいている",
  "ARCHIVE_106 // あなたの影が動いた",
  "ARCHIVE_107 // 左上が近づいている",
  "ARCHIVE_108 // 右下が動いた",
  "ARCHIVE_109 // 背後が近づいている",
  "ARCHIVE_110 // 反射面が動いた",
  "ARCHIVE_111 // 時計の秒針が近づいている",
  "ARCHIVE_112 // 窓の向こうが動いた",
  "ARCHIVE_113 // 暗い廊下が近づいている",
  "ARCHIVE_114 // あなたの影が動いた",
  "ARCHIVE_115 // 左上が近づいている",
  "ARCHIVE_116 // 右下が動いた",
  "ARCHIVE_117 // 背後が近づいている",
  "ARCHIVE_118 // 反射面が動いた",
  "ARCHIVE_119 // 時計の秒針が近づいている",
  "ARCHIVE_120 // 窓の向こうが動いた",
  "ARCHIVE_121 // 暗い廊下が近づいている",
  "ARCHIVE_122 // あなたの影が動いた",
  "ARCHIVE_123 // 左上が近づいている",
  "ARCHIVE_124 // 右下が動いた",
  "ARCHIVE_125 // 背後が近づいている",
  "ARCHIVE_126 // 反射面が動いた",
  "ARCHIVE_127 // 時計の秒針が近づいている",
  "ARCHIVE_128 // 窓の向こうが動いた",
  "ARCHIVE_129 // 暗い廊下が近づいている",
  "ARCHIVE_130 // あなたの影が動いた",
  "ARCHIVE_131 // 左上が近づいている",
  "ARCHIVE_132 // 右下が動いた",
  "ARCHIVE_133 // 背後が近づいている",
  "ARCHIVE_134 // 反射面が動いた",
  "ARCHIVE_135 // 時計の秒針が近づいている",
  "ARCHIVE_136 // 窓の向こうが動いた",
  "ARCHIVE_137 // 暗い廊下が近づいている",
  "ARCHIVE_138 // あなたの影が動いた",
  "ARCHIVE_139 // 左上が近づいている",
  "ARCHIVE_140 // 右下が動いた",
  "ARCHIVE_141 // 背後が近づいている",
  "ARCHIVE_142 // 反射面が動いた",
  "ARCHIVE_143 // 時計の秒針が近づいている",
  "ARCHIVE_144 // 窓の向こうが動いた",
  "ARCHIVE_145 // 暗い廊下が近づいている",
  "ARCHIVE_146 // あなたの影が動いた",
  "ARCHIVE_147 // 左上が近づいている",
  "ARCHIVE_148 // 右下が動いた",
  "ARCHIVE_149 // 背後が近づいている",
  "ARCHIVE_150 // 反射面が動いた",
  "ARCHIVE_151 // 時計の秒針が近づいている",
  "ARCHIVE_152 // 窓の向こうが動いた",
  "ARCHIVE_153 // 暗い廊下が近づいている",
  "ARCHIVE_154 // あなたの影が動いた",
  "ARCHIVE_155 // 左上が近づいている",
  "ARCHIVE_156 // 右下が動いた",
  "ARCHIVE_157 // 背後が近づいている",
  "ARCHIVE_158 // 反射面が動いた",
  "ARCHIVE_159 // 時計の秒針が近づいている",
  "ARCHIVE_160 // 窓の向こうが動いた",
  "ARCHIVE_161 // 暗い廊下が近づいている",
  "ARCHIVE_162 // あなたの影が動いた",
  "ARCHIVE_163 // 左上が近づいている",
  "ARCHIVE_164 // 右下が動いた",
  "ARCHIVE_165 // 背後が近づいている",
  "ARCHIVE_166 // 反射面が動いた",
  "ARCHIVE_167 // 時計の秒針が近づいている",
  "ARCHIVE_168 // 窓の向こうが動いた",
  "ARCHIVE_169 // 暗い廊下が近づいている",
  "ARCHIVE_170 // あなたの影が動いた",
  "ARCHIVE_171 // 左上が近づいている",
  "ARCHIVE_172 // 右下が動いた",
  "ARCHIVE_173 // 背後が近づいている",
  "ARCHIVE_174 // 反射面が動いた",
  "ARCHIVE_175 // 時計の秒針が近づいている",
  "ARCHIVE_176 // 窓の向こうが動いた",
  "ARCHIVE_177 // 暗い廊下が近づいている",
  "ARCHIVE_178 // あなたの影が動いた",
  "ARCHIVE_179 // 左上が近づいている",
  "TRACE_000 // 音が止まった / まだ見ている / ■",
  "TRACE_001 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_002 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_003 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_004 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_005 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_006 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_007 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_008 // 音が止まった / まだ見ている / ■",
  "TRACE_009 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_010 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_011 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_012 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_013 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_014 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_015 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_016 // 音が止まった / まだ見ている / ■",
  "TRACE_017 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_018 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_019 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_020 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_021 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_022 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_023 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_024 // 音が止まった / まだ見ている / ■",
  "TRACE_025 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_026 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_027 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_028 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_029 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_030 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_031 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_032 // 音が止まった / まだ見ている / ■",
  "TRACE_033 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_034 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_035 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_036 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_037 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_038 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_039 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_040 // 音が止まった / まだ見ている / ■",
  "TRACE_041 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_042 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_043 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_044 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_045 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_046 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_047 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_048 // 音が止まった / まだ見ている / ■",
  "TRACE_049 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_050 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_051 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_052 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_053 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_054 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_055 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_056 // 音が止まった / まだ見ている / ■",
  "TRACE_057 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_058 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_059 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_060 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_061 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_062 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_063 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_064 // 音が止まった / まだ見ている / ■",
  "TRACE_065 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_066 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_067 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_068 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_069 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_070 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_071 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_072 // 音が止まった / まだ見ている / ■",
  "TRACE_073 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_074 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_075 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_076 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_077 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_078 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_079 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_080 // 音が止まった / まだ見ている / ■",
  "TRACE_081 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_082 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_083 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_084 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_085 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_086 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_087 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_088 // 音が止まった / まだ見ている / ■",
  "TRACE_089 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_090 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_091 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_092 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_093 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_094 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_095 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_096 // 音が止まった / まだ見ている / ■",
  "TRACE_097 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_098 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_099 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_100 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_101 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_102 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_103 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_104 // 音が止まった / まだ見ている / ■",
  "TRACE_105 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_106 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_107 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_108 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_109 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_110 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_111 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_112 // 音が止まった / まだ見ている / ■",
  "TRACE_113 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_114 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_115 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_116 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_117 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_118 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_119 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_120 // 音が止まった / まだ見ている / ■",
  "TRACE_121 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_122 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_123 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_124 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_125 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_126 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_127 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_128 // 音が止まった / まだ見ている / ■",
  "TRACE_129 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_130 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_131 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_132 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_133 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_134 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_135 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_136 // 音が止まった / まだ見ている / ■",
  "TRACE_137 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_138 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_139 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_140 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_141 // スクロールバーが震えている / でも終わらない / ■",
  "TRACE_142 // 時刻が戻った / 気づかないふりをして / ■",
  "TRACE_143 // ページが呼吸している / ここから先は記録外 / ■",
  "TRACE_144 // 音が止まった / まだ見ている / ■",
  "TRACE_145 // 画面が一瞬だけ黒い / でも終わらない / ■",
  "TRACE_146 // 反射が遅れている / 気づかないふりをして / ■",
  "TRACE_147 // 知らない文字が増えている / ここから先は記録外 / ■",
  "TRACE_148 // カーソルのない場所が動いた / まだ見ている / ■",
  "TRACE_149 // スクロールバーが震えている / でも終わらない / ■",
];

function pickDeepHorrorLog() {
  return DEEP_HORROR_LOGS[Math.floor(Math.random() * DEEP_HORROR_LOGS.length)];
}

// Mix the larger log bank into the existing shard system.
const originalSpawnInsaneShard = spawnInsaneShard;
spawnInsaneShard = function() {
  if (!insane) return;
  if (Math.random() < 0.68) {
    const el = document.createElement('div');
    el.className = 'insaneShard';
    el.textContent = pickDeepHorrorLog();
    el.style.left = (Math.random() * 88 + 4) + 'vw';
    el.style.top = (Math.random() * 82 + 7) + 'vh';
    const life = 0.7 + Math.random() * 2.6;
    el.style.setProperty('--life', life + 's');
    el.style.setProperty('--dx', (-35 + Math.random() * 70) + 'vw');
    el.style.setProperty('--dy', (-45 + Math.random() * 55) + 'vh');
    el.style.setProperty('--rot', (-42 + Math.random() * 84) + 'deg');
    insanityOverlay.appendChild(el);
    setTimeout(() => el.remove(), (life + 0.2) * 1000);
    return;
  }
  originalSpawnInsaneShard();
};

/* =========================================================
   7. Runtime diagnostics / horror atmosphere
   ========================================================= */
(() => {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce && reduce.matches) {
    // Reduced motion is respected for normal browsing, but the fullscreen lock
    // still uses the timer and input lock as requested.
    document.documentElement.dataset.reducedMotion = "true";
  }

  // Keep the overlay dimensions synchronized with mobile browser viewport changes.
  const syncViewport = () => {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--vhx", h + "px");
  };
  syncViewport();
  window.addEventListener("resize", syncViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", syncViewport, { passive: true });

  // Tiny ambient clock drift makes the horror site feel alive without blocking input.
  const clockNodes = document.querySelectorAll(".meta");
  setInterval(() => {
    if (insane) return;
    clockNodes.forEach(node => {
      if (Math.random() < .18) node.dataset.glitch = String(Date.now()).slice(-3);
    });
  }, 1700);
})();

// Keep the page safe from accidental browser-level fullscreen APIs.
// The effect is a fixed viewport overlay, so it works on GitHub Pages without permissions.



/* =========================================================
   ULTIMATE EXTENSION // MUSIC SELECTOR
   ========================================================= */
(() => {
  const player = document.getElementById('musicPlayer');
  const tracks = [...document.querySelectorAll('.music-track')];
  const now = document.getElementById('musicNowPlaying');
  const volume = document.getElementById('musicVolume');
  const loop = document.getElementById('musicLoop');
  let current = -1;

  function selectTrack(index, autoplay = true) {
    if (!tracks[index]) return;
    current = index;
    const file = tracks[index].dataset.track;
    player.src = file;
    player.volume = Number(volume.value);
    player.loop = loop.checked;
    tracks.forEach((b,i) => b.classList.toggle('active', i === current));
    now.textContent = `PLAYING // ${file} // TRACK ${(index+1).toString().padStart(2,'0')}`;
    if (autoplay) player.play().catch(() => {
      now.textContent += ' // TAP PLAY TO START';
    });
    addHorrorEvent(`AUDIO SWITCHED // ${file}`);
  }

  tracks.forEach((btn, i) => btn.addEventListener('click', () => selectTrack(i, true)));
  document.getElementById('musicPlay')?.addEventListener('click', () => {
    if (current < 0) selectTrack(0, true); else player.play().catch(()=>{});
  });
  document.getElementById('musicPause')?.addEventListener('click', () => player.pause());
  document.getElementById('musicStop')?.addEventListener('click', () => { player.pause(); player.currentTime = 0; });
  document.getElementById('musicNext')?.addEventListener('click', () => selectTrack((current + 1 + tracks.length) % tracks.length, true));
  volume?.addEventListener('input', () => { player.volume = Number(volume.value); });
  loop?.addEventListener('change', () => { player.loop = loop.checked; });
  player.addEventListener('ended', () => {
    if (!loop.checked) selectTrack((current + 1) % tracks.length, true);
  });
})();

/* =========================================================
   ULTIMATE EXTENSION // EVENT LOG + 3 HORROR FUNCTIONS
   ========================================================= */
const eventFeed = document.getElementById('eventFeed');
function addHorrorEvent(message, danger = false) {
  if (!eventFeed) return;
  const row = document.createElement('div');
  row.className = danger ? 'event-danger' : '';
  const time = new Date().toLocaleTimeString('ja-JP', {hour12:false});
  row.textContent = `[${time}] ${message}`;
  eventFeed.prepend(row);
  while (eventFeed.children.length > 40) eventFeed.lastElementChild.remove();
}
addHorrorEvent('SYSTEM BOOT // anomaly monitor online');

/* ① Random scare event */
function triggerRandomScare() {
  const blackout = document.getElementById('blackout');
  const variants = [
    () => { blackout.style.opacity='1'; blackout.querySelector('span').textContent='見ている'; setTimeout(()=>blackout.style.opacity='0',260); },
    () => { document.body.style.filter='contrast(2.8) saturate(1.8) hue-rotate(25deg)'; setTimeout(()=>document.body.style.filter='',420); },
    () => { const n=document.createElement('div'); n.className='floating'; n.textContent=['後ろ','そこ','まだいる','見つけた'][Math.floor(Math.random()*4)]; n.style.left=(10+Math.random()*70)+'vw'; n.style.top=(15+Math.random()*65)+'vh'; document.body.appendChild(n); setTimeout(()=>n.remove(),2200); },
    () => { window.scrollBy({top:(Math.random()-.5)*260, behavior:'smooth'}); }
  ];
  variants[Math.floor(Math.random()*variants.length)]();
  updateSan(Math.max(0, sanity-7));
  addHorrorEvent('UNEXPECTED EVENT // visual anomaly detected', true);
}
document.getElementById('scareEventBtn')?.addEventListener('click', triggerRandomScare);

/* ② Watcher / cursor observer */
const watcherDot = document.getElementById('watcherDot') || (() => {
  const x=document.createElement('div'); x.id='watcherDot'; document.body.appendChild(x); return x;
})();
let watcherOn=false, watcherTimeout=0;
window.addEventListener('pointermove', e => {
  if (!watcherOn || insane) return;
  watcherDot.style.left = (e.clientX + 12) + 'px';
  watcherDot.style.top = (e.clientY + 12) + 'px';
});
document.getElementById('watcherBtn')?.addEventListener('click', () => {
  watcherOn=!watcherOn;
  watcherDot.classList.toggle('active', watcherOn);
  addHorrorEvent(watcherOn ? 'WATCHER ONLINE // tracking cursor' : 'WATCHER OFFLINE');
  if (watcherOn) {
    clearTimeout(watcherTimeout);
    watcherTimeout=setTimeout(() => {
      if (!watcherOn || insane) return;
      watcherDot.style.left=(Math.random()*90+5)+'vw';
      watcherDot.style.top=(Math.random()*80+10)+'vh';
      addHorrorEvent('WATCHER MOVED WITHOUT USER INPUT', true);
    }, 4200+Math.random()*5200);
  }
});

/* ③ Log burst */
document.getElementById('logBurstBtn')?.addEventListener('click', () => {
  const messages=[
    'ARCHIVE // unknown observer added',
    'TRACE // page height mismatch',
    'CAMERA // frame lost',
    'SIGNAL // voice detected',
    'HOST // identity unresolved',
    'CLOCK // timestamp drift +00:00:07',
    'EYE // reflection count incorrect'
  ];
  for(let i=0;i<12;i++) setTimeout(()=>addHorrorEvent(messages[Math.floor(Math.random()*messages.length)], i%4===0), i*80);
});

/* Automatic ambient events, deliberately infrequent outside insanity mode. */
setInterval(() => {
  if (insane || document.visibilityState !== 'visible') return;
  if (Math.random() < 0.17) addHorrorEvent('BACKGROUND // no user action detected');
}, 2400);

/* Ensure the fullscreen overlay is always the final body child at runtime. */
(() => {
  const overlay=document.getElementById('insanityOverlay');
  if (overlay && overlay.parentElement !== document.body) document.body.appendChild(overlay);
  if (overlay) document.body.appendChild(overlay);
})();

/* True viewport lock: class on html avoids transformed-body fixed-position traps. */
const _startInsanity = startInsanity;
startInsanity = function() {
  document.documentElement.classList.add('insane-lock');
  _startInsanity();
  const ov=document.getElementById('insanityOverlay');
  if (ov) {
    ov.style.position='fixed';
    ov.style.zIndex='2147483647';
  }
  addHorrorEvent('FULLSCREEN LOCK // 12 SECOND SESSION STARTED', true);
};
const _endInsanity = endInsanity;
endInsanity = function(reason='timeout') {
  _endInsanity(reason);
  setTimeout(()=>document.documentElement.classList.remove('insane-lock'), 1400);
  addHorrorEvent('FULLSCREEN LOCK // SESSION RELEASED');
};
