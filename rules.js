(() => {
  const host = document.querySelector("#hobbyCatalog");
  if (!host || !window.TerreCatalog) return;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  host.innerHTML = window.TerreCatalog.hobbies.map((hobby) =>
    '<details class="hobby-reference"><summary>' + escapeHtml(hobby.name) + '</summary>' +
    '<p><strong>Hobby :</strong> ' + escapeHtml(hobby.use) + '</p>' +
    '<p><strong>Talent · 1 Résolution :</strong> ' + escapeHtml(hobby.talent) + '</p></details>'
  ).join("");
})();
