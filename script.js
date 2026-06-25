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
  let filteredProjects = [];
  let currentFilter = "All";
  let currentProjectIndex = -1;

  // ── Helpers ───────────────────────────────────────────────
  function escapeHtml(v) {
    if (!v) return "";
    return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // ── Mobile Nav Toggle ─────────────────────────────────────
  navToggle?.addEventListener("click", (e) => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen);
  });

  // Close mobile nav on link click
  navLinks?.querySelectorAll(".site-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.classList.remove("is-open");
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
    // Removed: incense-smoke parallax effect
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
    filteredProjects = [...projects];
    currentFilter = "All";

    preview.innerHTML = projects
      .map(p => {
        const hasVisual = p.keyVisual && p.keyVisual.trim();
        const imgHtml = hasVisual
          ? `<img src="${escapeHtml(p.keyVisual)}" alt="" class="portfolio-card-image" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('img-fallback')">`
          : '';
        const noVisualClass = hasVisual ? '' : ' no-visual';

        return `
          <button type="button"
            class="portfolio-card sans${noVisualClass}"
            data-category="${escapeHtml(Array.isArray(p.category) ? p.category.join(",") : p.category)}"
            data-id="${escapeHtml(p.projectId)}"
            aria-label="View ${escapeHtml(p.title)}"
          >
            ${imgHtml}
            <span class="card-type-label">${escapeHtml(Array.isArray(p.category) ? p.category[0] : p.category)}</span>
            <span class="portfolio-card-overlay"></span>
            <span class="portfolio-card-content">
              <span class="card-client">${escapeHtml(p.clientName)}</span>
              <span class="card-title">${escapeHtml(p.title)}</span>
            </span>
          </button>
        `;
      }).join("");

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
    currentFilter = filter;
    filteredProjects = allProjects.filter(p => {
      const cats = Array.isArray(p.category) ? p.category : [p.category];
      return filter === "All" || cats.includes(filter);
    });
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


  // ── Lightbox Arrow Buttons ────────────────────────────────
  const lightboxArrowLeft = document.createElement("button");
  lightboxArrowLeft.className = "lightbox-arrow lightbox-arrow--left";
  lightboxArrowLeft.setAttribute("aria-label", "Previous project");
  lightboxArrowLeft.innerHTML = "‹";

  const lightboxArrowRight = document.createElement("button");
  lightboxArrowRight.className = "lightbox-arrow lightbox-arrow--right";
  lightboxArrowRight.setAttribute("aria-label", "Next project");
  lightboxArrowRight.innerHTML = "›";

  const lightboxWrapper = document.querySelector(".lightbox-content-wrapper");
  if (lightboxWrapper) {
    lightboxWrapper.appendChild(lightboxArrowLeft);
    lightboxWrapper.appendChild(lightboxArrowRight);
  }

  lightboxArrowLeft.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });

  lightboxArrowRight.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  // ── Lightbox Touch Swipe ──────────────────────────────────
  let touchStartX = 0;
  let touchStartY = 0;

  modalContent.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  modalContent.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0) navigateLightbox(1);
      else navigateLightbox(-1);
    }
  }, { passive: true });

  // ── Preview scroll events ────────────────────────────────
  if (preview) {
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });
    preview.addEventListener("scrollend", syncActiveDot, { passive: true });
  }

  // ── Keyboard nav ─────────────────────────────────────────
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeLightbox();

    if (modal.classList.contains("is-open")) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); navigateLightbox(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); navigateLightbox(1); }
    }

    if (document.activeElement?.closest(".portfolio-gallery")) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); scrollByStep(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); scrollByStep(1); }
    }
  });


  // ── Lightbox Navigation ───────────────────────────────────
  function navigateLightbox(dir) {
    if (filteredProjects.length <= 1) return;

    const newIndex = (currentProjectIndex + dir + filteredProjects.length) % filteredProjects.length;
    const newProject = filteredProjects[newIndex];

    // Sync carousel scroll
    const cards = preview.querySelectorAll(".portfolio-card:not(.hidden)");
    if (cards[newIndex]) {
      cards[newIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      syncActiveDot();
    }

    openLightbox(newProject.projectId);
  }
  // ── Lightbox ─────────────────────────────────────────────
  function openLightbox(id) {
    const project = allProjects.find(p => p.projectId === id);
    if (!project) return;
    currentProjectIndex = filteredProjects.findIndex(p => p.projectId === project.projectId);

    const videos = Array.isArray(project.videoEmbed) ? project.videoEmbed : [];
    const videoHTML = videos.length
      ? (videos.length > 1
          ? `<div class="modal-video-grid">${videos.map(url =>
              `<div class="modal-video-container"><iframe src="${escapeHtml(url)}" allowfullscreen></iframe></div>`
            ).join("")}</div>`
          : `<div class="modal-video-container"><iframe src="${escapeHtml(videos[0])}" allowfullscreen></iframe></div>`
        )
      : "";

    function isImageAsset(str) {
      return /\.(png|jpg|jpeg|gif|webp|svg|avif)([?#]|$)/i.test(str) || !/^https?:\/\//.test(str);
    }

    function isInstagramUrl(str) {
      return /(?:www\.)?instagram\.com\/p\//i.test(str);
    }

    let instagramEmbedsHTML = '';
    let masonryItems = [];

    if (project.showcase?.length) {
      project.showcase.filter(Boolean).forEach(item => {
        if (isInstagramUrl(item)) {
          const cleanUrl = item.split('?')[0].replace(/\/+$/, '');
          instagramEmbedsHTML += '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="' + escapeHtml(cleanUrl) + '" data-instgrm-version="14" style="background:#FFF;border:0;border-radius:3px;box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);margin:1px auto 1.5rem;max-width:540px;min-width:326px;padding:0;width:calc(100% - 2px)"><a href="' + escapeHtml(cleanUrl) + '" target="_blank" rel="noopener noreferrer">View on Instagram</a></blockquote>';
        } else if (isImageAsset(item)) {
          masonryItems.push(`<img src="${escapeHtml(item)}" alt="Showcase image" loading="lazy" onerror="this.onerror=null;this.style.display='none'">`);
        } else {
          const isUrl = item.startsWith("http://") || item.startsWith("https://");
          if (isUrl) {
            masonryItems.push('<a href="' + escapeHtml(item) + '" target="_blank" rel="noopener noreferrer" class="showcase-link">Visit Website <span class="showcase-link-icon">\u2197</span></a>');
          } else {
            masonryItems.push('<div class="showcase-placeholder">' + escapeHtml(item) + '</div>');
          }
        }
      });
    }

    const masonryHTML = masonryItems.length ? '<div class="modal-masonry">' + masonryItems.join("") + '</div>' : '';
    const hasShowcase = !!(videoHTML || instagramEmbedsHTML || masonryHTML);

    modalContent.innerHTML = `
      <div class="lightbox-header sans">
        <div class="lightbox-client">${escapeHtml(project.clientName)}</div>
        <h3 class="lightbox-title serif fw-bold">${escapeHtml(project.title)}</h3>
        <div class="lightbox-tags">${project.tags.map(t => `<span class="lightbox-tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="lightbox-meta">
          <h4>Background 背景</h4>
          <p>${escapeHtml(project.background.en)}</p>
          <p>${escapeHtml(project.background.zh)}</p>
          <h4>Solution 解決方案</h4>
        </div>
        ${hasShowcase ? `<div class="lightbox-showcase">${videoHTML}${instagramEmbedsHTML}${masonryHTML}</div>` : ''}
        <div class="lightbox-meta">
          <p>${escapeHtml(project.solution.en)}</p>
          <p>${escapeHtml(project.solution.zh)}</p>
        </div>
      </div>
        ${filteredProjects.length > 1 ? `<div class="lightbox-counter">${currentProjectIndex + 1} / ${filteredProjects.length}</div>` : ""}
    `;

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";

    // Show/hide lightbox arrows based on filtered count
    const showArrows = filteredProjects.length > 1;
    lightboxArrowLeft.style.display = showArrows ? "" : "none";
    lightboxArrowRight.style.display = showArrows ? "" : "none";

    // Process Instagram embeds
    if (modalContent.querySelector('.instagram-media')) {
      if (window.instgrm) {
        try { window.instgrm.Embeds.process(); } catch(e) {}
      } else if (!document.querySelector('script[src="//www.instagram.com/embed.js"]')) {
        var s = document.createElement('script');
        s.src = '//www.instagram.com/embed.js';
        document.body.appendChild(s);
      }
    }
  }

  function closeLightbox() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    currentProjectIndex = -1;
    setTimeout(() => { modalContent.innerHTML = ""; }, 300);
  }

  modalClose?.addEventListener("click", closeLightbox);
  modalOverlay?.addEventListener("click", closeLightbox);

  // ── Init ─────────────────────────────────────────────────
  function loadPortfolio() {
    // Use inline data (supports file:// protocol where fetch is blocked)
    if (window.__PROJECTS_DATA__) {
      allProjects = window.__PROJECTS_DATA__;
      buildFilters(allProjects);
      renderGallery(allProjects);
      initScrollAnimations();
      return;
    }

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
