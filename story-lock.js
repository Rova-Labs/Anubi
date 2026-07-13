(function () {
  function tt(ar, en) {
    const lang = (window.SiteI18n && window.SiteI18n.getLang && window.SiteI18n.getLang()) || "ar";
    return lang === "en" ? en : ar;
  }

  function asPercent(value, max) {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  }

  function viewportRatio(el) {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return Math.max(0, visible) / Math.max(1, rect.height);
  }

  function pageScrollPercent() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    if (max <= 0) return 100;
    return Math.round((doc.scrollTop / max) * 100);
  }

  function initStoryLock() {
    const quiz = document.querySelector(".quiz");
    if (!quiz) return;

    const submitButton = quiz.querySelector('button[type="button"], button');
    const inputs = Array.from(quiz.querySelectorAll("input, textarea, select, button"));
    const resultBox = document.getElementById("result");
    const videoSection = document.querySelector(".video-container");

    const minReadSeconds = 35;
    const minVideoSeconds = 20;
    const minScrollPercent = 55;

    const state = { readSeconds: 0, videoSeconds: 0, readDone: false, videoDone: false };

    const gate = document.createElement("div");
    gate.className = "story-gate-box";
    gate.innerHTML = [
      '<h3 class="story-gate-title" id="gateTitle"></h3>',
      '<ul class="story-gate-list">',
      '  <li><span id="gateReadState" class="story-gate-status">⏳</span> <span id="gateReadText"></span></li>',
      '  <li><span id="gateVideoState" class="story-gate-status">⏳</span> <span id="gateVideoText"></span></li>',
      '</ul>',
      '<div class="story-gate-note" id="gateProgress"></div>'
    ].join("");

    quiz.parentNode.insertBefore(gate, quiz);
    quiz.classList.add("quiz-locked");

    inputs.forEach((el) => { el.disabled = true; });

    function setGateLabels() {
      const t = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
      t("gateTitle", tt("فتح اختبار القصة", "Unlock Story Quiz"));
      t("gateReadText", tt("قراءة القصة بتركيز (التمرير حتى 55% على الأقل)", "Read the story attentively (scroll to at least 55%)"));
      t("gateVideoText", tt("مشاهدة الفيديو داخل الصفحة لمدة كافية", "Watch the on-page video long enough"));
    }

    function unlockQuiz() {
      quiz.classList.remove("quiz-locked");
      quiz.classList.add("quiz-unlocked");
      inputs.forEach((el) => { el.disabled = false; });
      const progress = document.getElementById("gateProgress");
      if (progress) progress.textContent = tt("تم فتح الاختبار. يمكنك الآن حل الأسئلة.", "Quiz unlocked. You can answer now.");
    }

    function updateUi() {
      const readState = document.getElementById("gateReadState");
      const videoState = document.getElementById("gateVideoState");
      const progress = document.getElementById("gateProgress");

      if (readState) readState.textContent = state.readDone ? "✅" : "⏳";
      if (videoState) videoState.textContent = state.videoDone ? "✅" : "⏳";

      if (progress && !(state.readDone && state.videoDone)) {
        const readPct = asPercent(state.readSeconds, minReadSeconds);
        const videoPct = asPercent(state.videoSeconds, minVideoSeconds);
        progress.textContent = tt("القراءة: ", "Reading: ") + readPct + "% | " + tt("الفيديو: ", "Video: ") + videoPct + "%";
      }

      if (state.readDone && state.videoDone) unlockQuiz();
    }

    setGateLabels();

    const timer = setInterval(() => {
      if (!state.readDone) {
        const scroll = pageScrollPercent();
        if (scroll >= minScrollPercent) state.readSeconds += 1;
        if (state.readSeconds >= minReadSeconds) state.readDone = true;
      }

      if (!state.videoDone && videoSection) {
        if (viewportRatio(videoSection) >= 0.6) state.videoSeconds += 1;
        if (state.videoSeconds >= minVideoSeconds) state.videoDone = true;
      }

      updateUi();
      if (state.readDone && state.videoDone) clearInterval(timer);
    }, 1000);

    if (submitButton) {
      submitButton.addEventListener("click", function () {
        if ((!state.readDone || !state.videoDone) && resultBox) {
          resultBox.textContent = tt("لا يمكن حل الأسئلة قبل قراءة القصة ومشاهدة الفيديو.", "You cannot solve the quiz before reading the story and watching the video.");
        }
      });
    }

    window.StoryLockI18n = {
      refresh: function () {
        setGateLabels();
        updateUi();
      }
    };
  }

  document.addEventListener("DOMContentLoaded", initStoryLock);
})();
