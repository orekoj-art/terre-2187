(() => {
  const chapters = [...document.querySelectorAll("[data-atlas-chapter]")];
  const chapterSearch = document.getElementById("compendiumSearch");
  const chapterClear = document.getElementById("clearCompendiumSearch");
  const chapterCount = document.getElementById("compendiumResultCount");
  const domainSearch = document.getElementById("domainSearch");
  const domainClear = document.getElementById("clearDomainSearch");
  const domainCount = document.getElementById("domainResultCount");
  const domainGrid = document.getElementById("domainGrid");
  const catalog = window.TerreCatalog;
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  if (domainGrid && catalog?.jobDomains) {
    domainGrid.innerHTML = catalog.jobDomains.map((domain, index) => `
      <details class="atlas-domain-card" data-domain-card>
        <summary><span class="domain-number">${String(index + 1).padStart(2, "0")}</span><span class="domain-name">${escapeHtml(domain.title)}</span><span class="domain-toggle" aria-hidden="true">＋</span></summary>
        <div class="domain-body">
          <p class="domain-description">${escapeHtml(domain.description)}</p>
          <p class="domain-context">${escapeHtml(domain.context)}</p>
          <div class="domain-profile-list" aria-label="Profils du domaine ${escapeHtml(domain.title)}">
            ${domain.jobs.map((job) => `
              <details class="domain-profile">
                <summary><span class="profile-number">${escapeHtml(job.number)}</span><span class="profile-name">${escapeHtml(job.name)}</span><span class="profile-toggle" aria-hidden="true">＋</span></summary>
                <div class="domain-profile-body">
                  <p>${escapeHtml(job.description)}</p>
                  <dl class="domain-profile-fields">
                    <div><dt>Spécialités</dt><dd>${escapeHtml(job.specialties)}</dd></div>
                    <div><dt>Outils</dt><dd>${escapeHtml(job.tools)}</dd></div>
                    <div><dt>Contact</dt><dd>${escapeHtml(job.contact)}</dd></div>
                    <div><dt>Préoccupation</dt><dd>${escapeHtml(job.concern)}</dd></div>
                  </dl>
                </div>
              </details>`).join("")}
          </div>
        </div>
      </details>`).join("");
  }
  const domainCards = [...document.querySelectorAll("[data-domain-card]")];
  const domainEmpty = document.getElementById("domainNoResults");
  const progress = document.getElementById("readingProgress");
  const progressTrack = progress?.parentElement;
  const progressLabel = document.getElementById("readingProgressLabel");

  const normalize = (value) => value
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  function filterChapters() {
    const query = normalize(chapterSearch?.value || "");
    let visible = 0;

    chapters.forEach((chapter) => {
      const matches = !query || normalize(chapter.textContent).includes(query);
      chapter.hidden = !matches;
      if (matches) visible += 1;
      document.querySelectorAll(`.atlas-index a[href="#${chapter.id}"], .atlas-index-links a[href="#${chapter.id}"]`).forEach((link) => {
        link.hidden = !matches;
      });
    });

    if (chapterCount) chapterCount.textContent = `${visible} section${visible > 1 ? "s" : ""}`;
    if (chapterClear) chapterClear.hidden = !query;
  }

  function filterDomains() {
    const query = normalize(domainSearch?.value || "");
    let visible = 0;

    domainCards.forEach((card) => {
      const matches = !query || normalize(card.textContent).includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    if (domainCount) domainCount.textContent = `${visible} domaine${visible > 1 ? "s" : ""}`;
    if (domainEmpty) domainEmpty.hidden = visible > 0;
    if (domainClear) domainClear.hidden = !query;
  }

  function updateReadingProgress() {
    if (!progress || !progressTrack || !progressLabel) return;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const percent = range > 0 ? Math.round((window.scrollY / range) * 100) : 0;
    progress.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", String(percent));
    progressLabel.textContent = `${percent} %`;
  }

  chapterSearch?.addEventListener("input", filterChapters);
  chapterClear?.addEventListener("click", () => {
    chapterSearch.value = "";
    filterChapters();
    chapterSearch.focus();
  });
  domainSearch?.addEventListener("input", filterDomains);
  domainClear?.addEventListener("click", () => {
    domainSearch.value = "";
    filterDomains();
    domainSearch.focus();
  });
  window.addEventListener("scroll", updateReadingProgress, { passive: true });
  window.addEventListener("resize", updateReadingProgress);

  filterChapters();
  filterDomains();
  updateReadingProgress();
})();
