const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const contactDialog = document.querySelector("[data-contact-dialog]");
const contactOpeners = document.querySelectorAll("[data-contact-open]");
const contactCloser = document.querySelector("[data-contact-close]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastDialogTrigger = null;
let scrollAnimFrame = 0;
/** True while a click/hash scroll is animating — skip reveal resets to avoid flicker. */
let scrollLock = false;
/** Ignore cancel gestures briefly after a click-driven scroll starts. */
let scrollCancelGraceUntil = 0;
const entryTopTimers = [];

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

function clearEntryHash() {
  if (!location.hash) {
    return;
  }
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

function cancelEntryTopTimers() {
  while (entryTopTimers.length) {
    window.clearTimeout(entryTopTimers.pop());
  }
}

/** Keep the first paint pinned to the hero while the browser finishes layout. */
let entryPinning = false;

function pinEntryToHome() {
  entryPinning = true;
  cancelEntryTopTimers();
  clearEntryHash();
  forceScrollTop();

  const pin = () => forceScrollTop();
  window.requestAnimationFrame(() => window.requestAnimationFrame(pin));
  entryTopTimers.push(window.setTimeout(pin, 0));
  entryTopTimers.push(window.setTimeout(pin, 64));
  entryTopTimers.push(
    window.setTimeout(() => {
      forceScrollTop();
      entryPinning = false;
    }, 180),
  );
}

// Always open on the hero — strip leftover hashes from the previous visit.
pinEntryToHome();

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

function setMenuToggleLabel(isOpen) {
  const label = menuButton.querySelector(".sr-only");
  if (label) {
    label.textContent = isOpen ? "关闭导航" : "打开导航";
  }
  menuButton.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
}

function closeMenu({ restoreFocus = false } = {}) {
  const wasOpen = header.classList.contains("menu-open");
  header.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
  setMenuToggleLabel(false);
  updateBodyLock();
  if (restoreFocus && wasOpen) {
    menuButton.focus();
  }
}

function openMenu() {
  header.classList.add("menu-open");
  menuButton.setAttribute("aria-expanded", "true");
  setMenuToggleLabel(true);
  updateBodyLock();
  const firstItem = nav.querySelector("a, button");
  window.requestAnimationFrame(() => firstItem?.focus());
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
  const fallback = header.getBoundingClientRect().height;
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
  if (scrollLock) {
    scrollLock = false;
    resetOffscreenReveals();
  }
}

function requestUserCancelScroll() {
  if (performance.now() < scrollCancelGraceUntil) {
    return;
  }
  cancelScrollAnimation();
}

function animateScrollTo(top, onComplete) {
  if (scrollAnimFrame) {
    window.cancelAnimationFrame(scrollAnimFrame);
    scrollAnimFrame = 0;
  }

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

  scrollLock = true;
  scrollCancelGraceUntil = performance.now() + 320;
  const duration = Math.min(980, Math.max(480, Math.abs(delta) * 0.55));
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
    window.requestAnimationFrame(() => {
      resetOffscreenReveals();
      scrollLock = false;
    });
  };

  scrollAnimFrame = window.requestAnimationFrame(step);
}

function revealWithin(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-reveal]").forEach((el) => {
    if (el.classList.contains("is-revealed")) {
      return;
    }
    el.classList.add("is-reveal-warming");
    markRevealed(el);
  });
}

function clearRevealWarming(el) {
  el.classList.remove("is-reveal-warming");
}

function resetReveal(el) {
  el.style.transition = "none";
  el.classList.remove("is-revealed", "is-reveal-warming");
  void el.offsetWidth;
  el.style.transition = "";
}

function isFullyOffscreen(el) {
  const rect = el.getBoundingClientRect();
  return rect.bottom < 0 || rect.top > window.innerHeight;
}

function resetOffscreenReveals() {
  document.querySelectorAll("[data-reveal].is-revealed, [data-reveal].is-reveal-warming").forEach((el) => {
    if (isFullyOffscreen(el)) {
      resetReveal(el);
    }
  });
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
  const updateHistory = options.updateHistory !== false;
  const usePush = options.push !== false && updateHistory;

  if (!hash || HOME_HASHES.has(hash)) {
    forceScrollTop();
    resetOffscreenReveals();
    if (updateHistory) {
      if (hash === "#top" || hash === "#hero") {
        if (usePush) {
          history.pushState(null, "", hash);
        } else {
          history.replaceState(null, "", hash);
        }
      } else {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      }
    }
    return;
  }

  const target = document.querySelector(hash);
  if (!target) {
    forceScrollTop();
    resetOffscreenReveals();
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

  if (options.instant || reduceMotion) {
    window.scrollTo({ top, behavior: "auto" });
    revealWithin(section);
  } else {
    animateScrollTo(top, () => revealWithin(section));
  }

  if (updateHistory) {
    if (usePush) {
      history.pushState(null, "", hash);
    } else {
      history.replaceState(null, "", hash);
    }
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

  nodes.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.82 && rect.bottom > 40) {
      el.classList.add("is-revealed");
    }
  });

  document.documentElement.classList.add("has-reveal-motion");

  const warmObserver = new IntersectionObserver(
    (entries) => {
      if (scrollLock) {
        return;
      }
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.target.classList.contains("is-revealed")) {
          return;
        }
        entry.target.classList.add("is-reveal-warming");
      });
    },
    { rootMargin: "28% 0px 28% 0px", threshold: 0 },
  );

  const observer = new IntersectionObserver(
    (entries) => {
      if (scrollLock) {
        return;
      }
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          if (entry.intersectionRatio < 0.16 || el.classList.contains("is-revealed")) {
            return;
          }
          el.classList.add("is-reveal-warming");
          markRevealed(el);
          return;
        }

        // Only reset when fully off-screen — avoids mid-viewport opacity flashes.
        if (
          (el.classList.contains("is-revealed") || el.classList.contains("is-reveal-warming")) &&
          isFullyOffscreen(el)
        ) {
          resetReveal(el);
        }
      });
    },
    { threshold: [0, 0.18], rootMargin: "0px 0px 0px 0px" },
  );

  nodes.forEach((el) => {
    warmObserver.observe(el);
    observer.observe(el);
  });
}

window.addEventListener("wheel", requestUserCancelScroll, { passive: true });
window.addEventListener("touchmove", requestUserCancelScroll, { passive: true });
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
    requestUserCancelScroll();
  }
  if (event.key === "Escape" && header.classList.contains("menu-open")) {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
  }
});

menuButton.addEventListener("click", () => {
  if (header.classList.contains("menu-open")) {
    closeMenu({ restoreFocus: true });
  } else {
    openMenu();
  }
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
    entryPinning = false;
    cancelEntryTopTimers();
    closeMenu();
    if (contactDialog.open) {
      contactDialog.close();
    }
    window.requestAnimationFrame(() => scrollToHash(hash, { push: true }));
  }),
);

window.addEventListener("popstate", () => {
  entryPinning = false;
  cancelEntryTopTimers();
  const hash = getLocationHash() || "#top";
  scrollToHash(hash, { updateHistory: false, instant: Math.abs(window.scrollY) < 8 });
});

window.addEventListener("scroll", () => {
  if (entryPinning) {
    forceScrollTop();
    return;
  }
  updateHeader();
}, { passive: true });

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
setMenuToggleLabel(false);

function restoreScrollOnEntry() {
  pinEntryToHome();
}

window.addEventListener("DOMContentLoaded", restoreScrollOnEntry);
window.addEventListener("load", restoreScrollOnEntry);

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
contactDialog.addEventListener("click", (event) => {
  if (event.target === contactDialog) {
    contactDialog.close();
  }
});

function hydrateLazyImage(el) {
  if (el.dataset.lazyLoaded === "1") {
    return;
  }

  if (el.dataset.lazySrcset) {
    el.srcset = el.dataset.lazySrcset;
    delete el.dataset.lazySrcset;
  }

  if (el.dataset.lazySrc) {
    el.src = el.dataset.lazySrc;
    delete el.dataset.lazySrc;
  }

  el.dataset.lazyLoaded = "1";
}

function initLazyImages() {
  const nodes = document.querySelectorAll("img[data-lazy-src], img[data-lazy-srcset]");
  if (!nodes.length) {
    return;
  }

  const reveal = (el) => {
    const picture = el.closest("picture");
    if (picture) {
      picture.querySelectorAll("[data-lazy-src], [data-lazy-srcset]").forEach(hydrateLazyImage);
      return;
    }
    hydrateLazyImage(el);
  };

  if (!("IntersectionObserver" in window)) {
    nodes.forEach(reveal);
    return;
  }

  // Keep first paint free: only fetch when nearly on screen (native lazy is too eager on mobile).
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        reveal(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: "80px 0px", threshold: 0.01 },
  );

  nodes.forEach((el) => observer.observe(el));
}

function loadLazyVideo(video) {
  const src = video.dataset.src;
  if (!src || video.src) {
    return;
  }
  video.src = src;
  video.load();
  if (video.autoplay && !reduceMotion) {
    video.play().catch(() => {});
  }

  const poster = video.parentElement?.querySelector(".hero__poster");
  if (poster) {
    const hidePoster = () => poster.classList.add("is-hidden");
    video.addEventListener("playing", hidePoster, { once: true });
    window.setTimeout(hidePoster, 2400);
  }
}

function initLazyVideos() {
  const videos = Array.from(document.querySelectorAll("[data-lazy-video]"));
  if (!videos.length) {
    return;
  }

  const deferred = videos.filter((video) => video.hasAttribute("data-lazy-video-defer"));
  const immediate = videos.filter((video) => !video.hasAttribute("data-lazy-video-defer"));

  const observeVideos = (list, rootMargin) => {
    if (!list.length) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      list.forEach(loadLazyVideo);
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          loadLazyVideo(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin },
    );
    list.forEach((video) => observer.observe(video));
  };

  // Below-fold videos: modest lookahead only.
  observeVideos(immediate, "120px 0px");

  // Hero video: wait for idle / first gesture so poster + logo win the first network slots.
  deferred.forEach((video) => {
    let armed = false;
    const arm = () => {
      if (armed) {
        return;
      }
      armed = true;
      window.removeEventListener("scroll", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("pointerdown", arm);
      loadLazyVideo(video);
    };

    window.addEventListener("scroll", arm, { passive: true, once: true });
    window.addEventListener("touchstart", arm, { passive: true, once: true });
    window.addEventListener("pointerdown", arm, { passive: true, once: true });

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(arm, { timeout: 2800 });
    } else {
      window.setTimeout(arm, 2200);
    }
  });
}

initLazyImages();
initLazyVideos();

if (reduceMotion) {
  document.querySelectorAll("video").forEach((video) => {
    video.removeAttribute("autoplay");
    video.pause();
  });
}

initSectionReveals();
