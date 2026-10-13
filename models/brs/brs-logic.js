// Pure domain logic for the Bank Reconciliation Statement model.
// No DOM access here, so this module is easy to unit test.

export function createSession(opening) {
  const value = Number(opening);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Opening balance must be a non-negative number.");
  }
  return { opening: value, applied: [] };
}

export function applyTemplate(session, template, amount) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  const nextSeq =
    session.applied.reduce((max, entry) => Math.max(max, entry.seq), 0) + 1;
  return {
    ...session,
    applied: [
      ...session.applied,
      { templateId: template.id, amount: amt, seq: nextSeq },
    ],
  };
}

// An item is "add" in the BRS when it makes the Pass Book higher than the
// Cash Book, i.e. Pass Book goes up or Cash Book goes down.
export function expectedTreatment(template) {
  const movesPassAboveCash =
    (template.book === "cash" && template.direction === "down") ||
    (template.book === "pass" && template.direction === "up");
  return movesPassAboveCash ? "add" : "less";
}

export function isValidTreatment(template) {
  return expectedTreatment(template) === template.treatment;
}

export function derive(session, templatesById) {
  let currentCash = session.opening;
  let currentPass = session.opening;

  const effect = (entry) => {
    const template = templatesById[entry.templateId];
    const delta = template.direction === "up" ? entry.amount : -entry.amount;
    return { template, delta };
  };

  for (const entry of session.applied) {
    const { template, delta } = effect(entry);
    if (template.book === "cash") currentCash += delta;
    else currentPass += delta;
  }

  let running = currentCash;
  const rows = session.applied.map((entry) => {
    const { template } = effect(entry);
    running += template.treatment === "add" ? entry.amount : -entry.amount;
    return {
      seq: entry.seq,
      templateId: entry.templateId,
      label: template.title,
      treatment: template.treatment,
      amount: entry.amount,
      running,
    };
  });

  const difference = currentPass - currentCash;

  return {
    currentCash,
    currentPass,
    difference,
    openingLine: currentCash,
    closingLine: currentPass,
    netAdjustment: difference,
    balanced: difference === 0,
    rows,
  };
}
