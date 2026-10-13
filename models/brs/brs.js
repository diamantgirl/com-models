import { TEMPLATES, CATEGORY_LABELS, indexById } from "./templates.js";
import { createSession, applyTemplate, derive } from "./brs-logic.js";
import { formatINR, formatSignedINR } from "../../shared/format.js";

const templatesById = indexById(TEMPLATES);
const MAX_BAR_PX = 300;
const SCALE_HEADROOM = 1.08;

const el = {
  setup: document.getElementById("setup"),
  setupForm: document.getElementById("setupForm"),
  openingInput: document.getElementById("openingInput"),
  setupError: document.getElementById("setupError"),
  restartBtn: document.getElementById("restartBtn"),
  barsStage: document.getElementById("barsStage"),
  barCash: document.getElementById("barCash"),
  barPass: document.getElementById("barPass"),
  cashValue: document.getElementById("cashValue"),
  passValue: document.getElementById("passValue"),
  difference: document.getElementById("difference"),
  differenceLabel: document.getElementById("differenceLabel"),
  statementBody: document.getElementById("statementBody"),
  callout: document.getElementById("callout"),
  palette: document.getElementById("palette"),
};

let session = null;
let lastExplanation = null;

/* ---------- palette ---------- */

function buildPalette() {
  el.palette.innerHTML = TEMPLATES.map(
    (t) => `
      <article class="tpl-card" data-id="${t.id}">
        <span class="tpl-tag">${CATEGORY_LABELS[t.category]}</span>
        <h3>${t.title}</h3>
        <p class="tpl-short">${t.short}</p>
        <div class="tpl-actions">
          <label class="field">
            <span>Amount</span>
            <input type="number" min="1" step="1" inputmode="numeric"
                   value="${t.defaultAmount}" aria-label="Amount for ${t.title}" />
          </label>
          <button class="btn primary small" type="button" data-apply>Apply</button>
        </div>
      </article>`
  ).join("");
}

/* ---------- rendering ---------- */

function barHeightPx(value, scaleMax) {
  if (scaleMax <= 0) return 0;
  return Math.max(4, (value / scaleMax) * MAX_BAR_PX);
}

function renderBars(d, flash) {
  const scaleMax =
    Math.max(session.opening, d.currentCash, d.currentPass, 1) * SCALE_HEADROOM;

  const cashPx = barHeightPx(d.currentCash, scaleMax);
  const passPx = barHeightPx(d.currentPass, scaleMax);

  el.barCash.style.height = cashPx + "px";
  el.barPass.style.height = passPx + "px";
  el.cashValue.textContent = formatINR(d.currentCash);
  el.passValue.textContent = formatINR(d.currentPass);

  // Difference bracket between the tops of the two bars.
  const stageRect = el.barsStage.getBoundingClientRect();
  const cashRect = el.barCash.getBoundingClientRect();
  const passRect = el.barPass.getBoundingClientRect();
  const cashCenter = cashRect.left - stageRect.left + cashRect.width / 2;
  const passCenter = passRect.left - stageRect.left + passRect.width / 2;
  const topPx = MAX_BAR_PX - Math.max(cashPx, passPx) + (stageRect.height - MAX_BAR_PX);

  el.difference.style.top = Math.max(0, topPx) + "px";
  el.difference.style.left = cashCenter + "px";
  el.difference.style.width = Math.max(0, passCenter - cashCenter) + "px";

  if (d.balanced) {
    el.differenceLabel.textContent = "No difference yet";
    el.differenceLabel.classList.remove("active");
  } else {
    const who = d.difference > 0 ? "Pass Book higher" : "Cash Book higher";
    el.differenceLabel.textContent = `${who} by ${formatINR(Math.abs(d.difference))}`;
    el.differenceLabel.classList.add("active");
  }

  // Flash the moving bar's delta.
  el.barCash.querySelector(".delta-badge")?.remove();
  el.barPass.querySelector(".delta-badge")?.remove();
  if (flash) {
    const bar = flash.book === "cash" ? el.barCash : el.barPass;
    const badge = document.createElement("span");
    badge.className = "delta-badge " + (flash.amount > 0 ? "add" : "less");
    badge.textContent = formatSignedINR(flash.amount);
    bar.appendChild(badge);
    setTimeout(() => badge.remove(), 1500);
  }
}

function renderStatement(d) {
  const rows = [];

  rows.push(
    `<tr class="row-open"><td>Balance as per Cash Book</td>
      <td class="num"></td><td class="num"></td>
      <td class="num strong">${formatINR(d.openingLine)}</td></tr>`
  );

  if (d.rows.length === 0) {
    rows.push(
      `<tr class="empty-row"><td colspan="4">No items applied yet — the two balances are equal.</td></tr>`
    );
  } else {
    for (const r of d.rows) {
      rows.push(
        `<tr><td>${r.label}</td>
          <td class="num add">${r.treatment === "add" ? formatINR(r.amount) : ""}</td>
          <td class="num less">${r.treatment === "less" ? formatINR(r.amount) : ""}</td>
          <td class="num">${formatINR(r.running)}</td></tr>`
      );
    }
  }

  rows.push(
    `<tr class="row-close"><td>Balance as per Pass Book</td>
      <td class="num"></td><td class="num"></td>
      <td class="num strong">${formatINR(d.closingLine)}</td></tr>`
  );

  el.statementBody.innerHTML = rows.join("");
}

function renderCallout() {
  if (!lastExplanation) {
    el.callout.classList.add("muted");
    el.callout.innerHTML =
      "<p>Enter an opening balance to start, then apply items. Each item moves one book, and the BRS explains the gap.</p>";
    return;
  }
  const { template, amount } = lastExplanation;
  el.callout.classList.remove("muted");
  const text = template.explanation.replaceAll("{amount}", formatINR(amount));
  el.callout.innerHTML = `
    <span class="callout-tag ${template.treatment}">
      ${template.book === "cash" ? "Cash Book first" : "Pass Book first"}
    </span>
    <p>${text}</p>`;
}

function render(flash) {
  const d = derive(session, templatesById);
  renderBars(d, flash);
  renderStatement(d);
  renderCallout();
}

/* ---------- actions ---------- */

function startSession(opening) {
  session = createSession(opening);
  lastExplanation = null;
  hideOverlay();
  render();
}

function applyFromCard(card) {
  const template = templatesById[card.dataset.id];
  const input = card.querySelector("input");
  const amount = Number(input.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    input.classList.add("invalid");
    input.focus();
    return;
  }
  input.classList.remove("invalid");

  session = applyTemplate(session, template, amount);
  lastExplanation = { template, amount };

  const delta = template.direction === "up" ? amount : -amount;
  render({ book: template.book, amount: delta });
}

function requestRestart() {
  if (session && session.applied.length > 0) {
    const ok = window.confirm(
      "Restart the session? All applied items will be cleared."
    );
    if (!ok) return;
  }
  el.openingInput.value = session ? session.opening : "";
  showOverlay();
}

/* ---------- overlay ---------- */

function showOverlay() {
  el.setup.hidden = false;
  el.setupError.hidden = true;
  el.openingInput.focus();
  el.openingInput.select();
}

function hideOverlay() {
  el.setup.hidden = true;
}

/* ---------- events ---------- */

el.palette.addEventListener("click", (event) => {
  const button = event.target.closest("[data-apply]");
  if (!button) return;
  applyFromCard(button.closest(".tpl-card"));
});

el.palette.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("input")) {
    event.preventDefault();
    applyFromCard(event.target.closest(".tpl-card"));
  }
});

el.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number(el.openingInput.value);
  if (!Number.isFinite(value) || value <= 0) {
    el.setupError.textContent = "Enter an opening balance greater than zero.";
    el.setupError.hidden = false;
    el.openingInput.focus();
    return;
  }
  startSession(value);
});

el.restartBtn.addEventListener("click", requestRestart);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.setup.hidden && session) {
    hideOverlay();
  }
});

/* ---------- init ---------- */

buildPalette();
showOverlay();
