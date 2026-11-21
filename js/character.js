(() => {
  const form = document.querySelector("#characterForm");
  if (!form || !window.TerreCatalog) return;
  const catalog = window.TerreCatalog;
  const content = document.querySelector("#wizardContent");
  const progress = document.querySelector(".progress-track");
  const progressFill = document.querySelector("#progressFill");
  const stepCounter = document.querySelector("#stepCounter");
  const previousButton = document.querySelector("#previousStep");
  const nextButton = document.querySelector("#nextStep");
  const errorBox = document.createElement("p");
  errorBox.className = "wizard-error";
  errorBox.setAttribute("role", "alert");
  errorBox.id = "stepError";
  const keysForSkills = {};
  const emptySkills = {};
  catalog.skills.forEach((group) => group.items.forEach((name) => {
    const key = skillKey(name);
    keysForSkills[name] = key;
    emptySkills[key] = 0;
  }));

  const state = {
    identity: { lastName: "", firstName: "", age: "", pronouns: "", activity: "", community: "", home: "", environment: "", origin: "", importantLink: "", identifier: "" },
    stats: { force: 2, agility: 2, spirit: 1, empathy: 1 },
    skills: emptySkills,
    companion: { type: "", option: "", detail: "" },
    hobbies: [],
    attachments: { people: "", motivations: "", memory: "" },
    equipment: { main: "", mainDetail: "", leisure: "", leisureDetail: "", shared: "", sharedDetail: "", protection: "", protectionDetail: "" },
    notes: ""
  };
  let step = 0;
  let dirty = false;
  let pdfDownloaded = false;

  function skillKey(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }
  function getPath(path) {
    return path.split(".").reduce((value, key) => value && value[key], state);
  }
  function setPath(path, value) {
    const parts = path.split(".");
    let object = state;
    for (let i = 0; i < parts.length - 1; i++) object = object[parts[i]];
    object[parts[parts.length - 1]] = value;
  }
  function sum(object) {
    return Object.values(object).reduce((total, value) => total + (Number(value) || 0), 0);
  }
  function pick(items) {
    return items && items.length ? items[Math.floor(Math.random() * items.length)] : "";
  }
  function companionDetailOptions(option) {
    return (catalog.companionDetails && catalog.companionDetails[option]) || [];
  }
  function equipmentDetailOptions(key, option) {
    return (catalog.equipmentDetails && catalog.equipmentDetails[key] && catalog.equipmentDetails[key][option]) || [];
  }
  function shuffle(items) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }
  function randomButton(path, label) {
    return '<button class="field-random" type="button" data-random-path="' + path + '" aria-label="Proposer une valeur aléatoire pour ' + esc(label) + '"><span aria-hidden="true">⤨</span><span>Aléatoire</span></button>';
  }
  function field(path, label, options) {
    const settings = options || {};
    const type = settings.type || "text";
    const value = getPath(path);
    const id = "field-" + path.replace(/\./g, "-");
    const hint = settings.hint ? '<small class="field-hint">' + esc(settings.hint) + "</small>" : "";
    const required = settings.required ? " required" : "";
    const placeholder = settings.placeholder ? ' placeholder="' + esc(settings.placeholder) + '"' : "";
    const max = settings.max ? ' max="' + settings.max + '"' : "";
    const min = settings.min !== undefined ? ' min="' + settings.min + '"' : "";
    const stepAttr = settings.step ? ' step="' + settings.step + '"' : "";
    const head = '<div class="form-field-head"><label for="' + id + '">' + esc(label) + "</label>" + randomButton(path, label) + "</div>";
    if (settings.choices || settings.choiceGroups) {
      const extraChoices = settings.extraChoices || [];
      const groupedChoices = (settings.choiceGroups || []).flatMap((group) => group.choices);
      const choices = settings.choices || groupedChoices.concat(extraChoices);
      const allowCustom = settings.allowCustom !== false;
      const selected = choices.includes(value) ? value : (value && allowCustom ? "__custom__" : "");
      const optionList = (items) => items.map((choice) => '<option value="' + esc(choice) + '"' + (choice === selected ? " selected" : "") + ">" + esc(choice) + "</option>").join("");
      const optionsHtml = settings.choiceGroups
        ? settings.choiceGroups.map((group) => '<optgroup label="' + esc(group.label) + '">' + optionList(group.choices) + "</optgroup>").join("") +
          (extraChoices.length ? '<optgroup label="' + esc(settings.extraChoiceLabel || "Parcours et transitions") + '">' + optionList(extraChoices) + "</optgroup>" : "")
        : optionList(choices);
      const customOption = allowCustom ? '<option value="__custom__"' + (selected === "__custom__" ? " selected" : "") + ">Autre — préciser</option>" : "";
      const customValue = selected === "__custom__" ? value : "";
      const customInput = allowCustom ? '<input class="field-custom" type="text" data-path="' + path + '" value="' + esc(customValue) + '" placeholder="Précisez votre choix…"' + (selected === "__custom__" ? "" : " hidden") + ' aria-label="Préciser ' + esc(label) + '">' : "";
      const rerender = settings.rerender ? ' data-rerender="true"' : "";
      const requiredSelect = settings.required ? " required" : "";
      return '<div class="form-field">' + head + '<select id="' + id + '" data-choice-path="' + path + '" data-custom-input="' + path + '"' + rerender + requiredSelect + '><option value=""' + (selected ? "" : " selected") + ">Choisir…</option>" + optionsHtml + customOption + "</select>" + customInput + hint + "</div>";
    }
    if (type === "textarea") {
      return '<div class="form-field">' + head + '<textarea id="' + id + '" data-path="' + path + '"' + placeholder + required + ">" + esc(value) + "</textarea>" + hint + "</div>";
    }
    return '<div class="form-field">' + head + '<input id="' + id + '" type="' + type + '" data-path="' + path + '" value="' + esc(value) + '"' + placeholder + min + max + stepAttr + required + ">" + hint + "</div>";
  }
  function statInput(key, label, description) {
    return '<div class="stat-item"><div class="stat-head"><div><label for="stat-' + key + '">' + label + '</label><span class="sr-only"> — ' + description + '</span></div><div class="stat-actions"><input id="stat-' + key + '" class="stat-input" type="number" min="1" max="3" step="1" inputmode="numeric" data-stat="' + key + '" value="' + state.stats[key] + '" aria-label="' + label + ', de 1 à 3"><button class="field-random field-random-icon" type="button" data-random-stat="' + key + '" aria-label="Répartir les caractéristiques au hasard autour de ' + label + '">⤨</button></div></div><p>' + description + "</p></div>";
  }
  function renderIdentity() {
    return '<h2>Poser les bases</h2><p class="step-description">Commencez par la personne : son nom, son quotidien, son lieu de vie et les liens qui comptent. Une activité peut être un métier, des études, un engagement ou une période de transition.</p>' +
      '<div class="name-grid">' +
        field("identity.firstName", "Prénom", { required: true, placeholder: "Ex. : Maël" }) +
        field("identity.lastName", "Nom", { placeholder: "Ex. : Soria" }) +
        field("identity.age", "Âge", { type: "number", min: 0, max: 180, placeholder: "Âge", hint: "La génération aléatoire propose un âge adulte." }) +
      "</div>" +
      '<div class="field-grid">' +
        field("identity.pronouns", "Pronoms", { choices: catalog.pronouns }) +
        field("identity.activity", "Activité principale", { choiceGroups: catalog.jobDomains.map((domain) => ({ label: domain.title, choices: domain.jobs.map((job) => job.name) })), extraChoices: catalog.jobTracks, extraChoiceLabel: "Parcours et transitions", hint: "120 métiers classés par domaine, plus les parcours de vie du catalogue." }) +
        field("identity.community", "Communauté", { choices: catalog.communities }) +
        field("identity.home", "Lieu de vie", { choices: catalog.homes }) +
        field("identity.environment", "Environnement", { choices: catalog.environments }) +
        field("identity.origin", "Origine", { choices: catalog.origins }) +
        field("identity.importantLink", "Lien important", { choices: catalog.importantLinks }) +
        field("identity.identifier", "Identifiant", { choices: catalog.identifiers }) +
      "</div><div class=\"helper-panel\"><strong>À personnaliser :</strong> les propositions servent de point de départ. Vous pouvez choisir « Autre — préciser » ou retoucher chaque valeur générée.</div>";
  }
  function renderStats() {
    return '<h2>Répartir les caractéristiques</h2><p class="step-description">Placez exactement 6 points entre les quatre caractéristiques. Chacune doit rester entre 1 et 3.</p>' +
      '<div class="points-banner"><span>Points de caractéristiques <small>Minimum 1 · maximum 3 chacune</small></span><strong id="statPoints">' + sum(state.stats) + " / 6</strong></div>" +
      '<div class="stat-grid">' +
        statInput("force", "Force", "Effort, puissance, endurance et affirmation.") +
        statInput("agility", "Agilité", "Mouvement, adresse, réflexes, pilotage et tact.") +
        statInput("spirit", "Esprit", "Observation, analyse, recherche et ingénierie.") +
        statInput("empathy", "Empathie", "Écoute, relations, médiation, négociation et soutien.") +
      "</div><div class=\"helper-panel\"><strong>Répartition aléatoire :</strong> chaque tirage ajuste les autres caractéristiques pour conserver exactement 6 points au total.</div>";
  }
  function renderSkills() {
    const groups = catalog.skills.map((group) => {
      const rows = group.items.map((name) => {
        const key = keysForSkills[name];
        return '<div class="skill-row"><label for="skill-' + key + '">' + esc(name) + '</label><input class="skill-input" id="skill-' + key + '" type="number" min="0" max="3" step="1" inputmode="numeric" data-skill="' + key + '" value="' + state.skills[key] + '" aria-label="' + esc(name) + ', de 0 à 3"><button class="field-random field-random-icon" type="button" data-random-skill="' + key + '" aria-label="Répartir les compétences au hasard autour de ' + esc(name) + '">⤨</button></div>';
      }).join("");
      return '<section class="skill-group"><h3>' + esc(group.group) + '<small>4 compétences</small></h3>' + rows + "</section>";
    }).join("");
    return '<h2>Répartir les compétences</h2><p class="step-description">Répartissez exactement 12 points entre les 16 compétences. Une compétence peut commencer à 0 ; aucune ne dépasse 3 à la création.</p>' +
      '<div class="points-banner"><span>Points de compétences <small>0 à 3 par compétence</small></span><strong id="skillPoints">' + sum(state.skills) + " / 12</strong></div>" +
      '<div class="skill-groups">' + groups + "</div><div class=\"helper-panel\"><strong>Répartition aléatoire :</strong> le tirage conserve exactement 12 points au total et ne dépasse jamais 3 dans une compétence.</div>";
  }
  function renderResources() {
    return '<h2>Vos réserves</h2><p class="step-description">Elles sont calculées à partir des caractéristiques et correspondent aux maxima de la fiche. La Résolution sert à activer les talents.</p>' +
      '<div class="resource-preview"><div class="resource-tile"><span>Santé · Force + Agilité</span><strong>' + (state.stats.force + state.stats.agility) + "</strong></div><div class=\"resource-tile\"><span>Résolution · Esprit + Empathie</span><strong>" + (state.stats.spirit + state.stats.empathy) + "</strong></div></div>" +
      '<div class="helper-panel"><strong>À retenir :</strong> les ressources sont calculées automatiquement. Une blessure ne disparaît pas automatiquement à la fin d’une scène ; l’évolution dépend de sa gravité, des soins et du repos.</div>';
  }
  function renderCompanion() {
    return '<h2>Choisir un repère personnel</h2><p class="step-description">La fiche V20 autorise un seul compagnon ou moyen personnel : véhicule, petit animal, petit dinosaure, plante ou robot. Choisissez une proposition du référentiel, puis précisez son nom, son modèle, son espèce ou sa fonction.</p>' +
      '<div class="field-grid one-col">' +
        field("companion.type", "Catégorie unique", { choices: catalog.companionCategories, allowCustom: false, required: true, rerender: true, hint: "Un seul choix parmi les cinq catégories de la fiche V20." }) +
        field("companion.option", "Modèle, profil ou espèce proposée", { choices: catalog.companionOptions[state.companion.type] || [], allowCustom: false, required: true, hint: "Les propositions suivent le livret d’équipement ; précisez le nom et les besoins dans le champ suivant." }) +
        field("companion.detail", "Nom et précisions utiles", { type: "textarea", placeholder: "Nom, fonction, besoins, accès ou habitudes…", hint: "Animal domestiqué : habitat et soins adaptés. Véhicule, animal et robot : disponibilité et accès selon le contexte." }) +
      "</div>" +
      '<div class="helper-panel"><strong>Règles :</strong> un compagnon ou moyen ne donne aucun bonus automatique. Les transports ordinaires restent accessibles par les réseaux publics ; choisir un véhicule ici marque un attachement particulier ou une disponibilité régulière. Les espèces domestiquées gardent leurs besoins et les restrictions d’accès aux transports et aux espaces naturels.</div>';
  }
  function renderHobbies() {
    const cards = catalog.hobbies.map((hobby, index) => {
      const checked = state.hobbies.includes(hobby.name);
      const id = "hobby-" + index;
      return '<article class="hobby-choice' + (checked ? " selected" : "") + '" data-hobby-card="' + esc(hobby.name) + '">' +
        '<div class="hobby-choice-head"><input type="checkbox" id="' + id + '" value="' + esc(hobby.name) + '" data-hobby="' + esc(hobby.name) + '"' + (checked ? " checked" : "") + '><label for="' + id + '"><strong>' + esc(hobby.name) + "</strong></label></div>" +
        '<p>' + esc(hobby.use) + "</p>" +
        '<details><summary>Voir le talent associé</summary><p><strong>1 Résolution :</strong> ' + esc(hobby.talent) + "</p></details>" +
      "</article>";
    }).join("");
    return '<h2>Choisir trois hobbies</h2><p class="step-description">Chaque hobby ajoute +1 D6 lorsqu’il est directement pertinent et ouvre son talent associé. Un seul hobby peut contribuer à un même jet.</p>' +
      '<div class="hobby-toolbar"><input id="hobbySearch" class="search-field" type="search" placeholder="Rechercher un hobby…" aria-label="Rechercher un hobby"><div class="hobby-toolbar-actions"><span class="hobby-count" id="hobbyCount">' + state.hobbies.length + " / 3 choisis</span><button class=\"field-random\" type=\"button\" data-random-hobbies><span aria-hidden=\"true\">⤨</span><span>Tirer trois hobbies</span></button></div></div>" +
      '<div class="hobby-select-grid" id="hobbySelectGrid">' + cards + "</div>" +
      '<div class="helper-panel"><strong>Talent :</strong> l’activation coûte 1 point de Résolution, dépensé avant l’action. En cas d’échec, le point n’est pas rendu.</div>';
  }
  function renderAttachments() {
    return '<h2>Attaches et objectifs</h2><p class="step-description">Un personnage prend forme à travers les personnes qui comptent, les engagements qu’il choisit et les choses qu’il souhaite préserver, réparer ou découvrir.</p>' +
      '<div class="field-grid one-col">' +
        field("attachments.people", "Personnes importantes", { type: "textarea", placeholder: "Qui compte pour votre personnage ? Quelle relation reste à faire évoluer ?" }) +
        field("attachments.motivations", "Motivations et engagements", { type: "textarea", placeholder: "Un projet, une promesse, une question ou un objectif…" }) +
      "</div>";
  }
  function renderEquipment() {
    return '<h2>Équipement et parcours</h2><p class="step-description">Choisissez dans les listes du livret : kit personnel, loisir, accès partagé et protection spécialisée. Les contenus proposés reprennent les exemples du référentiel ; les champs de précision servent à indiquer le matériel disponible et son cadre d’usage.</p>' +
      '<div class="equipment-grid">' +
        '<div class="equipment-item">' + field("equipment.main", "Kit principal / matériel disponible", { choices: catalog.equipmentOptions.main, allowCustom: false, hint: "Un kit lié au quotidien ou à l’activité habituelle." }) + field("equipment.mainDetail", "Contenu du kit", { type: "textarea", placeholder: "Le contenu de référence sera proposé selon le kit choisi.", hint: "Les réparations lourdes et les installations spécialisées relèvent d’un accès partagé." }) + "</div>" +
        '<div class="equipment-item">' + field("equipment.leisure", "Kit de loisir / objets personnels", { choices: catalog.equipmentOptions.leisure, allowCustom: false, hint: "Choisissez le loisir ; détaillez les objets qui l’accompagnent." }) + field("equipment.leisureDetail", "Objets liés au loisir", { type: "textarea", placeholder: "Matériel personnel proposé selon le loisir choisi…", hint: "Le souvenir ou l’objet marquant se précise dans le champ dédié." }) + "</div>" +
        '<div class="equipment-item">' + field("equipment.shared", "Accès partagé / installations", { choiceGroups: catalog.equipmentGroups.shared, allowCustom: false, hint: "Choisissez un accès concret dans sa catégorie." }) + field("equipment.sharedDetail", "Conditions d’accès", { type: "textarea", placeholder: "Prêt, réservation, activité, mission ou qualification…", hint: "Précisez qui autorise l’accès, où et dans quelles conditions." }) + "</div>" +
        '<div class="equipment-item">' + field("equipment.protection", "Protection / outils spécialisés", { choices: catalog.equipmentOptions.protection, allowCustom: false, hint: "Choisissez le contexte, puis vérifiez l’équipement adapté." }) + field("equipment.protectionDetail", "Matériel adapté", { type: "textarea", placeholder: "Le matériel de référence sera proposé selon le contexte.", hint: "L’équipement est spécialisé et dépend de la situation ou de la mission." }) + "</div>" +
        '<div class="equipment-item">' + field("attachments.memory", "Souvenir ou objet marquant", { choices: catalog.memories }) + "</div>" +
        '<div class="equipment-item">' + field("notes", "Notes / relations / événements", { type: "textarea", placeholder: "Une promesse, un événement récent ou une relation à faire évoluer…" }) + "</div>" +
      "</div>" +
      '<div class="helper-panel"><strong>Référence V20 et livret « Kits, véhicules et bestioles » :</strong> un kit décrit le matériel disponible dans la fiction et n’accorde aucun bonus automatique. Un métier ne donne pas automatiquement accès au matériel spécialisé ; un prêt, une réservation, une mission, la disponibilité du lieu ou une qualification peuvent être nécessaires.</div>';
  }
  function listText(items) {
    const values = items.filter((item) => item && String(item).trim());
    return values.length ? values.map(esc).join(", ") : "À préciser";
  }
  function reviewBlock(title, lines) {
    return '<section class="review-block"><h3>' + title + "</h3>" + lines.map((line) => "<p>" + line + "</p>").join("") + "</section>";
  }
  function companionValue() {
    return [state.companion.option, state.companion.detail].filter((item) => item && String(item).trim()).join(" · ");
  }
  function equipmentValue(key) {
    return [state.equipment[key], state.equipment[key + "Detail"]].filter((item) => item && String(item).trim()).join(" — ");
  }
  function renderReview() {
    const name = [state.identity.firstName, state.identity.lastName].filter(Boolean).join(" ") || "Personnage sans nom";
    const stats = "Force " + state.stats.force + " · Agilité " + state.stats.agility + " · Esprit " + state.stats.spirit + " · Empathie " + state.stats.empathy;
    const skillLines = catalog.skills.map((group) => "<strong>" + esc(group.group) + " :</strong> " + group.items.map((name) => esc(name) + " " + state.skills[keysForSkills[name]]).join(" · "));
    const hobbyDetails = state.hobbies.map((name) => {
      const hobby = catalog.hobbies.find((item) => item.name === name);
      return hobby ? "<strong>" + esc(hobby.name) + " :</strong> " + esc(hobby.use) : esc(name);
    });
    return '<h2>Relire votre dossier</h2><p class="step-description">Vérifiez vos choix. Le bouton de téléchargement crée le PDF sur votre appareil ; aucune copie n’est conservée sur le site.</p>' +
      reviewBlock("Identité", ["<strong>" + esc(name) + "</strong> · " + esc(state.identity.age || "Âge à préciser") + " · " + esc(state.identity.pronouns || "Pronoms à préciser"), "<strong>Activité :</strong> " + esc(state.identity.activity || "À préciser") + " · <strong>Lieu :</strong> " + esc(state.identity.home || "À préciser")]) +
      reviewBlock("Aptitudes", ["<strong>Caractéristiques :</strong> " + stats, "<strong>Santé :</strong> " + (state.stats.force + state.stats.agility) + " · <strong>Résolution :</strong> " + (state.stats.spirit + state.stats.empathy), ...skillLines]) +
      reviewBlock("Repères", ["<strong>Compagnon ou moyen :</strong> " + esc([state.companion.type, companionValue()].filter(Boolean).join(" · ") || "À préciser"), ...hobbyDetails, "<strong>Personnes :</strong> " + esc(state.attachments.people || "À préciser"), "<strong>Objectif :</strong> " + esc(state.attachments.motivations || "À préciser")]) +
      reviewBlock("Équipement et parcours", ["<strong>Kit principal :</strong> " + esc(equipmentValue("main") || "À préciser"), "<strong>Loisir :</strong> " + esc(equipmentValue("leisure") || "À préciser"), "<strong>Accès partagé :</strong> " + esc(equipmentValue("shared") || "À préciser"), "<strong>Protection :</strong> " + esc(equipmentValue("protection") || "À préciser"), "<strong>Souvenir :</strong> " + esc(state.attachments.memory || "À préciser"), "<strong>Notes :</strong> " + esc(state.notes || "À préciser")]) +
      '<div class="review-actions"><button class="button button-primary" type="button" id="downloadPdf">Télécharger ma fiche PDF <span aria-hidden="true">↓</span></button></div>' +
      '<div class="download-note">Le PDF reprend tous les champs du formulaire, avec les talents détaillés. Sa pagination s’adapte à la longueur des réponses. Enregistrez-le maintenant : il n’est pas possible de reprendre la saisie depuis le fichier.</div>';
  }
  const renderers = [renderIdentity, renderStats, renderSkills, renderResources, renderCompanion, renderHobbies, renderAttachments, renderEquipment, renderReview];
  const stepTitles = ["Identité", "Caractéristiques", "Compétences", "Ressources", "Repère personnel", "Hobbies", "Attaches et objectifs", "Équipement", "Vérification"];

  function renderStep() {
    content.innerHTML = renderers[step]();
    content.appendChild(errorBox);
    errorBox.textContent = "";
    stepCounter.textContent = "Étape " + (step + 1) + " sur " + renderers.length + " · " + stepTitles[step];
    const percent = ((step + 1) / renderers.length) * 100;
    progressFill.style.width = percent + "%";
    progress.setAttribute("aria-valuenow", String(step + 1));
    previousButton.disabled = step === 0;
    nextButton.hidden = step === renderers.length - 1;
    updateSummary();
    updateProgressCounts();
    content.querySelector("#hobbySearch")?.addEventListener("input", filterHobbies);
    content.querySelector("#downloadPdf")?.addEventListener("click", downloadPdf);
  }
  function updateProgressCounts() {
    const statPoints = document.querySelector("#statPoints");
    if (statPoints) statPoints.textContent = sum(state.stats) + " / 6";
    const skillPoints = document.querySelector("#skillPoints");
    if (skillPoints) skillPoints.textContent = sum(state.skills) + " / 12";
    const hobbyCount = document.querySelector("#hobbyCount");
    if (hobbyCount) hobbyCount.textContent = state.hobbies.length + " / 3 choisis";
    document.querySelectorAll(".hobby-choice").forEach((card) => {
      card.classList.toggle("selected", state.hobbies.includes(card.dataset.hobbyCard));
    });
  }
  function updateSummary() {
    const name = [state.identity.firstName, state.identity.lastName].filter(Boolean).join(" ");
    document.querySelector("#summaryName").textContent = name || "Nouvelle personne";
    document.querySelector("#summaryActivity").textContent = state.identity.activity || "Le récit commence ici.";
    document.querySelector("#summaryHealth").textContent = state.stats.force + state.stats.agility;
    document.querySelector("#summaryResolve").textContent = state.stats.spirit + state.stats.empathy;
    document.querySelector("#summaryStats").textContent = sum(state.stats) + " / 6";
    document.querySelector("#summarySkills").textContent = sum(state.skills) + " / 12";
    document.querySelector("#summaryHobbies").textContent = state.hobbies.length + " / 3";
    const summaryCompanion = document.querySelector("#summaryCompanion");
    if (summaryCompanion) summaryCompanion.textContent = state.companion.type || "À choisir";
  }
  function filterHobbies(event) {
    const query = event.target.value.trim().toLocaleLowerCase("fr");
    document.querySelectorAll(".hobby-choice").forEach((card) => {
      card.hidden = !card.dataset.hobbyCard.toLocaleLowerCase("fr").includes(query);
    });
  }
  function syncInput(target) {
    if (target.dataset.path) {
      setPath(target.dataset.path, target.value);
      dirty = true;
    } else if (target.dataset.stat) {
      state.stats[target.dataset.stat] = Number(target.value);
      dirty = true;
    } else if (target.dataset.skill) {
      state.skills[target.dataset.skill] = Number(target.value);
      dirty = true;
    } else if (target.dataset.hobby) {
      const name = target.dataset.hobby;
      if (target.checked && state.hobbies.length >= 3 && !state.hobbies.includes(name)) {
        target.checked = false;
        errorBox.textContent = "Choisissez exactement trois hobbies ; retirez-en un avant d’en ajouter un autre.";
      } else {
        state.hobbies = target.checked ? state.hobbies.concat(name) : state.hobbies.filter((item) => item !== name);
        dirty = true;
        errorBox.textContent = "";
      }
    }
    updateSummary();
    updateProgressCounts();
  }
  function changeChoice(target) {
    const path = target.dataset.choicePath;
    const custom = target.closest(".form-field")?.querySelector(".field-custom");
    if (!path) return;
    if (target.value === "__custom__") {
      setPath(path, "");
      if (custom) {
        custom.hidden = false;
        custom.focus();
      }
    } else {
      setPath(path, target.value);
      if (custom) {
        custom.hidden = true;
        custom.value = "";
      }
    }
    const equipmentMatch = path.match(/^equipment\.(main|leisure|shared|protection)$/);
    if (equipmentMatch) {
      const detailPath = "equipment." + equipmentMatch[1] + "Detail";
      const detail = equipmentDetailOptions(equipmentMatch[1], target.value)[0] || "";
      setPath(detailPath, detail);
      const detailField = form.querySelector('[data-path="' + detailPath + '"]');
      if (detailField) detailField.value = detail;
    }
    if (path === "companion.option") {
      const detail = companionDetailOptions(target.value)[0] || "";
      setPath("companion.detail", detail);
      const detailField = form.querySelector('[data-path="companion.detail"]');
      if (detailField) detailField.value = detail;
    }
    dirty = true;
    errorBox.textContent = "";
    if (target.dataset.rerender === "true") {
      if (path === "companion.type") {
        state.companion.option = "";
        state.companion.detail = "";
      }
      renderStep();
    } else {
      updateSummary();
      updateProgressCounts();
    }
  }
  function randomizeStats(targetKey) {
    const keys = Object.keys(state.stats);
    const chosen = 1 + Math.floor(Math.random() * 3);
    state.stats[targetKey] = chosen;
    const others = keys.filter((key) => key !== targetKey);
    others.forEach((key) => { state.stats[key] = 1; });
    let remaining = 3 - chosen;
    while (remaining > 0) {
      const available = others.filter((key) => state.stats[key] < 3);
      if (!available.length) break;
      state.stats[pick(available)] += 1;
      remaining -= 1;
    }
  }
  function randomizeSkills(targetKey) {
    const keys = Object.keys(state.skills);
    const chosen = Math.floor(Math.random() * 4);
    keys.forEach((key) => { state.skills[key] = 0; });
    state.skills[targetKey] = chosen;
    let remaining = 12 - chosen;
    while (remaining > 0) {
      const available = keys.filter((key) => key !== targetKey && state.skills[key] < 3);
      if (!available.length) break;
      state.skills[pick(available)] += 1;
      remaining -= 1;
    }
  }
  function randomizeHobbies() {
    state.hobbies = shuffle(catalog.hobbies.map((hobby) => hobby.name)).slice(0, 3);
  }
  function randomizePath(path) {
    const choices = {
      "identity.firstName": catalog.firstNames,
      "identity.lastName": catalog.lastNames,
      "identity.pronouns": catalog.pronouns,
      "identity.activity": catalog.jobs,
      "identity.community": catalog.communities,
      "identity.home": catalog.homes,
      "identity.environment": catalog.environments,
      "identity.origin": catalog.origins,
      "identity.importantLink": catalog.importantLinks,
      "identity.identifier": catalog.identifiers,
      "attachments.people": catalog.peoplePrompts,
      "attachments.motivations": catalog.motivationPrompts,
      "attachments.memory": catalog.memories,
      notes: catalog.notePrompts
    };
    if (path === "identity.age") {
      setPath(path, String(18 + Math.floor(Math.random() * 58)));
    } else if (path === "companion.type") {
      state.companion.type = pick(catalog.companionCategories);
      state.companion.option = pick(catalog.companionOptions[state.companion.type]);
      state.companion.detail = pick(companionDetailOptions(state.companion.option));
    } else if (path === "companion.option") {
      if (!state.companion.type) state.companion.type = pick(catalog.companionCategories);
      const option = pick(catalog.companionOptions[state.companion.type]);
      setPath(path, option);
      state.companion.detail = pick(companionDetailOptions(option));
    } else if (path === "companion.detail") {
      if (!state.companion.type) state.companion.type = pick(catalog.companionCategories);
      if (!state.companion.option) state.companion.option = pick(catalog.companionOptions[state.companion.type]);
      setPath(path, pick(companionDetailOptions(state.companion.option)));
    } else if (path.startsWith("equipment.")) {
      const [, key, part] = path.match(/^equipment\.(main|leisure|shared|protection)(Detail)?$/) || [];
      if (key && part) {
        let option = state.equipment[key];
        if (!catalog.equipmentOptions[key].includes(option)) {
          option = pick(catalog.equipmentOptions[key]);
          setPath("equipment." + key, option);
        }
        setPath(path, pick(equipmentDetailOptions(key, option)));
      } else if (key) {
        const option = pick(catalog.equipmentOptions[key]);
        setPath(path, option);
        setPath("equipment." + key + "Detail", pick(equipmentDetailOptions(key, option)));
      }
    } else if (choices[path]) {
      setPath(path, pick(choices[path]));
    }
    dirty = true;
    errorBox.textContent = "";
    renderStep();
  }
  form.addEventListener("click", (event) => {
    const button = event.target.closest("[data-random-path], [data-random-stat], [data-random-skill], [data-random-hobbies]");
    if (!button) return;
    event.preventDefault();
    if (button.dataset.randomStat) {
      randomizeStats(button.dataset.randomStat);
      dirty = true;
      renderStep();
    } else if (button.dataset.randomSkill) {
      randomizeSkills(button.dataset.randomSkill);
      dirty = true;
      renderStep();
    } else if (button.hasAttribute("data-random-hobbies")) {
      randomizeHobbies();
      dirty = true;
      renderStep();
    } else {
      randomizePath(button.dataset.randomPath);
    }
  });
  form.addEventListener("input", (event) => {
    if (event.target.id === "hobbySearch") return;
    if (event.target.dataset.path || event.target.dataset.stat || event.target.dataset.skill) syncInput(event.target);
  });
  form.addEventListener("change", (event) => {
    if (event.target.dataset.choicePath) changeChoice(event.target);
    else if (event.target.dataset.hobby || event.target.dataset.stat || event.target.dataset.skill) syncInput(event.target);
  });
  function validateStep() {
    errorBox.textContent = "";
    if (step === 0 && !state.identity.firstName.trim()) {
      errorBox.textContent = "Indiquez au moins le prénom du personnage pour continuer.";
      return false;
    }
    if (step === 1) {
      const values = Object.values(state.stats);
      if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 3) || sum(state.stats) !== 6) {
        errorBox.textContent = "Répartissez exactement 6 points ; chaque caractéristique doit valoir de 1 à 3.";
        return false;
      }
    }
    if (step === 2) {
      const values = Object.values(state.skills);
      if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 3) || sum(state.skills) !== 12) {
        errorBox.textContent = "Répartissez exactement 12 points ; chaque compétence doit valoir de 0 à 3.";
        return false;
      }
    }
    if (step === 4 && (!state.companion.type || !catalog.companionOptions[state.companion.type]?.includes(state.companion.option))) {
      errorBox.textContent = "Choisissez une seule catégorie et une proposition du référentiel pour le compagnon ou le moyen personnel.";
      return false;
    }
    if (step === 5 && state.hobbies.length !== 3) {
      errorBox.textContent = "Choisissez exactement trois hobbies.";
      return false;
    }
    return true;
  }
  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    if (step < renderers.length - 1) {
      step += 1;
      renderStep();
      content.querySelector("h2")?.focus({ preventScroll: true });
      document.querySelector(".wizard-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  previousButton.addEventListener("click", () => {
    if (step > 0) {
      step -= 1;
      renderStep();
      document.querySelector(".wizard-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  const summaryToggle = document.querySelector("#summaryToggle");
  summaryToggle?.addEventListener("click", () => {
    const card = document.querySelector("#summaryCard");
    const expanded = summaryToggle.getAttribute("aria-expanded") === "true";
    summaryToggle.setAttribute("aria-expanded", String(!expanded));
    summaryToggle.querySelector("span").textContent = expanded ? "＋" : "−";
    card.classList.toggle("expanded", !expanded);
  });
  document.querySelector("#closeDownloadDialog")?.addEventListener("click", () => document.querySelector("#downloadDialog").close());

  function pdfByte(char) {
    const code = char.codePointAt(0);
    if (code >= 0 && code <= 0x7f) return code;
    if (code >= 0xa0 && code <= 0xff) return code;
    const extended = {
      0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86,
      0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
      0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
      0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
      0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f
    };
    return extended[code] || 0x3f;
  }
  function ansiString(value) {
    let out = "";
    for (const char of String(value == null ? "" : value)) {
      const byte = pdfByte(char);
      out += String.fromCharCode(byte);
    }
    return out;
  }
  function pdfEscape(value) {
    return ansiString(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " ");
  }
  function wrapText(value, limit) {
    const text = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
    const output = [];
    text.split("\n").forEach((paragraph) => {
      if (!paragraph.trim()) {
        output.push("");
        return;
      }
      let line = "";
      const words = paragraph.trim().split(/\s+/);
      words.forEach((originalWord) => {
        let word = originalWord;
        while (word.length > limit) {
          if (line) {
            output.push(line);
            line = "";
          }
          output.push(word.slice(0, limit));
          word = word.slice(limit);
        }
        if (!word) return;
        const next = line ? line + " " + word : word;
        if (next.length > limit && line) {
          output.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) output.push(line);
    });
    return output.length ? output : ["—"];
  }
  function colorValue(color) {
    return color.map((number) => Number(number).toFixed(3)).join(" ");
  }
  function pdfText(ops, x, y, size, value, bold, color) {
    ops.push(colorValue(color || [0.15, 0.2, 0.16]) + " rg BT /" + (bold ? "F2" : "F1") + " " + size + " Tf 1 0 0 1 " + x + " " + y + " Tm (" + pdfEscape(value) + ") Tj ET");
  }
  function pdfParagraph(ops, x, y, size, value, maxChars, leading, color, bold) {
    const lines = wrapText(value, maxChars);
    lines.forEach((line, index) => pdfText(ops, x, y - index * leading, size, line, !!bold, color || [0.34, 0.39, 0.34]));
    return y - lines.length * leading;
  }
  function pdfLine(ops, x1, y1, x2, y2, color, width) {
    ops.push(colorValue(color || [0.75, 0.8, 0.72]) + " RG " + (width || 0.65) + " w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
  }
  function pdfRect(ops, x, y, w, h, color) {
    ops.push(colorValue(color) + " rg " + x + " " + y + " " + w + " " + h + " re f");
  }
  function buildPdfPages() {
    const pages = [];
    const bottom = 60;
    let current = null;
    let y = 0;

    function startPage(first) {
      const ops = [];
      pdfRect(ops, 0, 0, 595, 842, [1, 1, 1]);
      pdfRect(ops, 0, 824, 595, 18, [0.09, 0.15, 0.11]);
      pdfText(ops, 42, 795, 24, "Terre 2187", true, [0.12, 0.19, 0.13]);
      pdfText(ops, 42, 779, 8, first ? "FICHE PERSONNAGE  ·  IDENTITÉ ET APTITUDES" : "FICHE PERSONNAGE  ·  SUITE DU DOSSIER", true, [0.39, 0.49, 0.36]);
      pdfText(ops, 484, 795, 7.5, "RÉFÉRENCE V20", true, [0.44, 0.52, 0.42]);
      pdfLine(ops, 42, 767, 553, 767, [0.66, 0.75, 0.62], 1.2);
      current = { ops: ops };
      pages.push(current);
      y = 751;
    }

    function ensureSpace(height) {
      if (!current) startPage(true);
      if (y - height < bottom) startPage(false);
    }

    function drawSection(number, label) {
      const heading = number + " / " + label.toUpperCase();
      const lines = wrapText(heading, 112);
      const height = 11 + (lines.length - 1) * 10 + 12;
      ensureSpace(height + 70);
      lines.forEach((line, index) => pdfText(current.ops, 42, y - index * 10, 8, line, true, [0.34, 0.48, 0.3]));
      const lineY = y - lines.length * 10 + 1;
      pdfLine(current.ops, 42, lineY, 553, lineY, [0.79, 0.83, 0.76], 0.6);
      y = lineY - 12;
    }

    function fieldLines(label, value, width) {
      const labelChars = Math.max(12, Math.floor((width - 8) / (6.7 * 0.53)));
      const valueChars = Math.max(14, Math.floor((width - 8) / (8.3 * 0.51)));
      return {
        label: wrapText(String(label || "").toUpperCase(), labelChars),
        value: wrapText(value && String(value).trim() ? value : "—", valueChars)
      };
    }

    function drawFlowField(label, value) {
      const textLines = fieldLines(label, value, 511);
      const labelLines = textLines.label;
      const valueLines = textLines.value;
      let lineIndex = 0;
      let continued = false;

      while (lineIndex < valueLines.length) {
        const heading = continued ? String(label).toUpperCase() + "  ·  SUITE" : String(label).toUpperCase();
        const headingLines = wrapText(heading, 112);
        const headingHeight = headingLines.length * 8 + 4;
        if (y - headingHeight < bottom + 12) startPage(false);
        headingLines.forEach((line, index) => pdfText(current.ops, 42, y - index * 8, 6.7, line, true, [0.47, 0.53, 0.46]));
        y -= headingHeight;

        const available = Math.floor((y - bottom - 8) / 10.5);
        if (available < 1) {
          startPage(false);
          continued = true;
          continue;
        }
        const count = Math.min(available, valueLines.length - lineIndex);
        for (let index = 0; index < count; index++) {
          pdfText(current.ops, 42, y - index * 10.5, 8.3, valueLines[lineIndex + index], false, [0.16, 0.21, 0.17]);
        }
        lineIndex += count;
        y -= count * 10.5 + 6;
        pdfLine(current.ops, 42, y + 2, 553, y + 2, [0.87, 0.89, 0.84], 0.45);
        y -= 7;
        if (lineIndex < valueLines.length) {
          startPage(false);
          continued = true;
        }
      }
    }

    function drawFieldRow(fields) {
      const pair = fields.length > 1;
      const width = pair ? 244 : 511;
      const laidOut = fields.map((field) => fieldLines(field[0], field[1], width));
      const tooLong = laidOut.some((item) => item.value.length > 4 || item.label.length > 2);
      if (tooLong) {
        fields.forEach((field) => drawFlowField(field[0], field[1]));
        return;
      }

      const lineCount = Math.max.apply(null, laidOut.map((item) => item.value.length));
      const labelCount = Math.max.apply(null, laidOut.map((item) => item.label.length));
      const rowHeight = labelCount * 8 + 4 + lineCount * 10 + 10;
      ensureSpace(rowHeight + 12);
      fields.forEach((field, fieldIndex) => {
        const x = pair && fieldIndex === 1 ? 309 : 42;
        const item = laidOut[fieldIndex];
        item.label.forEach((line, index) => pdfText(current.ops, x, y - index * 8, 6.7, line, true, [0.47, 0.53, 0.46]));
        const valueY = y - labelCount * 8 - 4;
        item.value.forEach((line, index) => pdfText(current.ops, x, valueY - index * 10, 8.3, line, false, [0.16, 0.21, 0.17]));
        pdfLine(current.ops, x, y - rowHeight - 4, x + width, y - rowHeight - 4, [0.87, 0.89, 0.84], 0.45);
      });
      y -= rowHeight + 12;
    }

    function drawLongText(label, value) {
      drawFlowField(label, value);
    }

    function drawStats() {
      const stats = [
        ["Force", state.stats.force, "effort · puissance · endurance"],
        ["Agilité", state.stats.agility, "mouvement · adresse · réflexes"],
        ["Esprit", state.stats.spirit, "observation · analyse · ingénierie"],
        ["Empathie", state.stats.empathy, "écoute · relations · soutien"]
      ];
      const cardHeight = 42;
      ensureSpace(cardHeight * 2 + 20);
      stats.forEach((item, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = column === 0 ? 42 : 309;
        const top = y - row * (cardHeight + 6);
        const cardBottom = top - cardHeight;
        pdfRect(current.ops, x, cardBottom, 244, cardHeight, [0.95, 0.96, 0.93]);
        pdfText(current.ops, x + 10, top - 17, 11, item[0], true, [0.17, 0.25, 0.18]);
        pdfText(current.ops, x + 10, top - 32, 6.7, item[2], false, [0.47, 0.53, 0.46]);
        pdfText(current.ops, x + 216, top - 25, 15, String(item[1]), true, [0.36, 0.51, 0.3]);
      });
      y -= cardHeight * 2 + 20;
    }

    function drawSkillGroups() {
      const groups = [];
      for (let index = 0; index < catalog.skills.length; index += 2) {
        groups.push(catalog.skills.slice(index, index + 2));
      }
      const cardHeight = 68;
      groups.forEach((row) => {
        ensureSpace(cardHeight + 8);
        row.forEach((group, column) => {
          const x = column === 0 ? 42 : 309;
          const top = y;
          const cardBottom = top - cardHeight;
          pdfRect(current.ops, x, cardBottom, 244, cardHeight, [0.97, 0.975, 0.96]);
          pdfText(current.ops, x + 9, top - 14, 9.5, group.group, true, [0.26, 0.39, 0.26]);
          pdfLine(current.ops, x + 9, top - 19, x + 235, top - 19, [0.81, 0.85, 0.78], 0.5);
          group.items.forEach((name, itemIndex) => {
            const rowY = top - 31 - itemIndex * 8.5;
            pdfText(current.ops, x + 9, rowY, 7.2, name, false, [0.22, 0.27, 0.22]);
            pdfText(current.ops, x + 219, rowY, 8, String(state.skills[keysForSkills[name]]), true, [0.35, 0.47, 0.31]);
          });
        });
        y -= cardHeight + 8;
      });
    }

    function drawResourceCards() {
      ensureSpace(54);
      const resources = [
        ["SANTÉ  ·  FORCE + AGILITÉ", state.stats.force + state.stats.agility],
        ["RÉSOLUTION  ·  ESPRIT + EMPATHIE", state.stats.spirit + state.stats.empathy]
      ];
      resources.forEach((item, index) => {
        const x = index === 0 ? 42 : 309;
        pdfRect(current.ops, x, y - 43, 244, 43, [0.91, 0.94, 0.88]);
        pdfText(current.ops, x + 12, y - 16, 7, item[0], true, [0.39, 0.46, 0.37]);
        pdfText(current.ops, x + 12, y - 36, 15, String(item[1]), true, [0.2, 0.34, 0.22]);
      });
      y -= 53;
    }

    function drawHobby(hobby) {
      const usage = wrapText("Usage : " + hobby.use, 112);
      const talent = wrapText(hobby.talent, 112);
      const height = 17 + usage.length * 10 + 13 + talent.length * 10 + 9;
      if (height > 620) {
        drawLongText("Hobby : " + hobby.name + " · usage", hobby.use);
        drawLongText("Talent associé à " + hobby.name + " · 1 Résolution", hobby.talent);
        return;
      }
      ensureSpace(height);
      const top = y;
      pdfRect(current.ops, 42, top - height, 511, height, [0.96, 0.97, 0.94]);
      pdfText(current.ops, 53, top - 15, 10.5, hobby.name, true, [0.18, 0.28, 0.18]);
      let textY = top - 29;
      usage.forEach((line) => {
        pdfText(current.ops, 53, textY, 7.6, line, false, [0.37, 0.43, 0.36]);
        textY -= 9;
      });
      textY -= 3;
      pdfText(current.ops, 53, textY, 7.4, "TALENT ASSOCIÉ  ·  ACTIVATION : 1 RÉSOLUTION", true, [0.43, 0.49, 0.42]);
      textY -= 11;
      talent.forEach((line) => {
        pdfText(current.ops, 53, textY, 8, line, false, [0.16, 0.21, 0.17]);
        textY -= 9;
      });
      y = top - height - 9;
    }

    startPage(true);

    drawSection("01", "Identité");
    drawFieldRow([["Nom", state.identity.lastName], ["Prénom", state.identity.firstName]]);
    drawFieldRow([["Âge", state.identity.age], ["Pronoms", state.identity.pronouns]]);
    drawFieldRow([["Activité principale", state.identity.activity], ["Communauté", state.identity.community]]);
    drawFieldRow([["Lieu de vie", state.identity.home], ["Environnement", state.identity.environment]]);
    drawFieldRow([["Origine", state.identity.origin], ["Lien important", state.identity.importantLink]]);
    drawFieldRow([["Identifiant", state.identity.identifier]]);

    drawSection("02", "Caractéristiques · 6 points au total · 1 à 3 chacune");
    drawStats();

    drawSection("03", "Compétences · 12 points à répartir · maximum 3 par compétence");
    drawSkillGroups();

    drawSection("04", "Ressources");
    drawResourceCards();

    drawSection("05", "Compagnon ou moyen personnel · une option");
    drawFieldRow([["Catégorie", state.companion.type], ["Nom, modèle ou espèce", state.companion.option]]);
    drawLongText("Détails du compagnon ou du moyen personnel", state.companion.detail);

    drawSection("06", "Hobbies · 3 choix gratuits");
    const chosen = state.hobbies.map((name) => catalog.hobbies.find((hobby) => hobby.name === name)).filter(Boolean);
    if (chosen.length) chosen.forEach(drawHobby);
    else drawLongText("Hobbies choisis", "Aucun hobby choisi");
    drawLongText("Règle des hobbies et talents", "Un seul hobby peut ajouter +1 D6 à un jet lorsqu’il est directement pertinent. Chaque talent coûte 1 point de Résolution, dépensé avant l’action ; un point dépensé n’est pas rendu en cas d’échec.");

    drawSection("07", "Attaches et objectifs");
    drawFieldRow([["Personnes importantes", state.attachments.people], ["Motivations / engagements", state.attachments.motivations]]);

    drawSection("08", "Souvenir ou objet marquant");
    drawLongText("Souvenir ou objet marquant", state.attachments.memory);

    drawSection("09", "Équipement et parcours");
    drawFieldRow([["Kit principal / matériel disponible", state.equipment.main], ["Contenu du kit principal", state.equipment.mainDetail]]);
    drawFieldRow([["Kit de loisir / objets personnels", state.equipment.leisure], ["Objets liés au loisir", state.equipment.leisureDetail]]);
    drawFieldRow([["Accès partagé / installations", state.equipment.shared], ["Conditions d’accès", state.equipment.sharedDetail]]);
    drawFieldRow([["Protection / outils spécialisés", state.equipment.protection], ["Matériel adapté", state.equipment.protectionDetail]]);

    drawSection("10", "Notes, relations et événements");
    drawLongText("Notes, relations et événements", state.notes);

    pages.forEach((page, index) => {
      pdfLine(page.ops, 42, 42, 553, 42, [0.79, 0.83, 0.76], 0.55);
      pdfText(page.ops, 42, 27, 6.8, "TERRE 2187  ·  FICHE PERSONNAGE COMPLÈTE", true, [0.5, 0.56, 0.49]);
      pdfText(page.ops, 491, 27, 6.8, String(index + 1).padStart(2, "0") + " / " + String(pages.length).padStart(2, "0"), true, [0.5, 0.56, 0.49]);
    });
    return pages.map((page) => page.ops.join("\n"));
  }
  function bytesFromBinary(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index) & 255;
    return bytes;
  }
  function makePdf() {
    const pages = buildPdfPages();
    const firstFont = 3 + pages.length * 2;
    const secondFont = firstFont + 1;
    const pageRefs = pages.map((page, index) => (3 + index * 2) + " 0 R").join(" ");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [" + pageRefs + "] /Count " + pages.length + " >>"
    ];
    pages.forEach((content, index) => {
      const pageObject = 3 + index * 2;
      const contentObject = pageObject + 1;
      objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + firstFont + " 0 R /F2 " + secondFont + " 0 R >> >> /Contents " + contentObject + " 0 R >>");
      objects.push("<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
    });
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    let binary = "%PDF-1.4\n%âãÏÓ\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(binary.length);
      binary += (index + 1) + " 0 obj\n" + object + "\nendobj\n";
    });
    const xrefOffset = binary.length;
    binary += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
      binary += String(offset).padStart(10, "0") + " 00000 n \n";
    });
    binary += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
    return new Blob([bytesFromBinary(binary)], { type: "application/pdf" });
  }
  function safeFilename(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  }
  function downloadPdf() {
    const blob = makePdf();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const name = safeFilename([state.identity.firstName, state.identity.lastName].filter(Boolean).join("_")) || "personnage";
    link.href = url;
    link.download = "Terre_2187_" + name + ".pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    pdfDownloaded = true;
    const dialog = document.querySelector("#downloadDialog");
    if (dialog && typeof dialog.showModal === "function") dialog.showModal();
  }
  window.addEventListener("beforeunload", (event) => {
    if (dirty && !pdfDownloaded) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  renderStep();
})();
