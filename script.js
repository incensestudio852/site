document.addEventListener("DOMContentLoaded", () => {
  // ── DOM Refs ──────────────────────────────────────────────
  const preview         = document.getElementById("portfolio-preview");
  const filtersContainer = document.getElementById("portfolio-filters");
  const modal           = document.getElementById("lightbox-modal");
  const modalClose      = document.querySelector(".lightbox-close");
  const modalContent    = document.getElementById("lightbox-content");
  const modalOverlay    = document.querySelector(".lightbox-overlay");
  const dotsContainer   = document.getElementById("portfolio-dots");
  const arrowLeft       = document.querySelector(".portfolio-arrow--left");
  const arrowRight      = document.querySelector(".portfolio-arrow--right");
  const nav             = document.querySelector(".site-nav");
  const navToggle       = document.querySelector(".site-nav-toggle");
  const navLinks        = document.querySelector(".site-nav-links");

  let allProjects = [];
  let rafPending  = false;
  let lastScrollY = window.scrollY;

  // ── Helpers ───────────────────────────────────────────────
  function escapeHtml(v) {
    if (!v) return "";
    return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // ── Mobile Nav Toggle ─────────────────────────────────────
  navToggle?.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen);
  });

  // Close mobile nav on link click
  navLinks?.querySelectorAll(".site-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  // ── Nav scroll shadow ─────────────────────────────────────
  function updateNavOnScroll() {
    if (window.scrollY > 10) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }

  // ── Parallax effect on monolith backgrounds ───────────────
  function updateParallax() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const sections = document.querySelectorAll(".monolith");
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const viewportMid = window.innerHeight / 2;
        const sectionMid = rect.top + rect.height / 2;
        const offset = (sectionMid - viewportMid) * 0.03;
        const bgEl = section.querySelector(".incense-smoke");
        if (bgEl) {
          bgEl.style.transform = `translateY(${offset}px)`;
        }
      });
    });
  }

  // ── Scroll-driven reveal with variable thresholds ─────────
  let scrollObserver;
  function initScrollAnimations() {
    // Enhanced observer with progressive thresholds
    if (!scrollObserver) {
      scrollObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");

              // For hero, also add a secondary class for scale-in children
              if (entry.target.id === "hero") {
                entry.target.classList.add("hero-revealed");
              }
            }
          });
        },
        {
          threshold: [0.05, 0.15, 0.3],
          rootMargin: "0px 0px -40px 0px"
        }
      );
    }

    document.querySelectorAll(".fade-in-section:not([data-observed])").forEach(el => {
      el.dataset.observed = "true";
      scrollObserver.observe(el);
    });
  }

  // ── Smooth scroll for nav links ───────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ── Bind scroll handlers ──────────────────────────────────
  window.addEventListener("scroll", () => {
    updateNavOnScroll();
    updateParallax();
  }, { passive: true });

  // ── Build Dynamic Filter Buttons ─────────────────────────
  function buildFilters(projects) {
    if (!filtersContainer) return;

    const cats = [...new Set(projects.flatMap(p =>
      Array.isArray(p.category) ? p.category : [p.category]
    ))].sort();

    filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="All">All</button>' +
      cats.map(c => `<button class="filter-btn" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");

    filtersContainer.addEventListener("click", e => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      filtersContainer.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilter(btn.getAttribute("data-filter"));
    });
  }

  // ── Render Cards & Dots ──────────────────────────────────
  function renderGallery(projects) {
    if (!preview) return;

    preview.innerHTML = projects
      .map(p => `
        <button type="button"
          class="portfolio-card sans"
          data-category="${escapeHtml(Array.isArray(p.category) ? p.category.join(",") : p.category)}"
          data-id="${escapeHtml(p.projectId)}"
          aria-label="View ${escapeHtml(p.title)}"
        >
          <img src="${escapeHtml(p.keyVisual)}" alt="" class="portfolio-card-image" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('img-fallback')">
          <span class="card-type-label">${escapeHtml(Array.isArray(p.category) ? p.category[0] : p.category)}</span>
          <span class="portfolio-card-overlay"></span>
          <span class="portfolio-card-content">
            <span class="card-client">${escapeHtml(p.clientName)}</span>
            <span class="card-title">${escapeHtml(p.title)}</span>
          </span>
        </button>
      `).join("");

    preview.querySelectorAll(".portfolio-card").forEach(card => {
      card.addEventListener("click", () => openLightbox(card.dataset.id));
    });

    renderDots(projects.length);
    syncActiveDot();
  }

  function renderDots(count) {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("button");
      dot.className = "portfolio-dot";
      dot.setAttribute("aria-label", `Go to project ${i + 1}`);
      dot.addEventListener("click", () => scrollToCard(i));
      dotsContainer.appendChild(dot);
    }
  }

  // ── Carousel Navigation ──────────────────────────────────
  function getCardWidth() {
    const card = preview.querySelector(".portfolio-card");
    if (!card) return preview.clientWidth;
    const style = getComputedStyle(card);
    const gap = parseFloat(getComputedStyle(preview).gap) || 0;
    return card.offsetWidth + gap;
  }

  let isScrolling = false;
  function scrollByStep(dir) {
    if (isScrolling) return;
    isScrolling = true;
    const step = getCardWidth();
    preview.scrollBy({ left: dir * step, behavior: "smooth" });
    setTimeout(() => { isScrolling = false; }, 350);
  }

  function scrollToCard(index) {
    const cards = preview.querySelectorAll(".portfolio-card:not(.hidden)");
    const target = cards[index];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  function syncActiveDot() {
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll(".portfolio-dot");
    const cards = preview.querySelectorAll(".portfolio-card:not(.hidden)");
    let activeIdx = 0;

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const frame = preview.getBoundingClientRect();
      if (rect.left >= frame.left - rect.width * 0.3) {
        activeIdx = i;
        break;
      }
    }

    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === activeIdx);
    });
  }

  let previewScrollTimer;
  function onPreviewScroll() {
    clearTimeout(previewScrollTimer);
    previewScrollTimer = setTimeout(syncActiveDot, 60);
  }

  // ── Filter Logic ─────────────────────────────────────────
  function applyFilter(filter) {
    const cards = preview.querySelectorAll(".portfolio-card");
    let visibleCount = 0;

    cards.forEach(card => {
      const cats = (card.dataset.category || "").split(",");
      if (filter === "All" || cats.includes(filter)) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    });

    renderDots(visibleCount);

    const visibleCards = preview.querySelectorAll(".portfolio-card:not(.hidden)");
    const newDots = dotsContainer.querySelectorAll(".portfolio-dot");
    newDots.forEach((dot, i) => {
      dot.replaceWith(dot.cloneNode(true));
    });
    dotsContainer.querySelectorAll(".portfolio-dot").forEach((dot, i) => {
      dot.addEventListener("click", () => {
        const target = preview.querySelectorAll(".portfolio-card:not(.hidden)")[i];
        if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      });
    });

    preview.scrollTo({ left: 0, behavior: "smooth" });
    syncActiveDot();
  }

  // ── Arrow Button Clicks ──────────────────────────────────
  if (arrowLeft)  arrowLeft.addEventListener("click", () => scrollByStep(-1));
  if (arrowRight) arrowRight.addEventListener("click", () => scrollByStep(1));

  // ── Preview scroll events ────────────────────────────────
  if (preview) {
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });
    preview.addEventListener("scrollend", syncActiveDot, { passive: true });
  }

  // ── Keyboard nav ─────────────────────────────────────────
  document.addEventListener("keydown", e => {
    if (document.activeElement?.closest(".portfolio-gallery")) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); scrollByStep(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); scrollByStep(1); }
    }
  });

  // ── Lightbox ─────────────────────────────────────────────
  function openLightbox(id) {
    const project = allProjects.find(p => p.projectId === id);
    if (!project) return;

    const videoHTML = project.videoEmbed
      ? `<div class="modal-video-container"><iframe src="${project.videoEmbed}" allowfullscreen></iframe></div>`
      : "";

    function isImageAsset(str) {
      return /\.(png|jpg|jpeg|gif|webp|svg|avif)([?#]|$)/i.test(str) || !/^https?:\/\//.test(str);
    }

    const masonryHTML = project.showcase?.length
      ? `<div class="modal-masonry">${project.showcase.map(item => {
          if (isImageAsset(item)) {
            return `<img src="${escapeHtml(item)}" alt="Showcase image" loading="lazy" onerror="this.onerror=null;this.style.display='none'">`;
          }
          const isUrl = item.startsWith("http://") || item.startsWith("https://");
          if (isUrl) {
            return `<a href="${escapeHtml(item)}" target="_blank" rel="noopener noreferrer" class="showcase-link">Visit Website <span class="showcase-link-icon">\u2197</span></a>`;
          }
          return `<div class="showcase-placeholder">${escapeHtml(item)}</div>`;
        }).join("")}</div>`
      : "";

    modalContent.innerHTML = `
      <div class="lightbox-header sans">
        <h3 class="lightbox-title serif fw-bold">${escapeHtml(project.title)}</h3>
        <div class="lightbox-tags">${project.tags.map(t => `<span class="lightbox-tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="lightbox-meta">
          <h4>Background 背景</h4>
          <p>${escapeHtml(project.background.en)}</p>
          <p>${escapeHtml(project.background.zh)}</p>
          <h4>Solution 解決方案</h4>
          <p>${escapeHtml(project.solution.en)}</p>
          <p>${escapeHtml(project.solution.zh)}</p>
        </div>
      <div class="lightbox-showcase">${videoHTML}${masonryHTML}</div>
    `;

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => { modalContent.innerHTML = ""; }, 300);
  }

  modalClose?.addEventListener("click", closeLightbox);
  modalOverlay?.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeLightbox();
  });

  // ── Init ─────────────────────────────────────────────────
  function loadPortfolio() {
    fetch("projects.json")
      .then(r => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then(projects => {
        allProjects = projects;
        buildFilters(projects);
        renderGallery(projects);
        initScrollAnimations();
      })
      .catch(() => {
        if (preview) preview.innerHTML = '<p class="portfolio-error sans">Unable to load portfolio. Please try again later.</p>';
      });
  }

  // Bootstrap
  updateNavOnScroll();
  initScrollAnimations();
  loadPortfolio();
});
