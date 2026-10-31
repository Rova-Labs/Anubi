// أنوبي بورتال - النسخة الاحترافية المطورة لحماية البيانات وإدارة النقاط ديناميكياً
(function () {
  const DB_NAME = "anubi_portal_db";
  const DB_VERSION = 1;
  const ACCOUNTS_STORE = "accounts";
  const LOGIN_HISTORY_STORE = "login_history";
  const POINTS_HISTORY_STORE = "points_history";

  let dbPromise;
  let lastSyncedPoints = null;

  // إعدادات تحدي السرعة والقفل
  let speedInterval;
  let speedTime = 20;
  let challengeActive = false;

  // --- بنك الإجابات الصحيحة والدرجات الخاصة بالقصص والموقع ---
  const QUIZ_DATABASE = {
    "nubian_language": {
      ans1: ["إدريس", "idris"],
      ans2: ["دبابة", "tank", "الدبابة"],
      basePoints: 10,
      speedBonus: 20
    },
    "default": {
      basePoints: 10,
      speedBonus: 15
    }
  };

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
    
    // تحديث واجهة المستخدم فوراً بالنقاط الجديدة إذا كان العنصر موجوداً بالصفحة
    const uiPointsElement = document.getElementById("ui-user-points");
    if (uiPointsElement) uiPointsElement.innerText = points;
  }

  function logout() {
    localStorage.clear();
    window.location.href = "index.html";
  }

  // --- محرك الصوت الذكي (احترافية رويدا المطورة) ---
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
    utterance.rate = (options && options.rate) || 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleSpeak(text, options) {
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    speakText(text, options);
  }

  // --- إدارة قفل القصص والتحديات التفاعلية ---
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
        toggleSpeak("رائع، يمكنك الآن حل الاختبار للحصول على النقاط!");
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
// --- محرك احتساب الدرجات وإضافة النقاط الذكي تلقائياً للموقع ---
async function checkStoryAnswers(storyId = "nubian_language") {
const a1 = document.getElementById("ans1")?.value.trim().toLowerCase() || "";
const a2 = document.getElementById("ans2")?.value.trim().toLowerCase() || "";
const feedback = document.getElementById("feedback");
// جلب بيانات الإجابات الصحيحة بناءً على قصة الموقع الحالية
const currentQuiz = QUIZ_DATABASE[storyId] || QUIZ_DATABASE["default"];
// مصفوفة التحقق الذكي من الكلمات المفتاحية للإجابة الصحيحة
const isFirstCorrect = currentQuiz.ans1 ? currentQuiz.ans1.some(keyword => a1.includes(keyword)) : true;
const isSecondCorrect = currentQuiz.ans2 ? currentQuiz.ans2.some(keyword => a2.includes(keyword)) : true;
if (isFirstCorrect && isSecondCorrect) {
let earnedPoints = currentQuiz.basePoints;
let updateMessage = إجابة صحيحة مذهلة! لقد حصلت على +${earnedPoints} نقطة.;
// إضافة نقاط البونص الإضافية إذا كان تحدي السرعة فعالاً
if (challengeActive && speedTime > 0) {
clearInterval(speedInterval);
challengeActive = false;
earnedPoints += currentQuiz.speedBonus;
localStorage.setItem("userBadge", "صاروخ السرعة ⚡");
updateMessage = عبقري وسريع! تم تفعيل وسام صاروخ السرعة وحصلت على بونص إضافي! إجمالي النقاط المكتسبة: +${earnedPoints} نقطة.;
}
// تحديث نقاط المستخدم محلياً وفي قاعدة البيانات المشفرة آلياً
let currentPoints = parseInt(localStorage.getItem("points") || "0", 10) + earnedPoints;
localStorage.setItem("points", String(currentPoints));
await syncCurrentUserPoints();
if (feedback) {
feedback.className = "feedback-success";
feedback.innerText = updateMessage;
}
toggleSpeak("عمل ممتاز يا مستكشف! إجابتك صحيحة تماماً.");
} else {
if (feedback) {
feedback.className = "feedback-error";
feedback.innerText = "بعض الإجابات غير دقيقة، حاول قراءة الرموز التاريخية مجدداً!";
}
toggleSpeak("حاول مرة أخرى، أنا أثق بقدراتك.");
}
}
// --- ميزة التخاطب والاتصال الآمن والمشفر مع أنوبي عبر Vercel Backend ---
async function askAnubiAI(userMessage, displayCallback) {
try {
const response = await fetch('/api/chat', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ message: userMessage })
});
const data = await response.json();
if (data.choices && data.choices[0]) {
const reply = data.choices[0].message.content;
if (displayCallback) displayCallback(reply, 'bot');
speakText(reply);
} else {
throw new Error("تنسيق رد غير مدعوم من البوابة الزمنية");
}
} catch (error) {
console.error("عطل أثناء الاتصال بالسيرفر الخلفي المأمن:", error);
if (displayCallback) displayCallback("يا مستكشف بوابة الزمن مشغولة حالياً، يرجى المحاولة بعد لحظات!", 'bot');
}
}
function runEnhancements() {
document.body.classList.add("enhanced-ui");
if (document.getElementById("reading-timer")) initStoryLock();
const logoutButton = document.getElementById("logoutBtn");
if (logoutButton) logoutButton.addEventListener("click", logout);
}
// تصدير الأدوات إلى النطاق العالمي للمشروع لتشغيلها من أي صفحة HTML
window.AnubiCore = {
ensureAccount,
syncCurrentUserPoints,
logout,
speakText,
toggleSpeak,
startSpeedChallenge,
checkStoryAnswers,
askAnubiAI
};
document.addEventListener("DOMContentLoaded", () => {
runEnhancements();
syncCurrentUserPoints().catch(() => {});
// فحص دوري ذكي لضمان مزامنة درجات الموقع مع الحساب بدون أي تأخير
setInterval(() => syncCurrentUserPoints().catch(() => {}), 2500);
});
})();