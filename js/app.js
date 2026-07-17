const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const contactDialog = document.querySelector("[data-contact-dialog]");
const contactOpeners = document.querySelectorAll("[data-contact-open]");
const contactCloser = document.querySelector("[data-contact-close]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastDialogTrigger = null;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
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

function scrollToHash(hash, options = {}) {
  if (!hash || hash === "#") {
    return;
  }

  const target = document.querySelector(hash);
  if (!target) {
    return;
  }

  const behavior = options.behavior || (reduceMotion ? "auto" : "smooth");
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

  window.scrollTo({ top, behavior });

  if (options.updateHistory !== false) {
    history.replaceState(null, "", hash);
  }
}

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

window.addEventListener("load", () => {
  if (location.hash) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  const resetToTop = () => window.scrollTo({ top: 0, behavior: "auto" });
  window.requestAnimationFrame(() => window.requestAnimationFrame(resetToTop));
  window.setTimeout(resetToTop, 300);
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
