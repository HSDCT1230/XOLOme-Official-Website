const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const contactDialog = document.querySelector("[data-contact-dialog]");
const contactOpeners = document.querySelectorAll("[data-contact-open]");
const contactCloser = document.querySelector("[data-contact-close]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastDialogTrigger = null;
let scrollAnimFrame = 0;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

/** Home anchors (#top / #hero) are not “section deep links”. */
const HOME_HASHES = new Set(["", "#", "#top", "#hero"]);

function getLocationHash() {
  return location.hash || "";
}

function forceScrollTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// Always open on page 1 (hero). In-page hash clicks still work after load.
forceScrollTop();

function clearEntryHash() {
  if (!location.hash) {
    return;
  }
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

function updateViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--xo-live-viewport", `${Math.round(viewportHeight)}px`);
}

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function updateBodyLock() {
  document.body.style.overflow =
    header.classList.contains("menu-open") || contactDialog.open ? "hidden" : "";
}

function closeMenu() {
  header.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
  updateBodyLock();
}

function openContact(trigger) {
  lastDialogTrigger = trigger;
  closeMenu();
  if (!contactDialog.open) {
    contactDialog.showModal();
  }
  updateBodyLock();
}

function getAnchorOffset() {
  const scrollPaddingTop = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  const fallback = header.getBoundingClientRect().height - 28;
  return Number.isFinite(scrollPaddingTop) ? scrollPaddingTop : Math.max(0, fallback);
}

function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function cancelScrollAnimation() {
  if (scrollAnimFrame) {
    window.cancelAnimationFrame(scrollAnimFrame);
    scrollAnimFrame = 0;
  }
}

function animateScrollTo(top, onComplete) {
  cancelScrollAnimation();

  if (reduceMotion) {
    window.scrollTo({ top, behavior: "auto" });
    onComplete?.();
    return;
  }

  const start = window.scrollY;
  const delta = top - start;
  if (Math.abs(delta) < 1) {
    onComplete?.();
    return;
  }

  const duration = Math.min(1100, Math.max(560, Math.abs(delta) * 0.62));
  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    window.scrollTo({ top: start + delta * easeInOutQuint(progress), behavior: "auto" });
    if (progress < 1) {
      scrollAnimFrame = window.requestAnimationFrame(step);
      return;
    }
    scrollAnimFrame = 0;
    onComplete?.();
  };

  scrollAnimFrame = window.requestAnimationFrame(step);
}

function revealWithin(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => {
    el.classList.add("is-revealed");
    el.classList.remove("is-reveal-warming");
  });
}

function clearRevealWarming(el) {
  el.classList.remove("is-reveal-warming");
}

function markRevealed(el) {
  el.classList.add("is-revealed");

  const onDone = (event) => {
    if (event && event.target !== el) {
      return;
    }
    clearRevealWarming(el);
    el.removeEventListener("transitionend", onDone);
  };

  el.addEventListener("transitionend", onDone);
  window.setTimeout(() => {
    clearRevealWarming(el);
    el.removeEventListener("transitionend", onDone);
  }, 1200);
}

function scrollToHash(hash, options = {}) {
  if (!hash || HOME_HASHES.has(hash)) {
    forceScrollTop();
    if (options.updateHistory !== false && hash && hash !== "#") {
      history.replaceState(null, "", hash);
    }
    return;
  }

  const target = document.querySelector(hash);
  if (!target) {
    forceScrollTop();
    return;
  }

  const anchorOffset = getAnchorOffset();
  const targetRect = target.getBoundingClientRect();
  const targetTop = targetRect.top + window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  let desiredTop = targetTop - anchorOffset;

  if (target.dataset.scrollAlign === "media" && window.innerWidth > 960) {
    const availableHeight = Math.max(0, window.innerHeight - anchorOffset);
    const visibleTargetHeight = Math.min(targetRect.height, availableHeight);
    const centerOffset = Math.max(0, (availableHeight - visibleTargetHeight) / 2);
    desiredTop -= centerOffset;
  }

  const top = Math.max(0, Math.min(desiredTop, maxScroll));
  const section = target.closest("section") || target;

  animateScrollTo(top, () => revealWithin(section));

  if (options.updateHistory !== false) {
    history.replaceState(null, "", hash);
  }
}

function initSectionReveals() {
  const revealTargets = [
    [".intro-band__copy", "copy", 0],
    [".intro-band__rail", "media", 120],
    [".x1-band > .section-head", "copy", 0],
    [".x1-stage__copy", "copy", 80],
    [".x1-stage__media .tile", "media", 0],
    [".collab-band > .section-head", "copy", 0],
    [".collab-stage__copy", "copy", 70],
    [".collab-stage__media", "media", 140],
    [".expo-gallery__item", "media", 0],
    [".collab-band__footer", "soft", 60],
    [".about-stage__copy", "copy", 0],
    [".about-stage__aside", "media", 110],
    [".contact-band__copy", "copy", 0],
    [".contact-band__aside", "media", 100],
  ];

  const nodes = [];
  revealTargets.forEach(([selector, kind, baseDelay]) => {
    document.querySelectorAll(selector).forEach((el, index) => {
      if (el.hasAttribute("data-reveal")) {
        return;
      }
      el.dataset.reveal = kind;
      el.style.setProperty("--reveal-delay", `${baseDelay + index * 70}ms`);
      nodes.push(el);
    });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  // Reveal anything already on screen before enabling hide styles — avoids a flash.
  nodes.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.82 && rect.bottom > 40) {
      el.classList.add("is-revealed");
    }
  });

  document.documentElement.classList.add("has-reveal-motion");

  const warmObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target.classList.contains("is-revealed")) {
          return;
        }
        entry.target.classList.add("is-reveal-warming");
      });
    },
    { rootMargin: "40% 0px 40% 0px", threshold: 0 },
  );

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        const el = entry.target;
        el.classList.add("is-reveal-warming");
        markRevealed(el);
        warmObserver.unobserve(el);
        obs.unobserve(el);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -10% 0px" },
  );

  nodes.forEach((el) => {
    if (!el.classList.contains("is-revealed")) {
      warmObserver.observe(el);
      observer.observe(el);
    }
  });
}

window.addEventListener("wheel", cancelScrollAnimation, { passive: true });
window.addEventListener("touchstart", cancelScrollAnimation, { passive: true });
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
    cancelScrollAnimation();
  }
});

menuButton.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  updateBodyLock();
});

document.addEventListener("click", (event) => {
  if (header.classList.contains("menu-open") && !header.contains(event.target)) {
    closeMenu();
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) =>
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    if (!hash || !hash.startsWith("#")) {
      return;
    }

    event.preventDefault();
    closeMenu();
    if (contactDialog.open) {
      contactDialog.close();
    }
    window.requestAnimationFrame(() => scrollToHash(hash));
  }),
);

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", () => {
  updateViewportHeight();
  if (window.innerWidth > 960) {
    closeMenu();
  }
});
window.visualViewport?.addEventListener("resize", updateViewportHeight, { passive: true });
window.addEventListener("orientationchange", updateViewportHeight, { passive: true });
updateViewportHeight();
updateHeader();

function restoreScrollOnEntry() {
  // Fresh open / refresh always lands on the first page, even if the URL still
  // carries a leftover section hash from the previous visit.
  clearEntryHash();
  forceScrollTop();
  window.requestAnimationFrame(() => window.requestAnimationFrame(forceScrollTop));
  window.setTimeout(forceScrollTop, 0);
  window.setTimeout(forceScrollTop, 120);
  window.setTimeout(forceScrollTop, 360);
}

window.addEventListener("DOMContentLoaded", () => {
  clearEntryHash();
  forceScrollTop();
});

window.addEventListener("load", restoreScrollOnEntry);

// bfcache restore skips `load`; re-apply the same top rule.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    restoreScrollOnEntry();
  }
});

contactOpeners.forEach((opener) =>
  opener.addEventListener("click", () => {
    openContact(opener);
  }),
);

contactCloser.addEventListener("click", () => contactDialog.close());
contactDialog.addEventListener("close", () => {
  updateBodyLock();
  if (lastDialogTrigger && document.contains(lastDialogTrigger)) {
    lastDialogTrigger.focus();
  }
  lastDialogTrigger = null;
});
contactDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  contactDialog.close();
});
contactDialog.addEventListener("click", (event) => {
  if (event.target === contactDialog) {
    contactDialog.close();
  }
});

const lazyVideos = document.querySelectorAll("[data-lazy-video]");
if ("IntersectionObserver" in window && lazyVideos.length > 0) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const video = entry.target;
        const src = video.dataset.src;
        if (src && !video.src) {
          video.src = src;
          video.load();
          if (video.autoplay) {
            video.play().catch(() => {});
          }
        }
        obs.unobserve(video);
      });
    },
    { threshold: 0.35, rootMargin: "200px 0px" },
  );

  lazyVideos.forEach((video) => observer.observe(video));
} else {
  lazyVideos.forEach((video) => {
    const src = video.dataset.src;
    if (src && !video.src) {
      video.src = src;
      video.load();
    }
  });
}

if (reduceMotion) {
  document.querySelectorAll("video").forEach((video) => {
    video.removeAttribute("autoplay");
    video.pause();
  });
}

initSectionReveals();
