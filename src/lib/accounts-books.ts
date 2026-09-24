import { Account, Contact, Expense, Purchase, Sale } from "@/models";
import { calcDueAmount, roundMoney } from "@/lib/sale-finance";

export const SALE_POSTED_STATUS = "final";
export const PURCHASE_POSTED_STATUSES = ["ordered", "received"] as const;

export type AccountsTxType =
  | "sale"
  | "purchase"
  | "customer_payment"
  | "supplier_payment"
  | "expense";

export type AccountsTransaction = {
  id: string;
  date: string;
  reference: string;
  type: AccountsTxType;
  party: string;
  partyId?: string;
  partyType?: "customer" | "supplier";
  description: string;
  amount: number;
  paidReceived: number;
  due: number;
  cashImpact: number;
  bankImpact: number;
};

export type AccountsSummary = {
  cashBalance: number;
  bankBalance: number;
  customerDue: number;
  supplierDue: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  accounts: {
    key: string;
    name: string;
    nameBn: string;
    balance: number;
  }[];
};

type PayLine = { method?: string; amount?: number; paidAt?: Date; note?: string; reference?: string };

function n(v: unknown) {
  return roundMoney(Number(v || 0));
}

export function isBankMethod(method: string) {
  const m = String(method || "").toLowerCase();
  return m === "bank" || m === "cheque" || m === "card";
}

export function cashBankSplit(payments: PayLine[]) {
  let cash = 0;
  let bank = 0;
  for (const p of payments || []) {
    const method = String(p.method || "cash").toLowerCase();
    if (method === "credit") continue;
    const amt = n(p.amount);
    if (amt <= 0) continue;
    if (isBankMethod(method)) bank += amt;
    else cash += amt;
  }
  return { cash: roundMoney(cash), bank: roundMoney(bank) };
}

function paidFromDoc(paidAmount: number, payments: PayLine[]) {
  if (n(paidAmount) > 0) return n(paidAmount);
  return roundMoney((payments || []).reduce((a, p) => {
    if (String(p.method || "").toLowerCase() === "credit") return a;
    return a + n(p.amount);
  }, 0));
}

export function buildAccountsBooks(input: {
  sales: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  wallets: Record<string, unknown>[];
  contacts?: Record<string, unknown>[];
}) {
  const sales = input.sales;
  const purchases = input.purchases;
  const expenses = input.expenses;
  const wallets = input.wallets;
  const contacts = input.contacts || [];

  const contactByName = new Map<string, { id: string; type: "customer" | "supplier" | "both" }>();
  for (const c of contacts) {
    const id = String(c._id);
    const type = (c.type as "customer" | "supplier" | "both") || "customer";
    if (c.name) contactByName.set(String(c.name).trim().toLowerCase(), { id, type });
    if (c.nameBn) contactByName.set(String(c.nameBn).trim().toLowerCase(), { id, type });
    if (c.supplierName) contactByName.set(String(c.supplierName).trim().toLowerCase(), { id, type });
  }

  let cashFlow = 0;
  let bankFlow = 0;
  let customerDue = 0;
  let supplierDue = 0;
  let totalIncome = 0;
  let purchaseExpense = 0;
  let opex = 0;
  const transactions: AccountsTransaction[] = [];

  for (const w of wallets) {
    const opening = n(w.openingBalance);
    const type = String(w.type || "cash").toLowerCase();
    if (type === "bank") bankFlow += opening;
    else cashFlow += opening;
  }

  for (const sale of sales) {
    const payments = (sale.payments || []) as PayLine[];
    const grand = n(sale.grandTotal);
    const paid = paidFromDoc(Number(sale.paidAmount || 0), payments);
    const due = calcDueAmount(grand, paid);
    const split = cashBankSplit(payments.length ? payments : paid ? [{ method: "cash", amount: paid }] : []);
    cashFlow += split.cash;
    bankFlow += split.bank;
    customerDue += due;
    totalIncome += grand;

    const customerId = sale.customerId
      ? String(sale.customerId)
      : sale.customerName
        ? contactByName.get(String(sale.customerName).trim().toLowerCase())?.id
        : undefined;

    transactions.push({
      id: `sale:${String(sale._id)}`,
      date: new Date(String(sale.saleDate || sale.createdAt || Date.now())).toISOString(),
      reference: String(sale.invoiceNo || sale.salesOrderNo || sale.referenceNo || sale._id),
      type: "sale",
      party: String(sale.customerName || "Walk-in"),
      partyId: customerId,
      partyType: "customer",
      description: "Sale",
      amount: grand,
      paidReceived: paid,
      due,
      cashImpact: split.cash,
      bankImpact: split.bank,
    });
    for (const p of payments) {
      const amt = n(p.amount);
      if (amt <= 0 || String(p.method || "").toLowerCase() === "credit") continue;
      const one = cashBankSplit([p]);
      transactions.push({
        id: `sale-pay:${String(sale._id)}:${String(p.paidAt || "")}:${amt}:${p.method || ""}`,
        date: new Date(String(p.paidAt || sale.saleDate || Date.now())).toISOString(),
        reference: String(p.reference || sale.invoiceNo || sale.referenceNo || ""),
        type: "customer_payment",
        party: String(sale.customerName || "Walk-in"),
        partyId: customerId,
        partyType: "customer",
        description: p.note || "Customer payment",
        amount: amt,
        paidReceived: amt,
        due: 0,
        cashImpact: one.cash,
        bankImpact: one.bank,
      });
    }
  }

  for (const purchase of purchases) {
    const payments = (purchase.payments || []) as PayLine[];
    const grand = n(purchase.grandTotal);
    const paid = paidFromDoc(Number(purchase.paidAmount || 0), payments);
    const due = calcDueAmount(grand, paid);
    const split = cashBankSplit(
      payments.length ? payments : paid ? [{ method: String(purchase.paymentMethod || "cash"), amount: paid }] : [],
    );
    cashFlow -= split.cash;
    bankFlow -= split.bank;
    supplierDue += due;
    purchaseExpense += grand;

    const supplierId = purchase.supplierId
      ? String(purchase.supplierId)
      : purchase.supplierName
        ? contactByName.get(String(purchase.supplierName).trim().toLowerCase())?.id
        : undefined;

    transactions.push({
      id: `purchase:${String(purchase._id)}`,
      date: new Date(String(purchase.purchaseDate || purchase.createdAt || Date.now())).toISOString(),
      reference: String(purchase.referenceNo || purchase._id),
      type: "purchase",
      party: String(purchase.supplierName || "Supplier"),
      partyId: supplierId,
      partyType: "supplier",
      description: "Purchase",
      amount: grand,
      paidReceived: paid,
      due,
      cashImpact: -split.cash,
      bankImpact: -split.bank,
    });
    for (const p of payments) {
      const amt = n(p.amount);
      if (amt <= 0 || String(p.method || "").toLowerCase() === "credit") continue;
      const one = cashBankSplit([p]);
      transactions.push({
        id: `pur-pay:${String(purchase._id)}:${String(p.paidAt || "")}:${amt}:${p.method || ""}`,
        date: new Date(String(p.paidAt || purchase.purchaseDate || Date.now())).toISOString(),
        reference: String(p.reference || purchase.referenceNo || ""),
        type: "supplier_payment",
        party: String(purchase.supplierName || "Supplier"),
        partyId: supplierId,
        partyType: "supplier",
        description: p.note || "Supplier payment",
        amount: amt,
        paidReceived: amt,
        due: 0,
        cashImpact: -one.cash,
        bankImpact: -one.bank,
      });
    }
  }

  for (const exp of expenses) {
    const amt = n(exp.amount);
    const method = String(exp.paymentMethod || "cash");
    const split = cashBankSplit([{ method, amount: amt }]);
    cashFlow -= split.cash;
    bankFlow -= split.bank;
    opex += amt;
    transactions.push({
      id: `expense:${String(exp._id)}`,
      date: new Date(String(exp.expenseDate || exp.createdAt || Date.now())).toISOString(),
      reference: String(exp.title || exp._id),
      type: "expense",
      party: String(exp.category || ""),
      description: String(exp.title || "Expense"),
      amount: amt,
      paidReceived: amt,
      due: 0,
      cashImpact: -split.cash,
      bankImpact: -split.bank,
    });
  }

  cashFlow = roundMoney(cashFlow);
  bankFlow = roundMoney(bankFlow);
  customerDue = roundMoney(customerDue);
  supplierDue = roundMoney(supplierDue);
  totalIncome = roundMoney(totalIncome);
  const totalExpense = roundMoney(purchaseExpense + opex);
  const netBalance = roundMoney(totalIncome - totalExpense);

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const summary: AccountsSummary = {
    cashBalance: cashFlow,
    bankBalance: bankFlow,
    customerDue,
    supplierDue,
    totalIncome,
    totalExpense,
    netBalance,
    accounts: [
      { key: "cash", name: "Cash", nameBn: "নগদ", balance: cashFlow },
      { key: "bank", name: "Bank", nameBn: "ব্যাংক", balance: bankFlow },
      { key: "receivable", name: "Customer Receivable", nameBn: "গ্রাহক পাওনা", balance: customerDue },
      { key: "payable", name: "Supplier Payable", nameBn: "সরবরাহকারী দেনা", balance: supplierDue },
      { key: "income", name: "Income", nameBn: "আয়", balance: totalIncome },
      { key: "expense", name: "Expense", nameBn: "ব্যয়", balance: totalExpense },
    ],
  };

  return { summary, transactions };
}

export async function loadAccountsBooks() {
  const [sales, purchases, expenses, wallets, contacts] = await Promise.all([
    Sale.find({ status: SALE_POSTED_STATUS }).lean(),
    Purchase.find({ status: { $in: [...PURCHASE_POSTED_STATUSES] } }).lean(),
    Expense.find({}).lean(),
    Account.find({ isActive: { $ne: false } }).lean(),
    Contact.find({ isActive: { $ne: false } }).select("_id name nameBn supplierName type").lean(),
  ]);
  return buildAccountsBooks({
    sales: sales as Record<string, unknown>[],
    purchases: purchases as Record<string, unknown>[],
    expenses: expenses as Record<string, unknown>[],
    wallets: wallets as Record<string, unknown>[],
    contacts: contacts as Record<string, unknown>[],
  });
}
