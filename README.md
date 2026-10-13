# Commerce Models

A static, dependency-free website with interactive models for commerce
students. Runs entirely in the browser and is hosted on GitHub Pages.

The first model is a **Bank Reconciliation Statement (BRS)** simulator.

## What the BRS model does

- Starts a session with an opening balance that you enter. Both the
  **Cash Book** and **Pass Book** bars begin at that same value.
- You pick reconciling-item **templates** (cheque issued but not presented,
  bank charges, interest allowed, and so on) and set an amount for each.
- Applying a template moves the bar of the book that records the item first,
  opens a gap between the two bars, shows an explanation, and adds the
  matching line to the BRS.
- The BRS uses a **+ / −** format (Add / Less), never Dr/Cr.
- The base in the header is *Balance as per Cash Book → Balance as per Pass
  Book*. The reverse base is shown but disabled for now.
- **Restart** any time to reset the session.

The maths always holds: `Balance as per Cash Book + (Add − Less) = Balance as
per Pass Book`.

## Running locally

No build step and no dependencies. Just serve the folder:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Running the tests

The BRS domain logic is pure JavaScript and covered by Node's built-in test
runner (no npm install needed):

```sh
node --test
```

## Project layout

```
com-models/
├─ index.html                  # model gallery
├─ assets/styles/              # base.css (shared) + brs.css (model)
├─ shared/format.js            # INR currency formatting
└─ models/brs/
   ├─ index.html               # BRS model page
   ├─ templates.js             # reconciling-item definitions
   ├─ brs-logic.js             # pure derive/reconcile functions
   ├─ brs.js                   # DOM controller
   └─ brs-logic.test.mjs       # unit tests
```

## Adding a template

Add an object to `models/brs/templates.js`:

```js
{
  id: "my-item",
  title: "Short label for the BRS row",
  short: "One-line description for the card.",
  category: "bank",              // cheque | bank | direct | error
  book: "pass",                  // which book records it first: cash | pass
  direction: "up",               // effect on that book's balance: up | down
  treatment: "add",              // add | less in the BRS (see rule below)
  defaultAmount: 1000,
  explanation: "Shown after applying. Use {amount} for the value."
}
```

`treatment` must match the book/direction: an item is **add** when it makes the
Pass Book higher than the Cash Book (Pass ↑ or Cash ↓), and **less** otherwise.
`node --test` verifies this for every template.

## Deployment

This is a plain static site, so GitHub Pages needs no workflow:

1. Push to the `main` branch.
2. Repo **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. The site is published at `https://<user>.github.io/com-models/`.

The `.nojekyll` file keeps GitHub Pages from processing the `models/` folder.
