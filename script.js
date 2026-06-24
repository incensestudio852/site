document.addEventListener("DOMContentLoaded", () => {
  // ── DOM Refs ──────────────────────────────────────────────
  const preview      = document.getElementById("portfolio-preview");
  const filtersContainer = document.getElementById("portfolio-filters");
  const modal        = document.getElementById("lightbox-modal");
  const modalClose   = document.querySelector(".lightbox-close");
  const modalContent = document.getElementById("lightbox-content");
  const modalOverlay = document.querySelector(".lightbox-overlay");
  const dotsContainer = document.getElementById("portfolio-dots");
  const arrowLeft    = document.querySelector(".portfolio-arrow--left");
  const arrowRight   = document.querySelector(".portfolio-arrow--right");

  let allProjects = [];

  // ── Helpers ───────────────────────────────────────────────
  function escapeHtml(v) {
    if (!v) return "";
    return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  // ── Scroll Animations ────────────────────────────────────
  let scrollObserver;
  function initScrollAnimations() {
    if (!scrollObserver) {
      scrollObserver = new IntersectionObserver(
        entries => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-visible"); }); },
        { threshold: 0.15 }
      );
    }
    document.querySelectorAll(".fade-in-section:not([data-observed])").forEach(el => {
      el.dataset.observed = "true";
      scrollObserver.observe(el);
    });
  }


  // ── Build Dynamic Filter Buttons ───────────────────────
  function buildFilters(projects) {
    if (!filtersContainer) return;

    // Extract unique categories (flatten arrays, dedupe, sort)
    const cats = [...new Set(projects.flatMap(p =>
      Array.isArray(p.category) ? p.category : [p.category]
    ))].sort();

    filtersContainer.innerHTML = '<button class="filter-btn active" data-filter="All">All</button>' +
      cats.map(c => `<button class="filter-btn" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");

    // Delegate click on the container
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

    // Cards
    preview.innerHTML = projects
      .map(p => `
        <button type="button"
          class="portfolio-card sans"
          data-category="${escapeHtml(Array.isArray(p.category) ? p.category.join(",") : p.category)}"
          data-id="${escapeHtml(p.projectId)}"
          aria-label="View ${escapeHtml(p.title)}"
        >
          <img src="${escapeHtml(p.keyVisual)}" alt="" class="portfolio-card-image" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('img-fallback')">
          <span class="portfolio-card-overlay"></span>
          <span class="portfolio-card-content">
            <span class="card-client">${escapeHtml(p.clientName)}</span>
            <span class="card-title">${escapeHtml(p.title)}</span>
          </span>
        </button>
      `).join("");

    // Click → lightbox
    preview.querySelectorAll(".portfolio-card").forEach(card => {
      card.addEventListener("click", () => openLightbox(card.dataset.id));
    });

    // Dots
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

  function scrollToCard(index) {
    const cards = preview.querySelectorAll(".portfolio-card");
    if (!cards.length || index < 0) index = 0;
    if (index >= cards.length) index = cards.length - 1;
    cards[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  function scrollByStep(dir) {
    const step = getCardWidth();
    preview.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  function syncActiveDot() {
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll(".portfolio-dot");
    const cards = preview.querySelectorAll(".portfolio-card");
    if (!dots.length || !cards.length) return;

    const scrollLeft = preview.scrollLeft;
    const previewWidth = preview.clientWidth;
    const totalScroll = preview.scrollWidth - previewWidth;

    if (totalScroll <= 0) {
      dots.forEach(d => d.classList.remove("is-active"));
      dots[0]?.classList.add("is-active");
      return;
    }

    // Determine active index by card position
    let activeIndex = 0;
    const gap = parseFloat(getComputedStyle(preview).gap) || 0;
    let minDist = Infinity;
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - scrollLeft);
      if (dist < minDist) { minDist = dist; activeIndex = i; }
    });

    dots.forEach((d, i) => d.classList.toggle("is-active", i === activeIndex));

    // Toggle arrow visibility
    if (arrowLeft)  arrowLeft.classList.toggle("is-hidden", activeIndex === 0);
    if (arrowRight) arrowRight.classList.toggle("is-hidden", activeIndex >= cards.length - 1);
  }

  // Throttled scroll sync
  let scrollTick = false;
  function onPreviewScroll() {
    if (!scrollTick) {
      requestAnimationFrame(() => { syncActiveDot(); scrollTick = false; });
      scrollTick = true;
    }
  }

  // ── Filter Logic ─────────────────────────────────────────
  function applyFilter(filterValue) {
    const cards = preview.querySelectorAll(".portfolio-card");
    let visibleCount = 0;
    cards.forEach(card => {
      const match = filterValue === "All" || card.dataset.category.split(",").includes(filterValue);
      card.classList.toggle("hidden", !match);
      if (match) visibleCount++;
    });

    // Rebuild dots for visible cards only
    renderDots(visibleCount);

    // Update dot click targets to skip hidden cards
    const visibleCards = preview.querySelectorAll(".portfolio-card:not(.hidden)");
    const newDots = dotsContainer.querySelectorAll(".portfolio-dot");
    newDots.forEach((dot, i) => {
      dot.replaceWith(dot.cloneNode(true));
    });
    // Re-attach dot listeners
    dotsContainer.querySelectorAll(".portfolio-dot").forEach((dot, i) => {
      dot.addEventListener("click", () => {
        const target = preview.querySelectorAll(".portfolio-card:not(.hidden)")[i];
        if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      });
    });

    // Reset scroll
    preview.scrollTo({ left: 0, behavior: "smooth" });
    syncActiveDot();
  }

  // Filters are bound via delegation in buildFilters()

  // ── Arrow Button Clicks ──────────────────────────────────
  if (arrowLeft)  arrowLeft.addEventListener("click", () => scrollByStep(-1));
  if (arrowRight) arrowRight.addEventListener("click", () => scrollByStep(1));

  // ── Preview scroll events ────────────────────────────────
  if (preview) preview.addEventListener("scroll", onPreviewScroll, { passive: true });

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

    const masonryHTML = project.showcase?.length
      ? `<div class="modal-masonry">${project.showcase.map(img => `<img src="${escapeHtml(img)}" alt="Showcase asset" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('img-fallback')">`).join("")}</div>`
      : "";

    modalContent.innerHTML = `
      <div class="lightbox-header sans">
        <h3 class="lightbox-title serif fw-bold">${escapeHtml(project.title)}</h3>
        <div class="lightbox-tags">${project.tags.map(t => `<span class="lightbox-tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="lightbox-meta">
          <h4>Background 背景</h4>
          <p>${escapeHtml(project.background.en)}<br>${escapeHtml(project.background.zh)}</p>
          <h4>Solution 解決方案</h4>
          <p>${escapeHtml(project.solution.en)}<br>${escapeHtml(project.solution.zh)}</p>
        </div>
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

  initScrollAnimations();
  loadPortfolio();
});
