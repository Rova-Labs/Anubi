(function () {
  function page() {
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function ensureVideoEmbeds() {
    const iframes = document.querySelectorAll('.video-container iframe');
    iframes.forEach(function (frame) {
      frame.setAttribute('loading', 'lazy');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      frame.style.display = 'block';

      if (frame.src.indexOf('youtube.com/embed/') >= 0) {
        frame.src = frame.src.replace('https://www.youtube.com/embed/', 'https://www.youtube-nocookie.com/embed/');
      }

      if (!frame.parentElement.querySelector('.video-fallback-link[data-src="' + frame.src + '"]')) {
        const link = document.createElement('a');
        link.className = 'video-fallback-link';
        link.href = frame.src;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.dataset.src = frame.src;
      }
    });
  }

  function ensureHomeLinks() {
    if (page() !== 'home.html') return;
    const list = document.querySelector('.story-list');
    if (!list) return;

    const needed = [
      { href: 'sirdab.html', text: '📜 سراديب الخلود - وادي الملوك' },
      { href: 'story2.html', text: '🧜 عروس القناة - مدينة الإسماعيلية' },
      { href: 'story3.html', text: '🏺 عاصمة الفخار - قرية تونس' },
      { href: 'story4.html', text: '🏰 حارس البحر - قلعة قايتباي' },
      { href: 'story5.html', text: '🏙 المدينة المفقودة - هيراكليون' },
      { href: 'story6.html', text: '🌾 قرية دنشواي - الصحوة المصرية' },
      { href: 'story7.html', text: '🔐 اللهجة النوبية سر الانتصار' },
      { href: 'intro.html', text: 'من نحن ؟' }
    ];

    needed.forEach(function (item) {
      if (!list.querySelector('a[href="' + item.href + '"]')) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.text;
        li.appendChild(a);
        list.appendChild(li);
      }
    });
  }

  function ensureStoryNav() {
    const storyPages = ['sirdab.html', 'story2.html', 'story3.html', 'story4.html', 'story5.html', 'story6.html', 'story7.html'];
    if (!storyPages.includes(page())) return;
    if (document.querySelector('.story-nav')) return;

    const nav = document.createElement('div');
    nav.className = 'story-nav';
    nav.innerHTML = [
      '<a href="home.html">🏠 الرئيسية</a>',
      '<a href="sirdab.html">وادي الملوك</a>',
      '<a href="story2.html">الإسماعيلية</a>',
      '<a href="story3.html">تونس الفيوم</a>',
      '<a href="story4.html">قايتباي</a>',
      '<a href="story5.html">هيراكليون</a>',
      '<a href="story6.html">دنشواي</a>',
      '<a href="story7.html">اللهجة النوبية</a>'
    ].join('');

    const content = document.querySelector('.content, .container');
    if (content) content.appendChild(nav);
  }

  function ensureExtraInfo() {
    const map = {
      'sirdab.html': 'معلومة إضافية: كثير من مقابر وادي الملوك مزينة بنصوص دينية من كتاب الموتى، وكانت تهدف لحماية الملك في رحلته للعالم الآخر.',
      'story2.html': 'معلومة إضافية: لعبت الإسماعيلية دورًا في حماية محور القناة، كما أن موقعها جعلها مركزًا تعليميًا وثقافيًا مهمًا في مدن القناة.',
      'story3.html': 'معلومة إضافية: تشتهر ورش القرية بتعليم الأطفال مهارات التصميم والحرق والتلوين، مما يجعلها مركزًا حيًا للفنون اليدوية.',
      'story4.html': 'معلومة إضافية: موقع القلعة فوق موضع منارة الإسكندرية القديمة يمنحها قيمة تاريخية وعسكرية فريدة على ساحل المتوسط.',
      'story5.html': 'معلومة إضافية: استخدام تقنيات المسح تحت الماء ساعد العلماء على إعادة تصور تخطيط المدينة الغارقة بشكل دقيق.',
      'story6.html': 'معلومة إضافية: أثارت حادثة دنشواي صحافة وطنية واسعة، وكانت نقطة تحول في نمو الحركة الوطنية المصرية.',
      'story7.html': 'معلومة إضافية: تنوع اللهجات المصرية كان عنصر قوة، واستخدام اللهجة النوبية في الاتصالات العسكرية مثال مهم على ذلك.'
    };

    const txt = map[page()];
    if (!txt) return;
    const content = document.querySelector('.content, .container');
    if (!content || content.querySelector('.extra-info')) return;

    const box = document.createElement('div');
    box.className = 'extra-info';
    box.textContent = txt;

    const quizTitle = Array.from(content.querySelectorAll('h2')).find(function (el) {
      return el.textContent.indexOf('اختبر') >= 0 || el.textContent.indexOf('Test') >= 0;
    });

    if (quizTitle) quizTitle.insertAdjacentElement('beforebegin', box);
    else content.appendChild(box);
  }

  function ensureDesignerLine() {
    if (page() !== 'home.html') return;
    const footer = document.querySelector('footer');
    if (!footer) return;
    const firstLine = footer.querySelector('p') || footer.appendChild(document.createElement('p'));
    firstLine.textContent = 'صمم الموقع بواسطة رويدا محمد EG';
  }

  function getReadableText() {
    const container = document.querySelector('.content, .container');
    if (!container) return '';

    const parts = [];
    container.querySelectorAll('h1, h2, p').forEach(function (el) {
      const txt = (el.textContent || '').trim();
      if (txt) parts.push(txt);
    });
    return parts.join(' . ');
  }

  function upgradeRobotVoice() {
    const robot = document.querySelector('.robot img, .robot-container img');
    if (!robot) return;

    robot.onclick = function (e) {
      e.preventDefault();
      const text = getReadableText() || 'مرحبًا بك. أنا أنوبي، جاهز لمساعدتك.';
      if (window.AnubiCore && typeof window.AnubiCore.toggleSpeak === 'function') {
        window.AnubiCore.toggleSpeak(text, { rate: 0.9, pitch: 1.0 });
      } else {
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'ar-EG';
        msg.rate = 0.9;
        msg.pitch = 1.0;
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
          return;
        }
        window.speechSynthesis.speak(msg);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureVideoEmbeds();
    ensureHomeLinks();
    ensureStoryNav();
    ensureExtraInfo();
    ensureDesignerLine();
    upgradeRobotVoice();
  });
})();
