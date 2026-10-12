import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalBookId,
  extractListBookIds,
  extractProfileLists,
  invalidBooks,
  normalizeBookReference,
} from "./fetch-reado-books.mjs";

test("canonicalBookId accepts old IDs and new slug/ID paths", () => {
  assert.equal(canonicalBookId("9789089987211"), "9789089987211");
  assert.equal(
    canonicalBookId("psychologie-in-30-sekunden-christian-jarrett/9789089987211"),
    "9789089987211"
  );
  assert.equal(canonicalBookId("slug%2F9789089987211?source=profile"), "9789089987211");
  assert.equal(canonicalBookId("ISBN"), "");
});

test("normalizeBookReference preserves a safe READO slug without encoding its slash", () => {
  assert.equal(
    normalizeBookReference("psychologie-in-30-sekunden/9789089987211"),
    "psychologie-in-30-sekunden/9789089987211"
  );
  assert.equal(normalizeBookReference("slug%2F9789089987211"), "slug/9789089987211");
});

test("profile fallback extraction canonicalizes changed READO links", () => {
  const html = [
    '<a href="/de/lists/_reading">reading</a>',
    '<a href="/de/book/psychologie-in-30-sekunden/9789089987211">book</a>',
    '<a href="/de/lists/_read">read</a>',
    '<a href="/de/book/ardeen-band-9/9783941436213">book</a>',
  ].join("");

  assert.deepEqual(extractProfileLists(html), {
    _reading: ["psychologie-in-30-sekunden/9789089987211"],
    _read: ["ardeen-band-9/9783941436213"],
  });
});

test("list extraction keeps the canonical final path segment", () => {
  const html = String.raw`{\"href\":\"/de/book/ardeen-band-9/9783941436213?source=list\"}`;
  assert.deepEqual(extractListBookIds(html), ["9783941436213"]);
});

test("invalidBooks rejects placeholder metadata", () => {
  const data = {
    sections: {
      current: [{ title: "Buch bei READO", cover: "https://example.test/cover" }],
      recent: [{ title: "A valid title", cover: "https://example.test/cover" }],
    },
  };

  assert.equal(invalidBooks(data).length, 1);
});
