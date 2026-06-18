(function () {
  const sections = document.querySelectorAll("[data-games-section]");

  if (!sections.length) {
    return;
  }

  const createCard = (entry, sectionName) => {
    const card = document.createElement("article");
    const isWishlist = sectionName === "wishlist";
    const isCollection = sectionName === "collection";

    card.className = isWishlist
      ? "placeholder-card game-wish-card"
      : isCollection
        ? "collection-card game-shelf-card"
        : "collection-card game-card";

    if (isWishlist) {
      const label = document.createElement("span");
      label.textContent = "Leicht austauschbar";
      card.append(label);
    }

    const title = document.createElement("h3");
    title.textContent = entry.title;
    card.append(title);

    if (entry.description) {
      const description = document.createElement("p");
      description.textContent = entry.description;
      card.append(description);
    }

    return card;
  };

  fetch("/data/games.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("games.json could not be loaded");
      }

      return response.json();
    })
    .then((data) => {
      sections.forEach((section) => {
        const sectionName = section.dataset.gamesSection;
        const entries = Array.isArray(data[sectionName]) ? data[sectionName] : [];

        if (!entries.length) {
          return;
        }

        section.replaceChildren(
          ...entries.map((entry) => createCard(entry, sectionName))
        );
      });
    })
    .catch(() => {
      // The static fallback in the HTML stays visible when the data file is unavailable.
    });
})();
