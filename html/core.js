(function () {
  const DB_NAME = "anubi_portal_db";
  const DB_VERSION = 1;
  const ACCOUNTS_STORE = "accounts";
  const LOGIN_HISTORY_STORE = "login_history";
  const POINTS_HISTORY_STORE = "points_history";

  let dbPromise;
  let lastSyncedPoints = null;

  // متغيرات تحدي السرعة والقفل
  let speedInterval;
  let speedTime = 20;
  let challengeActive = false;

  function reqToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(ACCOUNTS_STORE)) {
          const accounts = db.createObjectStore(ACCOUNTS_STORE, { keyPath: "usernameKey" });
          accounts.createIndex("usernameDisplay", "usernameDisplay", { unique: false });
        }
        if (!db.objectStoreNames.contains(LOGIN_HISTORY_STORE)) {
          db.createObjectStore(LOGIN_HISTORY_STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(POINTS_HISTORY_STORE)) {
          db.createObjectStore(POINTS_HISTORY_STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function hashPassword(password) {
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
      return btoa(unescape(encodeURIComponent(password)));
    }
    const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    const bytes = new Uint8Array(buffer);
    let hex = "";
    for (let i = 0; i < bytes.length; i += 1) { hex += bytes[i].toString(16).padStart(2, "0"); }
    return hex;
  }

  function normalizeName(name) { return name.trim().replace(/\s+/g, " "); }
  function toUserKey(displayName) { return normalizeName(displayName).toLowerCase(); }

  function resolveSpecialBadge(usernameDisplay, gender, password) {
    const isRuwaida = toUserKey(usernameDisplay) === toUserKey("رويدا محمد");
    const isFemale = String(gender || "").toLowerCase() === "female";
    const isExpectedPass = String(password || "") === "abc123";
    if (isRuwaida && isFemale && isExpectedPass) return "مبرمج الموقع";
    return "";
  }

  async function writeLoginHistory(payload) {
    const db = await openDb();
    const tx = db.transaction(LOGIN_HISTORY_STORE, "readwrite");
    tx.objectStore(LOGIN_HISTORY_STORE).add(payload);
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function ensureAccount(loginData) {
    const firstName = normalizeName(loginData.firstName || "");
    const lastName = normalizeName(loginData.lastName || "");
    const password = String(loginData.password || "");
    const gender = loginData.gender || "male";
    const usernameDisplay = normalizeName((firstName + " " + lastName).trim());
    const usernameKey = toUserKey(usernameDisplay);
    const specialBadge = resolveSpecialBadge(usernameDisplay, gender, password);

    if (!usernameDisplay) return { ok: false, error: "يرجى إدخال الاسم كاملًا." };
    if (password.length < 6) return { ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };

    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);
    const db = await openDb();
    const readTx = db.transaction(ACCOUNTS_STORE, "readonly");
    const existing = await reqToPromise(readTx.objectStore(ACCOUNTS_STORE).get(usernameKey));

    if (existing && existing.passwordHash !== passwordHash) {
      return { ok: false, error: "كلمة المرور غير صحيحة لهذا الحساب." };
    }

    const nextAccount = existing
      ? { ...existing, gender, specialBadge: specialBadge || existing.specialBadge || "", lastLoginAt: now, loginCount: (existing.loginCount || 0) + 1 }
      : { usernameKey, usernameDisplay, passwordHash, gender, specialBadge, points: 0, createdAt: now, lastLoginAt: now, loginCount: 1 };

    const writeTx = db.transaction(ACCOUNTS_STORE, "readwrite");
    writeTx.objectStore(ACCOUNTS_STORE).put(nextAccount);
    await new Promise((resolve, reject) => {
      writeTx.oncomplete = resolve;
      writeTx.onerror = () => reject(writeTx.error);
    });

    await writeLoginHistory({ usernameKey, usernameDisplay, at: now, action: existing ? "login" : "register" });
    localStorage.setItem("username", usernameDisplay);
    localStorage.setItem("gender", gender);
    localStorage.setItem("points", String(nextAccount.points || 0));
    localStorage.setItem("currentUserKey", usernameKey);
    localStorage.setItem("userBadge", nextAccount.specialBadge || "");
    return { ok: true, isNew: !existing, usernameDisplay, points: nextAccount.points || 0 };
  }

  async function syncCurrentUserPoints() {
    const currentUserKey = localStorage.getItem("currentUserKey");
    if (!currentUserKey) return;
    const points = parseInt(localStorage.getItem("points") || "0", 10);
    if (!Number.isFinite(points) || lastSyncedPoints === points) return;

    const db = await openDb();
    const tx = db.transaction([ACCOUNTS_STORE, POINTS_HISTORY_STORE], "readwrite");
    const accountsStore = tx.objectStore(ACCOUNTS_STORE);
    const pointsStore = tx.objectStore(POINTS_HISTORY_STORE);
    const current = await reqToPromise(accountsStore.get(currentUserKey));
    if (!current) return;

    const oldPoints = Number(current.points || 0);
    current.points = points;
    accountsStore.put(current);
    if (oldPoints !== points) {
      pointsStore.add({ usernameKey: currentUserKey, oldPoints, newPoints: points, delta: points - oldPoints, at: new Date().toISOString() });
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    lastSyncedPoints = points;
  }

  function logout() {
    localStorage.clear();
    window.location.href = "index.html";
  }

  // --- دوال الصوت وتحويل الأرقام (احترافية رويدا) ---
  function pickBestArabicVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return null;
    const arabicVoices = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("ar"));
    return arabicVoices.find((v) => /neural|natural|premium/i.test(v.name)) || arabicVoices[0];
  }

  function normalizeDigits(text) {
    const map = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
    return String(text || "").replace(/[٠-٩]/g, (d) => map[d]);
  }

  function numberToArabicWords(num) {
    const ones = ["صفر","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة"];
    const tenToNineteen = ["عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
    const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
    const n = parseInt(num, 10);
    if (n < 10) return ones[n];
    if (n < 20) return tenToNineteen[n - 10];
    if (n < 100) { const t = Math.floor(n/10); const o = n%10; return o ? (ones[o] + " و" + tens[t]) : tens[t]; }
    return String(n);
  }

  function speakText(text, options) {
    if (!window.speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(normalizeDigits(text).replace(/\b\d{1,2}\b/g, (m) => numberToArabicWords(m)));
    const voice = pickBestArabicVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = "ar-EG";
    utterance.rate = (options && options.rate) || 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleSpeak(text, options) {
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    speakText(text, options);
  }

  // --- إضافات التفاعل (التايمر والوسام) ---
  function initStoryLock() {
    const timerBox = document.getElementById("reading-timer");
    const quizArea = document.getElementById("quiz-area");
    const secDisplay = document.getElementById("read-sec");
    let timeLeft = 10;
    if (!timerBox || !quizArea) return;
    const lockInterval = setInterval(() => {
      timeLeft--;
      if (secDisplay) secDisplay.innerText = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(lockInterval);
        timerBox.style.display = "none";
        quizArea.style.display = "block";
        quizArea.style.opacity = "1";
        toggleSpeak("يمكنك الآن حل الاختبار");
      }
    }, 1000);
  }

  function startSpeedChallenge() {
    if (challengeActive) return;
    challengeActive = true;
    const btn = document.getElementById("start-speed");
    const timerDisplay = document.getElementById("speed-timer");
    if (btn) btn.disabled = true;
    speedInterval = setInterval(() => {
      speedTime--;
      if (timerDisplay) timerDisplay.innerText = speedTime;
      if (speedTime <= 0) { clearInterval(speedInterval); challengeActive = false; }
    }, 1000);
  }

  async function checkStoryAnswers() {
    const a1 = document.getElementById("ans1")?.value.trim() || "";
    const a2 = document.getElementById("ans2")?.value.trim() || "";
    const feedback = document.getElementById("feedback");
    
    // منطق التحقق (اللغة النوبية كمثال)
    if (a1.includes("إدريس") && (a2.includes("دبابة") || a2.includes("tank"))) {
      let bonus = 10;
      if (challengeActive && speedTime > 0) {
        clearInterval(speedInterval);
        bonus += 20;
        localStorage.setItem("userBadge", "صاروخ السرعة ⚡");
      }
      let p = parseInt(localStorage.getItem("points") || "0") + bonus;
      localStorage.setItem("points", p);
      await syncCurrentUserPoints();
      if (feedback) feedback.innerText = "صح! + " + bonus + " نقطة";
      toggleSpeak("أحسنت يا بطل");
    } else {
      if (feedback) feedback.innerText = "خطأ، حاول مجدداً";
      toggleSpeak("حاول مرة أخرى");
    }
  }

  function runEnhancements() {
    document.body.classList.add("enhanced-ui");
    if (document.getElementById("reading-timer")) initStoryLock();
    const logoutButton = document.getElementById("logoutBtn");
    if (logoutButton) logoutButton.addEventListener("click", logout);
  }

  window.AnubiCore = { ensureAccount, syncCurrentUserPoints, logout, speakText, toggleSpeak, startSpeedChallenge, checkStoryAnswers };
  document.addEventListener("DOMContentLoaded", () => {
    runEnhancements();
    syncCurrentUserPoints().catch(() => {});
    setInterval(() => syncCurrentUserPoints().catch(() => {}), 3000);
  });
})();