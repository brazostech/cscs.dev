// API rule tests for the rsvps collection, run against a local PocketBase
// started with this repo's migrations. See pocketbase-harness.mjs.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  startPocketBase,
  SUPERUSER_EMAIL,
  SUPERUSER_PASSWORD,
} from "./pocketbase-harness.mjs";

let pb;
let baseUrl;
let superToken;
let eventId;
let userA;
let userB;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
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

async function rsvpExists(user) {
  const filter = encodeURIComponent(`event="${eventId}" && user="${user.id}"`);
  const res = await api(
    "GET",
    `/api/collections/rsvps/records?filter=${filter}`,
    { token: superToken },
  );
  assert.equal(res.status, 200);
  return res.json.totalItems > 0;
}

async function createRsvpAs(actor, userId) {
  return api("POST", "/api/collections/rsvps/records", {
    token: actor?.token,
    body: { event: eventId, user: userId },
  });
}

before(async () => {
  pb = await startPocketBase();
  baseUrl = pb.baseUrl;
  assert.match(baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/);

  const su = await api(
    "POST",
    "/api/collections/_superusers/auth-with-password",
    {
      body: { identity: SUPERUSER_EMAIL, password: SUPERUSER_PASSWORD },
    },
  );
  assert.equal(su.status, 200, JSON.stringify(su.json));
  superToken = su.json.token;

  const event = await api("POST", "/api/collections/events/records", {
    token: superToken,
    body: {
      title: "Rule test event",
      description: "x",
      type: "meetup",
      date: "2026-12-01",
      time: "18:00",
    },
  });
  assert.equal(event.status, 200, JSON.stringify(event.json));
  eventId = event.json.id;

  userA = await createUser("user-a");
  userB = await createUser("user-b");
});

after(async () => {
  await pb?.stop();
});

describe("rsvps createRule", () => {
  test("a signed-in user can RSVP as themselves", async () => {
    const res = await createRsvpAs(userA, userA.id);
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.user, userA.id);
    assert.equal(await rsvpExists(userA), true);
  });

  test("a signed-in user cannot RSVP on behalf of another user", async () => {
    const res = await createRsvpAs(userA, userB.id);
    assert.ok([400, 403].includes(res.status), `status ${res.status}`);
    assert.equal(await rsvpExists(userB), false);
  });

  test("an anonymous request cannot create an RSVP", async () => {
    const res = await createRsvpAs(null, userB.id);
    assert.ok([400, 403].includes(res.status), `status ${res.status}`);
    assert.equal(await rsvpExists(userB), false);
  });
});

describe("rsvps updateRule and deleteRule", () => {
  let rsvpOfB;

  before(async () => {
    const res = await createRsvpAs(userB, userB.id);
    assert.equal(res.status, 200, JSON.stringify(res.json));
    rsvpOfB = res.json.id;
  });

  test("a user cannot move another user's RSVP to themselves", async () => {
    const res = await api(
      "PATCH",
      `/api/collections/rsvps/records/${rsvpOfB}`,
      {
        token: userA.token,
        body: { user: userA.id },
      },
    );
    assert.ok([400, 403, 404].includes(res.status), `status ${res.status}`);
    const record = await api(
      "GET",
      `/api/collections/rsvps/records/${rsvpOfB}`,
      {
        token: superToken,
      },
    );
    assert.equal(record.json.user, userB.id);
  });

  test("a user cannot update their own RSVP either (superuser only)", async () => {
    const res = await api(
      "PATCH",
      `/api/collections/rsvps/records/${rsvpOfB}`,
      {
        token: userB.token,
        body: { user: userB.id },
      },
    );
    assert.equal(res.status, 403);
  });

  test("a user cannot delete another user's RSVP", async () => {
    const res = await api(
      "DELETE",
      `/api/collections/rsvps/records/${rsvpOfB}`,
      { token: userA.token },
    );
    assert.ok([400, 403, 404].includes(res.status), `status ${res.status}`);
    assert.equal(await rsvpExists(userB), true);
  });

  test("a user can delete their own RSVP", async () => {
    const res = await api(
      "DELETE",
      `/api/collections/rsvps/records/${rsvpOfB}`,
      { token: userB.token },
    );
    assert.equal(res.status, 204);
    assert.equal(await rsvpExists(userB), false);
  });
});
