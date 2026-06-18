(function () {
  const container = document.querySelector("[data-trips-list]");

  if (!container) return;

  let videoDialog;
  let videoFrameContainer;
  let videoTitle;
  let videoDate;

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function youtubeEmbedUrl(url) {
    try {
      const parsed = new URL(url);
      let videoId = "";

      if (parsed.hostname === "youtu.be") {
        videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
      } else if (parsed.hostname.endsWith("youtube.com")) {
        videoId = parsed.searchParams.get("v") || "";

        if (!videoId && parsed.pathname.startsWith("/shorts/")) {
          videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
        }

        if (!videoId && parsed.pathname.startsWith("/embed/")) {
          videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
        }
      }

      return videoId ? `https://www.youtube.com/embed/${videoId}?feature=oembed&rel=0` : "";
    } catch {
      return "";
    }
  }

  function ensureVideoDialog() {
    if (videoDialog) return videoDialog;

    videoDialog = createElement("dialog", "trip-video-dialog");
    const content = createElement("div", "trip-video-dialog-content");
    const header = createElement("div", "trip-video-dialog-header");
    const headingGroup = createElement("div", "trip-video-heading");
    videoTitle = createElement("h2", "", "Reisevideo");
    videoDate = createElement("p", "trip-date", "");
    const closeButton = createElement("button", "trip-video-close", "× Schließen");
    closeButton.type = "button";
    videoFrameContainer = createElement("div", "trip-video-frame");

    headingGroup.append(videoTitle, videoDate);
    header.append(headingGroup, closeButton);
    content.append(header, videoFrameContainer);
    videoDialog.append(content);
    document.body.append(videoDialog);

    function closeDialog() {
      videoDialog.close();
    }

    closeButton.addEventListener("click", closeDialog);
    videoDialog.addEventListener("click", (event) => {
      if (event.target === videoDialog) {
        closeDialog();
      }
    });
    videoDialog.addEventListener("close", () => {
      videoFrameContainer.replaceChildren();
    });

    return videoDialog;
  }

  function openVideoDialog(trip) {
    const embedUrl = youtubeEmbedUrl(trip.videoUrl || "");
    if (!embedUrl) return;

    const dialog = ensureVideoDialog();
    const iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.title = trip.title ? `Reisevideo: ${trip.title}` : "Reisevideo";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    videoTitle.textContent = trip.title || "Reisevideo";
    videoDate.textContent = trip.dateLabel || "";
    videoDate.hidden = !trip.dateLabel;
    videoFrameContainer.replaceChildren(iframe);
    dialog.showModal();
  }

  function createFallbackCard() {
    const card = createElement("article", "placeholder-card trip-fallback");
    card.append(createElement("span", "", "Platz für eine Reise"));
    card.append(createElement("h3", "", "Eine Reise, die blieb"));
    card.append(createElement("p", "", "Hier erscheinen ausgewählte Lambus-Journale, sobald Daten vorhanden sind."));
    return card;
  }

  function createTripCard(trip) {
    const card = createElement("article", "trip-card");
    const media = createElement("div", "trip-media");

    if (trip.image) {
      const img = document.createElement("img");
      img.src = trip.image;
      img.alt = trip.title ? `Bild zu ${trip.title}` : "";
      img.loading = "lazy";
      media.append(img);
    } else {
      media.append(createElement("span", "", "Bildplatzhalter"));
    }

    const body = createElement("div", "trip-body");
    const title = createElement("h3", "", trip.title || "Reise");
    const date = trip.dateLabel ? createElement("p", "trip-date", trip.dateLabel) : null;
    const note = createElement("p", "", trip.note || trip.description || "Eine ausgewählte Reise aus dem Fernwehzimmer.");
    const actions = createElement("div", "trip-actions");
    const link = createElement("a", "trip-link trip-primary-link", "Reisebericht öffnen →");
    link.href = trip.url || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const videoLink = trip.videoUrl ? createElement("button", "trip-video-link", "▶ Reisevideo") : null;

    if (videoLink) {
      videoLink.type = "button";
      videoLink.addEventListener("click", () => openVideoDialog(trip));
    }

    actions.append(link);
    if (videoLink) actions.append(videoLink);
    body.append(title);
    if (date) body.append(date);
    body.append(note, actions);
    card.append(media, body);
    return card;
  }

  fetch("/data/trips.generated.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("trips.generated.json nicht verfügbar");
      return response.json();
    })
    .then((data) => {
      container.replaceChildren();
      const trips = data.trips || [];

      if (!trips.length) {
        container.dataset.tripCount = "0";
        container.append(createFallbackCard());
        return;
      }

      container.dataset.tripCount = String(trips.length);
      trips.forEach((trip) => container.append(createTripCard(trip)));
    })
    .catch(() => {
      if (!container.children.length) {
        container.dataset.tripCount = "0";
        container.append(createFallbackCard());
      }
    });
})();
