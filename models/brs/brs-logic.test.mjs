import test from "node:test";
import assert from "node:assert/strict";

import { TEMPLATES, indexById } from "./templates.js";
import {
  createSession,
  applyTemplate,
  derive,
  expectedTreatment,
  isValidTreatment,
} from "./brs-logic.js";

const byId = indexById(TEMPLATES);

test("every template has a treatment consistent with its book and direction", () => {
  for (const template of TEMPLATES) {
    assert.equal(
      isValidTreatment(template),
      true,
      `${template.id} has treatment "${template.treatment}" but should be "${expectedTreatment(
        template
      )}"`
    );
  }
});

test("template ids are unique", () => {
  const ids = TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("createSession rejects invalid opening balances", () => {
  assert.throws(() => createSession(-1));
  assert.throws(() => createSession("abc"));
  assert.deepEqual(createSession(50000), { opening: 50000, applied: [] });
});

test("applyTemplate rejects non-positive amounts", () => {
  const session = createSession(50000);
  assert.throws(() => applyTemplate(session, TEMPLATES[0], 0));
  assert.throws(() => applyTemplate(session, TEMPLATES[0], -100));
  assert.throws(() => applyTemplate(session, TEMPLATES[0], "x"));
});

test("applyTemplate increments the sequence number", () => {
  let session = createSession(1000);
  session = applyTemplate(session, byId["cheque-issued"], 100);
  session = applyTemplate(session, byId["bank-charges"], 200);
  assert.deepEqual(
    session.applied.map((e) => e.seq),
    [1, 2]
  );
});

test("a fresh session has no difference and balances", () => {
  const d = derive(createSession(50000), byId);
  assert.equal(d.currentCash, 50000);
  assert.equal(d.currentPass, 50000);
  assert.equal(d.difference, 0);
  assert.equal(d.balanced, true);
  assert.equal(d.openingLine, d.closingLine);
  assert.equal(d.rows.length, 0);
});

test("a cash-book-first item moves only the Cash Book", () => {
  let session = createSession(50000);
  session = applyTemplate(session, byId["cheque-issued"], 5000);
  const d = derive(session, byId);
  assert.equal(d.currentCash, 45000);
  assert.equal(d.currentPass, 50000);
  assert.equal(d.difference, 5000);
});

test("a pass-book-first item moves only the Pass Book", () => {
  let session = createSession(50000);
  session = applyTemplate(session, byId["bank-charges"], 500);
  const d = derive(session, byId);
  assert.equal(d.currentCash, 50000);
  assert.equal(d.currentPass, 49500);
  assert.equal(d.difference, -500);
});

test("worked example reconciles Cash Book to Pass Book", () => {
  let session = createSession(50000);
  session = applyTemplate(session, byId["cheque-issued"], 5000);
  session = applyTemplate(session, byId["bank-charges"], 500);
  session = applyTemplate(session, byId["interest-allowed"], 1000);

  const d = derive(session, byId);

  assert.equal(d.currentCash, 45000);
  assert.equal(d.currentPass, 50500);
  assert.equal(d.difference, 5500);

  // Statement must run from Cash Book to exactly the Pass Book figure.
  assert.equal(d.openingLine, 45000);
  assert.equal(d.closingLine, 50500);
  assert.equal(d.rows.at(-1).running, d.currentPass);

  const net = d.rows.reduce(
    (sum, r) => sum + (r.treatment === "add" ? r.amount : -r.amount),
    0
  );
  assert.equal(d.currentCash + net, d.currentPass);
});

test("the reconciliation invariant holds for every template", () => {
  for (const template of TEMPLATES) {
    const session = applyTemplate(createSession(10000), template, 777);
    const d = derive(session, byId);
    const net = d.rows.reduce(
      (sum, r) => sum + (r.treatment === "add" ? r.amount : -r.amount),
      0
    );
    assert.equal(
      d.currentCash + net,
      d.currentPass,
      `invariant failed for ${template.id}`
    );
    assert.equal(d.rows.at(-1).running, d.currentPass);
  }
});

test("the invariant holds across a large mixed sequence", () => {
  const amounts = [1, 250, 3300, 99999, 42];
  let session = createSession(123456);
  let i = 0;
  for (const template of TEMPLATES) {
    session = applyTemplate(session, template, amounts[i % amounts.length]);
    i++;
  }
  const d = derive(session, byId);
  const net = d.rows.reduce(
    (sum, r) => sum + (r.treatment === "add" ? r.amount : -r.amount),
    0
  );
  assert.equal(d.currentCash + net, d.currentPass);
});
