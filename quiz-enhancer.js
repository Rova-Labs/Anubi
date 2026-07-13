(function () {
  // 1. تنظيف الأرقام وتحويلها من العربية إلى الإنجليزية
  function normalizeArabicDigits(text) {
    const map = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' };
    return String(text || '').replace(/[٠-٩]/g, function (d) { return map[d]; });
  }

  // 2. معالجة النصوص (إزالة التشكيل وتوحيد الحروف المتشابهة)
  function normalizeText(text) {
    return normalizeArabicDigits(String(text || ''))
      .toLowerCase()
      .replace(/[أإآا]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[\u064B-\u0652]/g, '') // إزالة التشكيل
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 3. خوارزمية قياس التشابه بين الإجابات
  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, function () { return new Array(n + 1).fill(0); });
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;

    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  function closeEnough(answer, expected) {
    const a = normalizeText(answer);
    const e = normalizeText(expected);
    if (!a || !e) return false;
    if (a === e) return true;
    if ((a.length >= 3 && e.includes(a)) || (e.length >= 3 && a.includes(e))) return true;

    const dist = levenshtein(a, e);
    const max = Math.max(a.length, e.length);
    return dist <= Math.max(1, Math.floor(max * 0.25));
  }

  function matchAny(answer, expectedList) {
    return expectedList.some(function (item) { return closeEnough(answer, item); });
  }

  // 4. جلب اسم الصفحة بذكاء (لحل مشكلة Netlify)
  function getCleanPageName() {
    let path = window.location.pathname.split('/').pop() || 'index.html';
    return path.toLowerCase().replace('.html', ''); // نحذف .html دائماً للمقارنة
  }

  // 5. إعدادات الإجابات لكل صفحة
  function getConfig() {
    const page = getCleanPageName();
    const base = {
      scoreMax: 3,
      q3: function () {
        const selected = document.querySelector('input[name="q3"]:checked');
        return !!selected && selected.value === 'صحيح';
      }
    };

    // ملاحظة: الأسماء هنا بدون .html لضمان التوافق
    const map = {
      'sirdab': { 
        q1: function (v) { return matchAny(v, ['الاقصر', 'الأقصر', 'luxor', 'لوكسور']); },
        q2: function (v) { const n = normalizeArabicDigits(v); return n.includes('60') || n.includes('63'); }
      },
      'story2': {
        q1: function (v) { return normalizeArabicDigits(v).includes('1863'); },
        q2: function (v) { return matchAny(v, ['الخديوي اسماعيل', 'اسماعيل', 'khedive ismail']); }
      },
      'story3': {
        q1: function (v) { return matchAny(v, ['الفيوم', 'fayoum']); },
        q2: function (v) { return matchAny(v, ['الفخار', 'فخار', 'pottery']); }
      },
      'story4': {
        q1: function (v) { return matchAny(v, ['الاسكندريه', 'الإسكندرية', 'alexandria']); },
        q2: function (v) { return matchAny(v, ['قايتباي', 'الاشرف قايتباي', 'qaitbay']); }
      },
      'story5': {
        q1: function (v) { return matchAny(v, ['هيراكليون', 'ثونيس', 'heracleion', 'thonis']); },
        q2: function (v) { return matchAny(v, ['مصب النيل', 'الفرع الغربي للنيل', ' الاسكندرية', 'nile', 'egypt']); }
      },
      'story6': {
        q1: function (v) { return normalizeArabicDigits(v).includes('1906'); },
        q2: function (v) {
          return matchAny(v, ['حريق اجران القمح', 'اشعلوا النار', 'صيد الضباط', 'ضباط انجليز للصيد', 'fire in wheat barns']);
        }
      },
      'story7': {
        q1: function (v) { return matchAny(v, ['أحمد إدريس', 'احمد ادريس', 'ahmed edrees']); },
        q2: function (v) { return matchAny(v, ['تمساحاً', 'تمساح','دبابة', 'للإشارة للدبابة',]); }
      }
    };

    return Object.assign({}, base, map[page] || {});
  }

  function langText(ar, en) {
    const lang = (window.SiteI18n && window.SiteI18n.getLang) ? window.SiteI18n.getLang() : 'ar';
    return lang === 'en' ? en : ar;
  }

  // 6. تنفيذ عملية التقييم
  function evaluateQuiz() {
    const cfg = getConfig();
    if (!cfg.q1 || !cfg.q2) {
        console.error("لم يتم العثور على إعدادات لهذه الصفحة: " + getCleanPageName());
        return;
    }

    const q1 = (document.getElementById('q1') || {}).value || '';
    const q2 = (document.getElementById('q2') || {}).value || '';
    const result = document.getElementById('result');
    if (!result) return;

    let score = 0;
    if (cfg.q1(q1)) score += 1;
    if (cfg.q2(q2)) score += 1;
    if (cfg.q3()) score += 1;

    const page = getCleanPageName();
    const rewardKey = 'quiz_done_' + page;

    if (score === cfg.scoreMax) {
      result.style.color = 'lightgreen';
      const alreadyRewarded = localStorage.getItem(rewardKey) === '1';
      if (!alreadyRewarded) {
        const points = parseInt(localStorage.getItem('points') || '0', 10) + 10;
        localStorage.setItem('points', String(points));
        const p = document.getElementById('points');
        if (p) p.textContent = String(points);
        localStorage.setItem(rewardKey, '1');
        result.textContent = langText('إجابات ممتازة! تم إضافة 10 نقاط ✅', 'Great answers! 10 points added ✅');
      } else {
        result.textContent = langText('إجاباتك صحيحة ✅ تم احتساب نقاط هذه القصة مسبقًا.', 'Correct ✅ Points for this story were already counted.');
      }
    } else {
      result.style.color = 'tomato';
      result.textContent = langText('حصلت على ' + score + ' من 3. حاول مرة أخرى.', 'You got ' + score + ' out of 3. Try again.');
    }
  }

  // 7. ربط الزر بالدالة
  function bindQuizButton() {
    const btn = document.querySelector('.quiz button');
    if (!btn) return;

    // إزالة أي onclick قديم لمنع التضارب
    btn.removeAttribute('onclick'); 
    
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      evaluateQuiz();
    });
  }

  // تشغيل عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindQuizButton);
  } else {
    bindQuizButton();
  }

  // جعل الدالة متاحة عالمياً للطوارئ
  window.checkAnswers = evaluateQuiz;
})();