function roundMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
function calcDueAmount(grandTotal, paidAmount) {
  return roundMoney(Math.max(0, roundMoney(grandTotal) - roundMoney(paidAmount)));
}
function isBankMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "bank" || m === "cheque" || m === "card";
}
function cashBankSplit(payments) {
  let cash = 0;
  let bank = 0;
  for (const p of payments || []) {
    const method = String(p.method || "cash").toLowerCase();
    if (method === "credit") continue;
    const amt = roundMoney(p.amount);
    if (amt <= 0) continue;
    if (isBankMethod(method)) bank += amt;
    else cash += amt;
  }
  return { cash: roundMoney(cash), bank: roundMoney(bank) };
}

function summarize({ sales = [], purchases = [] }) {
  let cash = 0;
  let bank = 0;
  let customerDue = 0;
  let supplierDue = 0;
  const ids = [];
  for (const sale of sales) {
    const paid = roundMoney(sale.paidAmount);
    const due = calcDueAmount(sale.grandTotal, paid);
    const split = cashBankSplit(sale.payments);
    cash += split.cash;
    bank += split.bank;
    customerDue += due;
    ids.push(`sale:${sale._id}`);
  }
  for (const purchase of purchases) {
    const paid = roundMoney(purchase.paidAmount);
    const due = calcDueAmount(purchase.grandTotal, paid);
    const split = cashBankSplit(purchase.payments);
    cash -= split.cash;
    bank -= split.bank;
    supplierDue += due;
    ids.push(`purchase:${purchase._id}`);
  }
  return {
    cash: roundMoney(cash),
    bank: roundMoney(bank),
    customerDue: roundMoney(customerDue),
    supplierDue: roundMoney(supplierDue),
    ids: ids.sort().join("|"),
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let r = summarize({
  purchases: [{ _id: "p1", grandTotal: 100000, paidAmount: 100000, payments: [{ method: "cash", amount: 100000 }] }],
});
assert(r.supplierDue === 0 && r.cash === -100000, "TEST 1");

r = summarize({
  purchases: [{ _id: "p2", grandTotal: 100000, paidAmount: 40000, payments: [{ method: "cash", amount: 40000 }] }],
});
assert(r.supplierDue === 60000 && r.cash === -40000, "TEST 2");

r = summarize({
  sales: [{ _id: "s1", grandTotal: 150000, paidAmount: 150000, payments: [{ method: "bank", amount: 150000 }] }],
});
assert(r.customerDue === 0 && r.bank === 150000, "TEST 3");

r = summarize({
  sales: [{ _id: "s2", grandTotal: 150000, paidAmount: 50000, payments: [{ method: "cash", amount: 50000 }] }],
});
assert(r.customerDue === 100000 && r.cash === 50000, "TEST 4");

r = summarize({
  sales: [{
    _id: "s2",
    grandTotal: 150000,
    paidAmount: 80000,
    payments: [{ method: "cash", amount: 50000 }, { method: "cash", amount: 30000 }],
  }],
});
assert(r.customerDue === 70000 && r.cash === 80000, "TEST 5");

r = summarize({
  purchases: [{
    _id: "p2",
    grandTotal: 100000,
    paidAmount: 70000,
    payments: [{ method: "cash", amount: 40000 }, { method: "cash", amount: 30000 }],
  }],
});
assert(r.supplierDue === 30000 && r.cash === -70000, "TEST 6");

const a = summarize({
  purchases: [{ _id: "p2", grandTotal: 100000, paidAmount: 70000, payments: [{ method: "cash", amount: 70000 }] }],
});
const b = summarize({
  purchases: [{ _id: "p2", grandTotal: 100000, paidAmount: 70000, payments: [{ method: "cash", amount: 70000 }] }],
});
assert(a.ids === b.ids && a.cash === b.cash, "TEST 8");

console.log("accounts math tests passed");
