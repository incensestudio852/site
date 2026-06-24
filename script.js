document.addEventListener("DOMContentLoaded", () => {
  const portfolioGrid = document.getElementById("portfolio-grid");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const modal = document.getElementById("lightbox-modal");
  const modalClose = document.querySelector(".lightbox-close");
  const modalContent = document.getElementById("lightbox-content");
  const modalOverlay = document.querySelector(".lightbox-overlay");

  let allProjects = [];

  // Core Scroll Observer (Retained)
  let scrollObserver;
  function initScrollAnimations() {
    if (!scrollObserver) {
      scrollObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
            }
          });
        },
        { root: null, rootMargin: "0px", threshold: 0.15 }
      );
    }
    document.querySelectorAll(".fade-in-section:not([data-observed])").forEach(section => {
      section.dataset.observed = "true";
      scrollObserver.observe(section);
    });
  }

  function escapeHtml(value) {
    if (!value) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Render Grid
  function renderGrid(projects) {
    if (!portfolioGrid) return;
    portfolioGrid.innerHTML = projects
      .map(
        project => `
          <button
            type="button"
            class="portfolio-card sans"
            data-category="${escapeHtml(project.category)}"
            data-id="${escapeHtml(project.projectId)}"
            aria-label="View ${escapeHtml(project.title)}"
          >
            <img src="${escapeHtml(project.keyVisual)}" alt="" class="portfolio-card-image" loading="lazy">
            <span class="portfolio-card-overlay"></span>
            <span class="portfolio-card-content">
              <span class="card-client">${escapeHtml(project.clientName)}</span>
              <span class="card-title">${escapeHtml(project.title)}</span>
              <span class="card-tags">${project.tags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join("")}</span>
            </span>
          </button>
        `
      )
      .join("");

    portfolioGrid.querySelectorAll(".portfolio-card").forEach(card => {
      card.addEventListener("click", () => openLightbox(card.dataset.id));
    });
  }

  // Filter Logic
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      const filterValue = e.target.getAttribute("data-filter");
      const cards = portfolioGrid.querySelectorAll(".portfolio-card");

      cards.forEach(card => {
        if (filterValue === "All" || card.dataset.category === filterValue) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    });
  });

  // Lightbox Logic
  function openLightbox(id) {
    const project = allProjects.find(p => p.projectId === id);
    if (!project) return;

    const videoHTML = project.videoEmbed 
      ? `<div class="modal-video-container"><iframe src="${project.videoEmbed}" allowfullscreen></iframe></div>` 
      : "";

    const masonryHTML = project.showcase && project.showcase.length > 0
      ? `<div class="modal-masonry">${project.showcase.map(img => `<img src="${escapeHtml(img)}" alt="Showcase asset">`).join("")}</div>`
      : "";

    modalContent.innerHTML = `
      <div class="lightbox-header sans">
        <h3 class="lightbox-title serif fw-bold">${escapeHtml(project.title)}</h3>
        <div class="lightbox-meta">
          <h4>背景 Background</h4>
          <p>${escapeHtml(project.background.zh)}<br>${escapeHtml(project.background.en)}</p>
          
          <h4>解決方案 Solution</h4>
          <p>${escapeHtml(project.solution.zh)}<br>${escapeHtml(project.solution.en)}</p>
        </div>
      </div>
      <div class="lightbox-showcase">
        ${videoHTML}
        ${masonryHTML}
      </div>
    `;

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  }

  function closeLightbox() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    // Clear iframe to stop video playback
    setTimeout(() => { modalContent.innerHTML = ""; }, 300);
  }

  modalClose.addEventListener("click", closeLightbox);
  modalOverlay.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeLightbox();
  });

  // Initialization
  function loadPortfolio() {
    fetch("projects.json")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load projects.json");
        return response.json();
      })
      .then(projects => {
        allProjects = projects;
        renderGrid(projects);
        initScrollAnimations();
      })
      .catch(error => {
        console.error("Error loading portfolio:", error);
        if (portfolioGrid) {
          portfolioGrid.innerHTML = '<p class="portfolio-error sans">Unable to load portfolio. Please try again later.</p>';
        }
      });
  }

  initScrollAnimations();
  loadPortfolio();
});