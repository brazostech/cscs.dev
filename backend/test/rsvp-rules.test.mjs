// API rule tests for the rsvps collection, run against a local PocketBase
// started with this repo's migrations. See pocketbase-harness.mjs.
//
// Every test builds its own event and users, so a failing test cannot leave
// state behind that breaks the next one.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  startPocketBase,
  SUPERUSER_EMAIL,
  SUPERUSER_PASSWORD,
} from "./pocketbase-harness.mjs";

const REJECTED = [400, 403];

let pb;
let baseUrl;
let superToken;
let counter = 0;

async function api(method, path, { token, body, raw } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: token } : {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

async function createUser(name) {
  const email = `${name}@example.test`;
  const password = `${name}-test-password`;
  const created = await api("POST", "/api/collections/users/records", {
    body: { email, password, passwordConfirm: password, role: "user" },
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const auth = await api("POST", "/api/collections/users/auth-with-password", {
    body: { identity: email, password },
  });
  assert.equal(auth.status, 200, JSON.stringify(auth.json));
  return { id: created.json.id, token: auth.json.token };
}

/** A fresh event plus two fresh users, A and B. */
async function fresh() {
  const n = ++counter;
  const event = await api("POST", "/api/collections/events/records", {
    token: superToken,
    body: {
      title: `Rule test event ${n}`,
      description: "x",
      type: "meetup",
      date: "2026-12-01",
      time: "18:00",
    },
  });
  assert.equal(event.status, 200, JSON.stringify(event.json));
  const [a, b] = [await createUser(`a-${n}`), await createUser(`b-${n}`)];
  return { eventId: event.json.id, a, b };
}

async function rsvpExists(eventId, user) {
  const filter = encodeURIComponent(`event="${eventId}" && user="${user.id}"`);
  const res = await api(
    "GET",
    `/api/collections/rsvps/records?filter=${filter}`,
    { token: superToken },
  );
  assert.equal(res.status, 200);
  return res.json.totalItems > 0;
}

/** Creates an RSVP as a superuser, which bypasses the API rules (test setup). */
async function seedRsvp(eventId, user) {
  const res = await api("POST", "/api/collections/rsvps/records", {
    token: superToken,
    body: { event: eventId, user: user.id },
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return res.json.id;
}

function createRsvp(actor, body) {
  return api("POST", "/api/collections/rsvps/records", {
    token: actor?.token,
    body,
  });
}

/** Either rejected, or PocketBase stored the attacker's own id, never B's. */
async function assertNoImpersonation(res, { eventId, a, b }) {
  if (res.status === 200) {
    assert.equal(res.json.user, a.id, "stored user must be the caller");
  } else {
    assert.ok(REJECTED.includes(res.status), `status ${res.status}`);
  }
  assert.equal(await rsvpExists(eventId, b), false);
}

before(async () => {
  pb = await startPocketBase();
  baseUrl = pb.baseUrl;
  assert.match(baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/);

  const su = await api(
    "POST",
    "/api/collections/_superusers/auth-with-password",
    { body: { identity: SUPERUSER_EMAIL, password: SUPERUSER_PASSWORD } },
  );
  assert.equal(su.status, 200, JSON.stringify(su.json));
  superToken = su.json.token;
});

after(async () => {
  await pb?.stop();
});

describe("rsvps createRule", () => {
  test("a signed-in user can RSVP as themselves", async () => {
    const { eventId, a } = await fresh();
    const res = await createRsvp(a, { event: eventId, user: a.id });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.user, a.id);
    assert.equal(await rsvpExists(eventId, a), true);
  });

  test("a signed-in user cannot RSVP on behalf of another user", async () => {
    const ctx = await fresh();
    const res = await createRsvp(ctx.a, { event: ctx.eventId, user: ctx.b.id });
    assert.ok(REJECTED.includes(res.status), `status ${res.status}`);
    assert.equal(await rsvpExists(ctx.eventId, ctx.b), false);
  });

  test("an anonymous request cannot create an RSVP", async () => {
    const { eventId, b } = await fresh();
    const res = await createRsvp(null, { event: eventId, user: b.id });
    assert.ok(REJECTED.includes(res.status), `status ${res.status}`);
    assert.equal(await rsvpExists(eventId, b), false);
  });

  test("a request without user is rejected (required-field validation)", async () => {
    const { eventId, a } = await fresh();
    const res = await createRsvp(a, { event: eventId });
    assert.ok(REJECTED.includes(res.status), `status ${res.status}`);
  });

  for (const [label, value] of [
    ["an empty string", ""],
    ["null", null],
  ]) {
    test(`user as ${label} is rejected`, async () => {
      const { eventId, a } = await fresh();
      const res = await createRsvp(a, { event: eventId, user: value });
      assert.ok(REJECTED.includes(res.status), `status ${res.status}`);
    });
  }

  // PocketBase keeps one element of a multi-valued body field. Whichever it
  // keeps, the stored value must be the caller's, so test both orders.
  test("JSON arrays cannot smuggle in another user, in either order", async () => {
    for (const order of ["ab", "ba"]) {
      const ctx = await fresh();
      const user = order === "ab" ? [ctx.a.id, ctx.b.id] : [ctx.b.id, ctx.a.id];
      const res = await createRsvp(ctx.a, { event: ctx.eventId, user });
      await assertNoImpersonation(res, ctx);
    }
  });

  test("repeated multipart and urlencoded fields cannot smuggle in another user, in either order", async () => {
    for (const kind of ["multipart", "urlencoded"]) {
      for (const order of ["ab", "ba"]) {
        const ctx = await fresh();
        const ids =
          order === "ab" ? [ctx.a.id, ctx.b.id] : [ctx.b.id, ctx.a.id];
        const raw =
          kind === "multipart" ? new FormData() : new URLSearchParams();
        raw.append("event", ctx.eventId);
        for (const id of ids) raw.append("user", id);
        const res = await api("POST", "/api/collections/rsvps/records", {
          token: ctx.a.token,
          raw,
        });
        await assertNoImpersonation(res, ctx);
      }
    }
  });
});

describe("rsvps listRule and viewRule", () => {
  test("anonymous users cannot see RSVPs, signed-in users can", async () => {
    const { eventId, a, b } = await fresh();
    const rsvpId = await seedRsvp(eventId, b);

    const anonList = await api("GET", "/api/collections/rsvps/records");
    if (anonList.status === 200) assert.equal(anonList.json.items.length, 0);
    else assert.ok([400, 401, 403].includes(anonList.status));
    const anonView = await api(
      "GET",
      `/api/collections/rsvps/records/${rsvpId}`,
    );
    assert.ok(
      [401, 403, 404].includes(anonView.status),
      `status ${anonView.status}`,
    );

    const list = await api("GET", "/api/collections/rsvps/records", {
      token: a.token,
    });
    assert.equal(list.status, 200);
    assert.ok(list.json.items.some((r) => r.id === rsvpId));
    const view = await api("GET", `/api/collections/rsvps/records/${rsvpId}`, {
      token: a.token,
    });
    assert.equal(view.status, 200);
  });
});

describe("rsvps updateRule and deleteRule", () => {
  test("a user cannot move another user's RSVP to themselves", async () => {
    const { eventId, a, b } = await fresh();
    const rsvpId = await seedRsvp(eventId, b);
    const res = await api("PATCH", `/api/collections/rsvps/records/${rsvpId}`, {
      token: a.token,
      body: { user: a.id },
    });
    assert.ok([400, 403, 404].includes(res.status), `status ${res.status}`);
    const record = await api(
      "GET",
      `/api/collections/rsvps/records/${rsvpId}`,
      {
        token: superToken,
      },
    );
    assert.equal(record.json.user, b.id);
  });

  test("a user cannot update their own RSVP either (superuser only)", async () => {
    const { eventId, b } = await fresh();
    const rsvpId = await seedRsvp(eventId, b);
    const res = await api("PATCH", `/api/collections/rsvps/records/${rsvpId}`, {
      token: b.token,
      body: { user: b.id },
    });
    assert.equal(res.status, 403);
  });

  test("a user cannot delete another user's RSVP", async () => {
    const { eventId, a, b } = await fresh();
    const rsvpId = await seedRsvp(eventId, b);
    const res = await api(
      "DELETE",
      `/api/collections/rsvps/records/${rsvpId}`,
      {
        token: a.token,
      },
    );
    assert.ok([400, 403, 404].includes(res.status), `status ${res.status}`);
    assert.equal(await rsvpExists(eventId, b), true);
  });

  test("a user can delete their own RSVP", async () => {
    const { eventId, b } = await fresh();
    const rsvpId = await seedRsvp(eventId, b);
    const res = await api(
      "DELETE",
      `/api/collections/rsvps/records/${rsvpId}`,
      {
        token: b.token,
      },
    );
    assert.equal(res.status, 204);
    assert.equal(await rsvpExists(eventId, b), false);
  });
});
