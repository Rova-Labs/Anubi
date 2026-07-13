(function () {
  const KEY = 'siteLang';

  const dict = {
    ar: {
      button: 'English',
      points_label: 'النقاط',
      pages: {
        'index.html': { title: 'تسجيل الدخول', h2: 'بوابة الزمن - تسجيل الدخول', firstName: 'الاسم الأول', lastName: 'اسم العائلة', password: 'كلمة موررك', login: 'دخول', male: 'ولد', female: 'بنت' },
        'home.html': { title: 'الرئيسية - أنوبي', h1: 'مرحبًا بك مع أنوبي 🤖', h2: 'اختر قصة:', note: '👆 اضغط على أنوبي لتبدأ مغامرتك!', profile: 'الملف الشخصي', username: '👤 اسم المستخدم:', pass: '🔑 كلمة المرور:', points: '⭐ النقاط:', suggest: '💬 أرسل اقتراحك:', send: 'إرسال', logout: 'تسجيل الخروج', stories: ['📜 سراديب الخلود', '🧜 عروس القناة', '🏺 عاصمة الفخار', '🏰 حارس البحر', '🏙 المدينة المفقودة', '🌾 قرية دنشواي', '🔐 اللهجة النوبية', 'من نحن؟'] },
        'intro.html': { title: 'من نحن - أنوبي', h1: 'من نحن', h2: ['فكرة الموقع', 'فكرة اسم أنوبي', 'الفئة العمرية', 'أدوات الذكاء الاصطناعي', 'المطور', 'المشرف', 'فريق العمل'], back: '🔙 العودة للرئيسية' },
        
        // قالب موحد لكل القصص (story1.html إلى story7.html)
        'shared_story': {
          h2: ['📺 فيديوهات تعريفية', '🖼️ صور توضيحية', '🧠 اختبر معلوماتك!'],
          readingMsg: '📖 من فضلك اقرأ القصة.. سيفتح الاختبار بعد ',
          seconds: ' ثانية',
          speedBadge: '🏅 بطل الشفرة السريع!',
          button: 'تحقق من الإجابة ✅',
          back: '🔙 العودة للصفحة الرئيسية'
        },
        
        // تفاصيل أسئلة صفحة النوبة (Story 7)
        'story7.html': {
          h1: 'اللهجة النوبية سر الانتصار',
          labels: ['1. ما اسم الجندي صاحب فكرة الشفرة؟', '2. لماذا اختيرت اللغة النوبية؟', '3. ماذا تسمى "الدبابة" في الشفرة؟'],
          placeholders: ['اكتب الاسم هنا...', 'اكتب السبب...'],
          results: { success: '✅ إجابات صحيحة! حصلت على ', fail: '❌ هناك خطأ، حاول مرة أخرى' }
        },

        'story5.html': {
            h1: 'هيراكليون - المدينة المفقودة',
            labels: ['1. ما هو الاسم الآخر للمدينة؟', '2. أين تقع المدينة الآن؟'],
            placeholders: ['اكتب الاسم...', 'اكتب الموقع...']
        }
        // يمكنك إضافة باقي القصص بنفس الطريقة هنا
      }
    },
    en: {
      button: 'العربية',
      points_label: 'Points',
      pages: {
        'index.html': { title: 'Login', h2: 'Time Gate - Login', firstName: 'First Name', lastName: 'Last Name', password: 'Password', login: 'Enter', male: 'Boy', female: 'Girl' },
        'home.html': { title: 'Home - Anubi', h1: 'Welcome with Anubi 🤖', h2: 'Choose a story:', note: '👆 Click Anubi to start!', profile: 'Profile', username: '👤 Username:', pass: '🔑 Password:', points: '⭐ Points:', suggest: '💬 Suggestion:', send: 'Send', logout: 'Logout', stories: ['📜 Eternity Crypts', '🧜 Bride of Canal', '🏺 Pottery Capital', '🏰 Sea Guard', '🏙 Lost City', '🌾 Denshawai Village', '🔐 Nubian Code', 'About Us'] },
        'intro.html': { title: 'About Us - Anubi', h1: 'About Us', h2: ['Concept', 'Name Idea', 'Age Group', 'AI Tools', 'Developer', 'Supervisor', 'Team'], back: '🔙 Back to Home' },
        
        'shared_story': {
          h2: ['📺 Intro Videos', '🖼️ Illustrative Photos', '🧠 Test Your Knowledge!'],
          readingMsg: '📖 Please read carefully.. Quiz opens in ',
          seconds: ' seconds',
          speedBadge: '🏅 Fast Code Hero!',
          button: 'Check Answer ✅',
          back: '🔙 Back to Home'
        },
        
        'story7.html': {
          h1: 'Nubian Dialect - Victory Secret',
          labels: ['1. Name of the soldier?', '2. Why Nubian language?', '3. What is "Tank" in code?'],
          placeholders: ['Type name...', 'Type reason...'],
          results: { success: '✅ Correct! You got ', fail: '❌ Error, try again' }
        }
      }
    }
  };

  function getLang() { return localStorage.getItem(KEY) || 'ar'; }
  function setLang(l) { localStorage.setItem(KEY, l); location.reload(); }
  function page() { return location.pathname.split('/').pop() || 'index.html'; }

  function apply() {
    const lang = getLang();
    const p = page();
    const t = dict[lang].pages[p] || {};
    const common = dict[lang].pages['shared_story'] || {};

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // ترجمة زر اللغة والنقاط
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.textContent = dict[lang].button;
    
    const ptsLabel = document.querySelector('[data-i18n="points_label"]');
    if (ptsLabel) ptsLabel.textContent = dict[lang].points_label;

    // ترجمة محتوى القصة المشترك (مؤقت، أزرار، عناوين h2)
    if (p.includes('story') || p === 'sirdab.html') {
      const lockText = document.getElementById('lock-text-msg');
      if (lockText) lockText.textContent = common.readingMsg;
      
      const secWord = document.getElementById('sec-word');
      if (secWord) secWord.textContent = common.seconds;

      const badge = document.getElementById('speed-badge');
      if (badge) badge.textContent = common.speedBadge;

      const h1 = document.querySelector('h1');
      if (h1 && t.h1) h1.textContent = t.h1;

      const h2s = document.querySelectorAll('h2');
      common.h2.forEach((text, i) => { if (h2s[i]) h2s[i].textContent = text; });

      const labels = document.querySelectorAll('.quiz-card label, .quiz label');
      if (t.labels) t.labels.forEach((text, i) => { if (labels[i]) labels[i].textContent = text; });

      const inputs = document.querySelectorAll('input[type="text"]');
      if (t.placeholders) t.placeholders.forEach((text, i) => { if (inputs[i]) inputs[i].placeholder = text; });

      const submitBtn = document.querySelector('.btn-submit');
      if (submitBtn) submitBtn.textContent = common.button;
    }

    // ترجمة صفحة الرئيسية (home.html)
    if (p === 'home.html') {
        const stories = document.querySelectorAll('.story-card span, .story-list li');
        if (t.stories) t.stories.forEach((text, i) => { if (stories[i]) stories[i].textContent = text; });
    }
  }

  window.toggleLanguage = function() {
    setLang(getLang() === 'ar' ? 'en' : 'ar');
  };

  document.addEventListener('DOMContentLoaded', apply);
})();