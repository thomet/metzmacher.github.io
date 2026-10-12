import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(SCRIPT_FILE));
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
const existingBookCache = new Map();

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function canonicalBookId(item) {
  if (typeof item !== "string") return "";

  let normalized = stripQuery(item).replace(/^\/+|\/+$/g, "");
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the undecoded value; validation below will reject malformed IDs.
  }

  const id = normalized.split("/").at(-1) ?? "";
  return /^[A-Z0-9]{8,17}$/i.test(id) && id.toUpperCase() !== "ISBN" ? id : "";
}

function uniqueBookIds(items) {
  return unique(items.map(canonicalBookId));
}

function normalizeBookReference(item) {
  const id = canonicalBookId(item);
  if (!id) return "";

  let normalized = stripQuery(item).replace(/^\/+|\/+$/g, "");
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    return id;
  }

  const segments = normalized.split("/").filter(Boolean);
  const slug = segments.length > 1 ? segments.at(-2) : "";
  return slug && /^[\p{L}\p{N}-]+$/u.test(slug) ? `${slug}/${id}` : id;
}

function uniqueBookReferences(items) {
  const references = new Map();

  for (const item of items) {
    const reference = normalizeBookReference(item);
    const id = canonicalBookId(reference);
    if (id && !references.has(id)) references.set(id, reference);
  }

  return [...references.values()];
}

function normalizePath(path) {
  return path.replaceAll("\\/", "/").replace(/&amp;/g, "&");
}

function stripQuery(pathOrUrl) {
  return normalizePath(pathOrUrl).split("?")[0].split("#")[0];
}

async function fetchText(url, attempts = 3, extraHeaders = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "metzmacher.me static pages updater (+https://metzmacher.me)",
          ...extraHeaders,
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
  const flightLists = extractProfileFlightLists(html);
  if (Object.keys(flightLists).length) return flightLists;

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
    groups[marker] = uniqueBookReferences(groups[marker]);
  }

  return groups;
}

function extractProfileFlightLists(html) {
  const groups = {};
  const listRe = /\\?"(_(?:reading|read|stack))\\?"\s*:\s*\[((?:.|\n)*?)\](?=,\\?"_|,\\?"listConfigs|})/g;
  let listMatch;

  while ((listMatch = listRe.exec(html))) {
    const listName = listMatch[1];
    const items = listMatch[2];
    const ids = [];
    const isbnRe = /\\?"isbn\\?"\s*:\s*\\?"([^"\\]+)\\?"/g;
    let isbnMatch;

    while ((isbnMatch = isbnRe.exec(items))) {
      ids.push(isbnMatch[1]);
    }

    groups[listName] = uniqueBookIds(ids);
  }

  return groups;
}

function extractProfileUserId(html) {
  return (
    /(?:[?&]|\\u0026|&amp;)userId=([A-Za-z0-9]+)/.exec(html)?.[1] ??
    /\\?"userId\\?"\s*:\s*\\?"([A-Za-z0-9]+)\\?"/.exec(html)?.[1] ??
    ""
  );
}

function extractListBookIds(html) {
  const ids = [];
  const bookRe = /\["\$","\$L[^"]+","([^"]+)",\{"href":"\/(?:de\/)?book\//g;
  let bookMatch;

  while ((bookMatch = bookRe.exec(html))) {
    ids.push(bookMatch[1]);
  }

  const hrefRe = /\\?"href\\?"\s*:\s*\\?"\/(?:de\/)?book\/(?:[^"\\\/]+\/)*([^"\\\/?]+)(?:[?"\\])/g;
  while ((bookMatch = hrefRe.exec(html))) {
    ids.push(bookMatch[1]);
  }

  const isbnRe = /\\?"isbn\\?"\s*:\s*\\?"([^"\\]+)\\?"/g;
  while ((bookMatch = isbnRe.exec(html))) {
    ids.push(bookMatch[1]);
  }

  return uniqueBookIds(ids);
}

async function fetchListIds(listName, userId) {
  if (!userId) return [];

  const listPath = `/de/lists/${encodeURIComponent(listName)}`;
  const listUrl = `${BASE_URL}${listPath}?source=profile&userId=${encodeURIComponent(userId)}&_rsc=metzmacher`;
  const referer = `${BASE_URL}${listPath}?source=profile&userId=${encodeURIComponent(userId)}`;

  try {
    const html = await fetchText(listUrl, 3, {
      "accept": "*/*",
      "next-url": listPath,
      "referer": referer,
      "rsc": "1",
    });

    const ids = extractListBookIds(html);
    if (ids.length) return ids;

    diagnostics.push(`Liste ${listName} fuer ${userId} enthielt keine RSC-Buchdaten.`);
  } catch (error) {
    diagnostics.push(`Liste ${listName} fuer ${userId} konnte nicht geladen werden: ${error.message}`);
  }

  return [];
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

async function fetchBook(bookReference) {
  const reference = normalizeBookReference(bookReference);
  const canonicalId = canonicalBookId(reference);
  if (!canonicalId) {
    throw new Error(`Ungueltige READO-Buch-ID: ${bookReference}`);
  }

  if (bookCache.has(canonicalId)) return bookCache.get(canonicalId);

  const bookPath = reference.split("/").map(encodeURIComponent).join("/");
  const bookUrl = `${BASE_URL}/de/book/${bookPath}`;
  const fallback = {
    ...(existingBookCache.get(canonicalId) ?? {
      title: "Buch bei READO",
      author: "",
      cover: `https://cover-cdn.read-o.com/${encodeURIComponent(canonicalId)}?cache=default&expires=604800`,
    }),
    id: canonicalId,
    url: bookUrl,
  };

  try {
    const html = await fetchText(bookUrl);
    const book = findBookJsonLd(html);

    if (!book) {
      diagnostics.push(`Keine JSON-LD-Buchdaten fuer ${canonicalId} gefunden.`);
      bookCache.set(canonicalId, fallback);
      return fallback;
    }

    const enriched = {
      id: book.isbn || canonicalId,
      title: book.name || fallback.title,
      author: authorName(book.author),
      cover: book.image || fallback.cover,
      url: bookUrl,
    };

    bookCache.set(canonicalId, enriched);
    return enriched;
  } catch (error) {
    diagnostics.push(`Buch ${canonicalId} konnte nicht geladen werden: ${error.message}`);
    bookCache.set(canonicalId, fallback);
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
    const userId = extractProfileUserId(html);
    const currentIds = lists._reading ?? [];
    const readIds = lists._read?.length ? lists._read : await fetchListIds("_read", userId);
    const recentIds = readIds.slice(-MAX_RECENT_PER_PERSON).reverse();
    const fallbackTbrIds = profile.tbrLists.flatMap((listName) => lists[listName] ?? []);
    const tbrListIds = fallbackTbrIds.length
      ? fallbackTbrIds
      : (await Promise.all(profile.tbrLists.map((listName) => fetchListIds(listName, userId)))).flat();
    const tbrIds = (tbrListIds.length ? tbrListIds : fallbackTbrIds)
      .slice(-MAX_TBR_PER_PERSON)
      .reverse();

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

function sectionBookCount(data) {
  return Object.values(data?.sections ?? {}).reduce((count, books) => {
    return count + (Array.isArray(books) ? books.length : 0);
  }, 0);
}

function invalidBooks(data) {
  return Object.values(data?.sections ?? {})
    .flatMap((books) => (Array.isArray(books) ? books : []))
    .filter((book) => {
      return !book?.title || book.title === "Buch bei READO" || !book?.cover;
    });
}

function seedExistingBookCache(data) {
  for (const books of Object.values(data?.sections ?? {})) {
    if (!Array.isArray(books)) continue;

    for (const book of books) {
      const id = canonicalBookId(book?.id ?? book?.url ?? "");
      if (!id || !book?.title || book.title === "Buch bei READO" || !book?.cover) continue;
      existingBookCache.set(id, { ...book, id });
    }
  }
}

async function readExistingData() {
  try {
    return JSON.parse(await readFile(OUT_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    diagnostics.push(`Bestehende books.json konnte nicht gelesen werden: ${error.message}`);
    return null;
  }
}

async function main() {
  const existingData = await readExistingData();
  seedExistingBookCache(existingData);
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

  if (sectionBookCount(existingData) > 0 && sectionBookCount(data) === 0) {
    throw new Error(
      `Refusing to overwrite ${OUT_FILE}: fetched 0 books, existing file still has ${sectionBookCount(existingData)} books.`
    );
  }

  const invalid = invalidBooks(data);
  if (invalid.length) {
    throw new Error(
      `Refusing to overwrite ${OUT_FILE}: ${invalid.length} fetched books have no valid title or cover.`
    );
  }

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`Wrote ${OUT_FILE}`);
  if (diagnostics.length) {
    console.warn(diagnostics.join("\n"));
  }
}

if (process.argv[1] === SCRIPT_FILE) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  canonicalBookId,
  extractListBookIds,
  extractProfileLists,
  invalidBooks,
  normalizeBookReference,
};
