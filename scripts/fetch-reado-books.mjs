import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_FILE = join(ROOT, "data", "books.json");
const BASE_URL = "https://reado.app";
const MAX_RECENT_PER_PERSON = 4;
const MAX_TBR_PER_PERSON = 4;

const PROFILES = [
  {
    key: "thomas",
    name: "Thomas",
    handle: "thomet",
    profileUrl: "https://reado.app/profile/thomet",
    fetchUrl: "https://reado.app/de/profile/thomet",
    tbrLists: ["_stack"],
  },
  {
    key: "kathrin",
    name: "Kathrin",
    handle: "kahathi",
    profileUrl: "https://reado.app/de/profile/kahathi",
    fetchUrl: "https://reado.app/de/profile/kahathi",
    tbrLists: ["_stack"],
  },
];

const diagnostics = [];
const bookCache = new Map();

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function normalizePath(path) {
  return path.replaceAll("\\/", "/").replace(/&amp;/g, "&");
}

function stripQuery(pathOrUrl) {
  return normalizePath(pathOrUrl).split("?")[0].split("#")[0];
}

async function fetchText(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
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
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(900 * attempt);
      }
    }
  }

  throw lastError;
}

function extractProfileLists(html) {
  const listMarkers = [];
  const listRe = /(?:href="|href\\":\\")((?:\\\/|\/)de(?:\\\/|\/)lists(?:\\\/|\/)(_[^?"\\]+)[^"\\]*)/g;
  let listMatch;

  while ((listMatch = listRe.exec(html))) {
    listMarkers.push(normalizePath(listMatch[2]));
  }

  const knownMarkers = unique(listMarkers);
  const groups = Object.fromEntries(knownMarkers.map((marker) => [marker, []]));
  let currentMarker = knownMarkers[0] ?? "_unknown";
  groups[currentMarker] ??= [];

  const itemRe = /(?:href="|href\\":\\")((?:\\\/|\/)de(?:\\\/|\/)(?:lists(?:\\\/|\/)(_[^?"\\]+)|book(?:\\\/|\/)([^"\\]+))[^"\\]*)/g;
  let itemMatch;

  while ((itemMatch = itemRe.exec(html))) {
    const marker = itemMatch[2] ? normalizePath(itemMatch[2]) : "";
    const bookId = itemMatch[3] ? stripQuery(itemMatch[3]) : "";

    if (marker) {
      currentMarker = marker;
      groups[currentMarker] ??= [];
      continue;
    }

    if (bookId) {
      groups[currentMarker] ??= [];
      groups[currentMarker].push(bookId);
    }
  }

  for (const marker of Object.keys(groups)) {
    groups[marker] = unique(groups[marker]);
  }

  return groups;
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

function findBookJsonLd(html) {
  const scripts = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g) ?? [];

  for (const script of scripts) {
    const raw = script
      .replace(/^<script[^>]*>/, "")
      .replace(/<\/script>$/, "")
      .trim();

    try {
      const parsed = JSON.parse(decodeHtmlEntities(raw));
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const book = entries.find((entry) => {
        const type = entry?.["@type"];
        return type === "Book" || (Array.isArray(type) && type.includes("Book"));
      });

      if (book) return book;
    } catch {
      // Some deployments may change escaping; ignore and keep the static fallback.
    }
  }

  return null;
}

function authorName(author) {
  if (Array.isArray(author)) {
    return author.map(authorName).filter(Boolean).join(", ");
  }

  if (typeof author === "string") return author;
  return author?.name ?? "";
}

async function fetchBook(bookId) {
  if (bookCache.has(bookId)) return bookCache.get(bookId);

  const bookUrl = `${BASE_URL}/de/book/${encodeURIComponent(bookId)}`;
  const fallback = {
    id: bookId,
    title: "Buch bei READO",
    author: "",
    cover: `https://cover-cdn.read-o.com/${encodeURIComponent(bookId)}?cache=default&expires=604800`,
    url: bookUrl,
  };

  try {
    const html = await fetchText(bookUrl);
    const book = findBookJsonLd(html);

    if (!book) {
      diagnostics.push(`Keine JSON-LD-Buchdaten fuer ${bookId} gefunden.`);
      bookCache.set(bookId, fallback);
      return fallback;
    }

    const enriched = {
      id: book.isbn || bookId,
      title: book.name || fallback.title,
      author: authorName(book.author),
      cover: book.image || fallback.cover,
      url: bookUrl,
    };

    bookCache.set(bookId, enriched);
    return enriched;
  } catch (error) {
    diagnostics.push(`Buch ${bookId} konnte nicht geladen werden: ${error.message}`);
    bookCache.set(bookId, fallback);
    return fallback;
  }
}

async function booksForIds(ids, owner) {
  const books = [];

  for (const id of unique(ids)) {
    const book = await fetchBook(id);
    books.push({
      ...book,
      ownerKey: owner.key,
      ownerName: owner.name,
      profileUrl: owner.profileUrl,
    });
  }

  return books;
}

async function fetchProfile(profile) {
  try {
    const html = await fetchText(profile.fetchUrl);
    const lists = extractProfileLists(html);
    const currentIds = lists._reading ?? [];
    const recentIds = (lists._read ?? []).slice(0, MAX_RECENT_PER_PERSON);
    const tbrIds = profile.tbrLists.flatMap((listName) => lists[listName] ?? []).slice(0, MAX_TBR_PER_PERSON);

    return {
      key: profile.key,
      name: profile.name,
      handle: profile.handle,
      profileUrl: profile.profileUrl,
      current: await booksForIds(currentIds.slice(0, 1), profile),
      recent: await booksForIds(recentIds, profile),
      tbr: await booksForIds(tbrIds, profile),
    };
  } catch (error) {
    diagnostics.push(`Profil ${profile.handle} konnte nicht geladen werden: ${error.message}`);
    return {
      key: profile.key,
      name: profile.name,
      handle: profile.handle,
      profileUrl: profile.profileUrl,
      current: [],
      recent: [],
      tbr: [],
    };
  }
}

function interleaveByProfile(profiles, listName) {
  const longestList = Math.max(...profiles.map((profile) => profile[listName].length));
  const books = [];

  for (let index = 0; index < longestList; index += 1) {
    for (const profile of profiles) {
      if (profile[listName][index]) {
        books.push(profile[listName][index]);
      }
    }
  }

  return books;
}

async function main() {
  const profiles = [];

  for (const profile of PROFILES) {
    profiles.push(await fetchProfile(profile));
  }

  const data = {
    generatedAt: new Date().toISOString(),
    source: "Public READO profile HTML and public book JSON-LD",
    profiles,
    sections: {
      current: interleaveByProfile(profiles, "current"),
      recent: interleaveByProfile(profiles, "recent"),
      tbr: interleaveByProfile(profiles, "tbr"),
    },
    diagnostics,
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
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
