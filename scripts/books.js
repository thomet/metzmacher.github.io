(function () {
  const sectionLabels = {
    current: "Gerade aufgeschlagen",
    recent: "Zuletzt ins Regal gestellt",
    tbr: "Noch auf dem Stapel",
  };

  const fallbackTexts = {
    current: "Hier erscheinen die Bücher, die bei READO gerade als gelesen markiert sind.",
    recent: "Hier landen die zuletzt gelesenen Bücher, sobald die tägliche Aktualisierung Daten findet.",
    tbr: "Hier ist Platz für ungelesene Bücher, die schon im Regal warten.",
  };

  const containers = document.querySelectorAll("[data-books-section]");

  if (!containers.length) return;

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function createFallback(section) {
    const card = createElement("article", "placeholder-card book-fallback");
    card.append(createElement("span", "", "Platz im Regal"));
    card.append(createElement("h3", "", sectionLabels[section] || "Buecher"));
    card.append(createElement("p", "", fallbackTexts[section] || "Hier erscheinen spaeter Buchdaten."));
    return card;
  }

  function createBookCard(book, section) {
    const article = createElement("article", `book-card book-card-${section}`);
    const coverLink = createElement("a", "book-cover");
    coverLink.href = book.url || book.profileUrl || "#";
    coverLink.setAttribute("aria-label", `${book.title || "Buch"} bei READO ansehen`);

    if (book.cover) {
      const img = document.createElement("img");
      img.src = book.cover;
      img.alt = book.title ? `Cover von ${book.title}` : "";
      img.loading = "lazy";
      coverLink.append(img);
    } else {
      coverLink.append(createElement("span", "", "Kein Cover"));
    }

    const body = createElement("div", "book-body");
    const owner = createElement("p", "book-owner", book.ownerName || "");
    const title = createElement("h3", "book-title", book.title || "Buch bei READO");
    const author = createElement("p", "book-author", book.author || "Autor noch nicht auslesbar");
    const link = createElement("a", "book-link", "Bei READO ansehen");
    link.href = book.url || book.profileUrl || "#";

    body.append(owner, title, author, link);
    article.append(coverLink, body);
    return article;
  }

  function renderSection(container, books, section) {
    container.replaceChildren();

    if (!books || !books.length) {
      container.append(createFallback(section));
      return;
    }

    const visibleBooks = section === "current" ? books.slice(0, 2) : books;
    visibleBooks.forEach((book) => {
      container.append(createBookCard(book, section));
    });
  }

  fetch("/data/books.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("books.json nicht verfuegbar");
      return response.json();
    })
    .then((data) => {
      containers.forEach((container) => {
        const section = container.dataset.booksSection;
        renderSection(container, data.sections && data.sections[section], section);
      });
    })
    .catch(() => {
      containers.forEach((container) => {
        if (!container.children.length) {
          container.append(createFallback(container.dataset.booksSection));
        }
      });
    });
})();
