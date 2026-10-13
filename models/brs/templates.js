// Reconciling-item templates for the Bank Reconciliation Statement model.
//
// Each template is a transaction that ONE book records first:
//   book:      "cash" -> the firm's Cash Book records it first
//              "pass" -> the bank's Pass Book records it first
//   direction: "up"   -> that book's balance goes up
//              "down" -> that book's balance goes down
//   treatment: how it appears in the BRS when starting from the Cash Book
//              "add"  -> Pass Book ends up higher than Cash Book
//              "less" -> Pass Book ends up lower than Cash Book
//
// Rule (verified by brs-logic.test.mjs):
//   add  when (book === "cash" && direction === "down")
//          or (book === "pass" && direction === "up")
//   less otherwise.

export const CATEGORY_LABELS = {
  cheque: "Cheques",
  bank: "Bank entries",
  direct: "Direct entries",
  error: "Bank errors",
};

export const TEMPLATES = [
  {
    id: "cheque-issued",
    title: "Cheque issued but not presented",
    short: "A cheque you issued hasn't reached the bank yet.",
    category: "cheque",
    book: "cash",
    direction: "down",
    treatment: "add",
    defaultAmount: 5000,
    explanation:
      "You issued a cheque for {amount}, but the payee hasn't presented it at the bank yet. Your Cash Book reduces the balance immediately, while the bank hasn't debited it. The Pass Book is therefore higher by {amount}, so it is added back in the BRS.",
  },
  {
    id: "cheque-deposited",
    title: "Cheque deposited but not collected",
    short: "A cheque you paid in hasn't been credited yet.",
    category: "cheque",
    book: "cash",
    direction: "up",
    treatment: "less",
    defaultAmount: 8000,
    explanation:
      "You deposited a cheque for {amount} and your Cash Book shows the increase at once. The bank hasn't collected and credited it yet, so the Pass Book is lower by {amount}, and it is deducted in the BRS.",
  },
  {
    id: "cheque-dishonoured",
    title: "Cheque deposited but dishonoured",
    short: "A deposited cheque bounced; the bank reversed it.",
    category: "cheque",
    book: "pass",
    direction: "down",
    treatment: "less",
    defaultAmount: 4000,
    explanation:
      "A cheque for {amount} that you deposited was dishonoured, and the bank has reversed the credit. You haven't updated your Cash Book yet. The Pass Book is lower by {amount}, so it is deducted in the BRS.",
  },
  {
    id: "bank-charges",
    title: "Bank charges debited by bank",
    short: "Charges or commission the bank took out.",
    category: "bank",
    book: "pass",
    direction: "down",
    treatment: "less",
    defaultAmount: 250,
    explanation:
      "The bank has debited {amount} as charges or commission, which you haven't recorded in your Cash Book yet. The Pass Book is lower by {amount}, so it is deducted in the BRS.",
  },
  {
    id: "interest-allowed",
    title: "Interest allowed by bank",
    short: "Interest the bank credited to your account.",
    category: "bank",
    book: "pass",
    direction: "up",
    treatment: "add",
    defaultAmount: 600,
    explanation:
      "The bank has credited {amount} as interest, which is not yet recorded in your Cash Book. The Pass Book is higher by {amount}, so it is added in the BRS.",
  },
  {
    id: "direct-deposit",
    title: "Direct deposit by a customer",
    short: "A customer paid straight into your bank account.",
    category: "direct",
    book: "pass",
    direction: "up",
    treatment: "add",
    defaultAmount: 12000,
    explanation:
      "A customer paid {amount} directly into your bank account. The bank has credited it, but it isn't in your Cash Book yet. The Pass Book is higher by {amount}, so it is added in the BRS.",
  },
  {
    id: "standing-instruction",
    title: "Direct payment by bank (standing instruction)",
    short: "The bank paid an EMI or premium on your behalf.",
    category: "direct",
    book: "pass",
    direction: "down",
    treatment: "less",
    defaultAmount: 3500,
    explanation:
      "As per your standing instruction, the bank paid {amount} (an insurance premium or loan instalment) directly. It isn't recorded in your Cash Book yet. The Pass Book is lower by {amount}, so it is deducted in the BRS.",
  },
  {
    id: "bank-error-debit",
    title: "Bank error: amount wrongly debited",
    short: "The bank debited your account by mistake.",
    category: "error",
    book: "pass",
    direction: "down",
    treatment: "less",
    defaultAmount: 1500,
    explanation:
      "The bank wrongly debited your account by {amount}. Your Cash Book doesn't show it. The Pass Book is lower by {amount}, so it is deducted in the BRS.",
  },
  {
    id: "bank-error-credit",
    title: "Bank error: amount wrongly credited",
    short: "The bank credited your account by mistake.",
    category: "error",
    book: "pass",
    direction: "up",
    treatment: "add",
    defaultAmount: 1500,
    explanation:
      "The bank wrongly credited your account by {amount}. Your Cash Book doesn't show it. The Pass Book is higher by {amount}, so it is added in the BRS.",
  },
];

export function indexById(templates = TEMPLATES) {
  return Object.fromEntries(templates.map((t) => [t.id, t]));
}
