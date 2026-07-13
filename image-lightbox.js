(function () {
  let overlay;
  let imgEl;
  let captionEl;
  let closeBtn;

  function langText(arText, enText) {
    const lang = (window.SiteI18n && window.SiteI18n.getLang && window.SiteI18n.getLang()) || "ar";
    return lang === "en" ? enText : arText;
  }

  function ensureModal() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.className = "image-lightbox";
    overlay.innerHTML = [
      '<div class="image-lightbox-inner">',
      '  <button type="button" class="image-lightbox-close" aria-label="Close">×</button>',
      '  <img class="image-lightbox-img" alt="story image" />',
      '  <p class="image-lightbox-caption"></p>',
      '</div>'
    ].join("");

    document.body.appendChild(overlay);

    imgEl = overlay.querySelector(".image-lightbox-img");
    captionEl = overlay.querySelector(".image-lightbox-caption");
    closeBtn = overlay.querySelector(".image-lightbox-close");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    refreshText();
  }

  function open(src, altText) {
    ensureModal();
    imgEl.src = src;
    imgEl.alt = altText || "story image";
    captionEl.textContent = altText || langText("صورة من القصة", "Story image");
    overlay.classList.add("open");
    document.body.classList.add("lightbox-open");
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("lightbox-open");
  }

  function refreshText() {
    if (!closeBtn || !captionEl) return;
    closeBtn.setAttribute("aria-label", langText("إغلاق", "Close"));
    if (!captionEl.textContent) {
      captionEl.textContent = langText("اضغط خارج الصورة للإغلاق", "Click outside image to close");
    }
  }

  function bindImages() {
    const images = document.querySelectorAll(".gallery img, .content img");
    images.forEach((img) => {
      if (img.dataset.lightboxBound === "1") return;
      img.dataset.lightboxBound = "1";
      img.classList.add("clickable-story-image");
      img.addEventListener("click", function () {
        open(img.src, img.alt || "");
      });
    });
  }

  window.ImageLightboxI18n = {
    refresh: refreshText
  };

  document.addEventListener("DOMContentLoaded", function () {
    bindImages();
    ensureModal();
  });
})();
