import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const INPUT_FILE = join(ROOT, "data", "trips.json");
const OUT_FILE = join(ROOT, "data", "trips.generated.json");
const LAMBUS_API_BASE_URL = "https://prod.api.lambus.io";
const LAMBUS_JOURNAL_HEADER = "tz636r6Cbd+rwPBE";

const diagnostics = [];

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "metzmacher.me static pages updater (+https://metzmacher.me)",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "metzmacher.me static pages updater (+https://metzmacher.me)",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readMeta(html, property) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern) || html.match(reversePattern);
  return match ? decodeHtmlEntities(match[1].trim()) : "";
}

function absoluteUrl(value, baseUrl) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function journalIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

function firstImageFromTrip(trip) {
  if (!trip) return "";

  if (typeof trip.theme === "string" && trip.theme.startsWith("http")) {
    return trip.theme;
  }

  for (const waypoint of trip.waypoints || []) {
    const waypointPhoto = waypoint.photos?.find((photo) => photo?.url)?.url;
    if (waypointPhoto) return waypointPhoto;

    const metaImage = waypoint.location?.meta?.images?.find(Boolean);
    if (metaImage) return metaImage;
  }

  return "";
}

function dateValue(date) {
  return typeof date === "string" ? date : date?.value || "";
}

function formatDateRange(startDate, endDate) {
  const start = dateValue(startDate);
  const end = dateValue(endDate);

  if (!start && !end) return "";

  const formatter = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (start && !end) {
    return formatter.format(new Date(`${start}T00:00:00`));
  }

  if (!start && end) {
    return formatter.format(new Date(`${end}T00:00:00`));
  }

  const startDateObject = new Date(`${start}T00:00:00`);
  const endDateObject = new Date(`${end}T00:00:00`);

  if (Number.isNaN(startDateObject.getTime()) || Number.isNaN(endDateObject.getTime())) {
    return "";
  }

  if (start === end) {
    return formatter.format(startDateObject);
  }

  const sameYear = startDateObject.getFullYear() === endDateObject.getFullYear();
  const sameMonth = sameYear && startDateObject.getMonth() === endDateObject.getMonth();

  if (sameMonth) {
    const monthYear = new Intl.DateTimeFormat("de-DE", {
      month: "long",
      year: "numeric",
    }).format(endDateObject);
    return `${startDateObject.getDate()}.–${endDateObject.getDate()}. ${monthYear}`;
  }

  if (sameYear) {
    const startShort = new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
    }).format(startDateObject);
    const endShort = new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(endDateObject);
    return `${startShort} – ${endShort}`;
  }

  return `${formatter.format(startDateObject)} – ${formatter.format(endDateObject)}`;
}

async function fetchPublicJournalData(journalUrl) {
  const journalId = journalIdFromUrl(journalUrl);
  if (!journalId) return null;

  try {
    return await fetchJson(`${LAMBUS_API_BASE_URL}/v1.10/frontend/journal/${journalId}`, {
      "Lambus-Secret": LAMBUS_JOURNAL_HEADER,
    });
  } catch (error) {
    diagnostics.push(`Lambus-Journal-Daten konnten nicht geladen werden (${journalUrl}): ${error.message}`);
    return null;
  }
}

async function enrichTrip(trip) {
  try {
    const html = await fetchText(trip.url);
    const journalData = await fetchPublicJournalData(trip.url);
    const sourceTitle = readMeta(html, "og:title");
    const description = readMeta(html, "og:description");
    const image =
      absoluteUrl(readMeta(html, "og:image"), trip.url) ||
      firstImageFromTrip(journalData?.trip) ||
      trip.fallbackImage ||
      "";

    return {
      title: trip.title || sourceTitle || journalData?.trip?.name || "Reise",
      url: trip.url,
      note: trip.note || description || "",
      image,
      dateLabel: formatDateRange(journalData?.trip?.startDate, journalData?.trip?.endDate),
      videoUrl: trip.videoUrl || "",
      description,
      sourceTitle,
    };
  } catch (error) {
    diagnostics.push(`Lambus-Seite konnte nicht geladen werden (${trip.url}): ${error.message}`);
    const journalData = await fetchPublicJournalData(trip.url);
    return {
      title: trip.title || journalData?.trip?.name || "Reise",
      url: trip.url,
      note: trip.note || "",
      image: firstImageFromTrip(journalData?.trip) || trip.fallbackImage || "",
      dateLabel: formatDateRange(journalData?.trip?.startDate, journalData?.trip?.endDate),
      videoUrl: trip.videoUrl || "",
      description: "",
      sourceTitle: "",
    };
  }
}

async function main() {
  const trips = JSON.parse(await readFile(INPUT_FILE, "utf8"));
  const enrichedTrips = [];

  for (const trip of trips) {
    enrichedTrips.push(await enrichTrip(trip));
  }

  const data = {
    generatedAt: new Date().toISOString(),
    source: "Manual Lambus trip selection enriched with public OpenGraph metadata",
    trips: enrichedTrips,
    diagnostics,
  };

  await writeFile(OUT_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUT_FILE}`);
  if (diagnostics.length) {
    console.warn(diagnostics.join("\n"));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
