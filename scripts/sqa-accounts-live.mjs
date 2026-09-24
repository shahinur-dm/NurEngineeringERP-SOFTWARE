import { readFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

const TAG = `SQA_ACCOUNTS_TMP_${Date.now()}`;
const bases = ["http://127.0.0.1:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];
const near = (a, b, eps = 0.05) => Math.abs(Number(a) - Number(b)) <= eps;
const n = (v) => Math.round(Number(v || 0) * 100) / 100;
const dueOf = (g, p) => n(Math.max(0, n(g) - n(p)));
const isBank = (m) => ["bank", "cheque", "card"].includes(String(m || "").toLowerCase());

function split(payments) {
  let cash = 0;
  let bank = 0;
  for (const p of payments || []) {
    const method = String(p.method || "cash").toLowerCase();
    if (method === "credit") continue;
    const amt = n(p.amount);
    if (amt <= 0) continue;
    if (isBank(method)) bank += amt;
    else cash += amt;
  }
  return { cash: n(cash), bank: n(bank) };
}

function paidFromDoc(paidAmount, payments) {
  if (n(paidAmount) > 0) return n(paidAmount);
  return n(
    (payments || []).reduce((a, p) => {
      if (String(p.method || "").toLowerCase() === "credit") return a;
      return a + n(p.amount);
    }, 0),
  );
}

function expectedFromSource({ sales, purchases, expenses, wallets }) {
  let cashFlow = 0;
  let bankFlow = 0;
  let customerDue = 0;
  let supplierDue = 0;
  let totalIncome = 0;
  let purchaseExpense = 0;
  let opex = 0;
  for (const w of wallets || []) {
    const opening = n(w.openingBalance);
    if (String(w.type || "cash").toLowerCase() === "bank") bankFlow += opening;
    else cashFlow += opening;
  }
  for (const sale of (sales || []).filter((s) => s.status === "final")) {
    const payments = sale.payments || [];
    const paid = paidFromDoc(sale.paidAmount, payments);
    const grand = n(sale.grandTotal);
    const splitPay = split(payments.length ? payments : paid ? [{ method: "cash", amount: paid }] : []);
    cashFlow += splitPay.cash;
    bankFlow += splitPay.bank;
    customerDue += dueOf(grand, paid);
    totalIncome += grand;
  }
  for (const purchase of (purchases || []).filter((p) => ["ordered", "received"].includes(p.status))) {
    const payments = purchase.payments || [];
    const paid = paidFromDoc(purchase.paidAmount, payments);
    const grand = n(purchase.grandTotal);
    const splitPay = split(
      payments.length ? payments : paid ? [{ method: String(purchase.paymentMethod || "cash"), amount: paid }] : [],
    );
    cashFlow -= splitPay.cash;
    bankFlow -= splitPay.bank;
    supplierDue += dueOf(grand, paid);
    purchaseExpense += grand;
  }
  for (const exp of expenses || []) {
    const amt = n(exp.amount);
    const splitPay = split([{ method: exp.paymentMethod || "cash", amount: amt }]);
    cashFlow -= splitPay.cash;
    bankFlow -= splitPay.bank;
    opex += amt;
  }
  return {
    cashBalance: n(cashFlow),
    bankBalance: n(bankFlow),
    customerDue: n(customerDue),
    supplierDue: n(supplierDue),
    totalIncome: n(totalIncome),
    totalExpense: n(purchaseExpense + opex),
    netBalance: n(totalIncome - (purchaseExpense + opex)),
  };
}

function mongoUri() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith("MONGODB_URI="));
  if (!line) throw new Error("no MONGODB_URI");
  return line.slice("MONGODB_URI=".length).trim().replace(/^"|"$/g, "");
}

async function login(base) {
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ditpharma.bd", password: "admin123" }),
    signal: AbortSignal.timeout(20000),
  });
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookie = cookies.map((c) => c.split(";")[0]).join("; ");
  return { ok: loginRes.ok, cookie, status: loginRes.status };
}

async function allPages(get, path) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const json = await get(`${path}${sep}page=${page}&limit=100`);
    const rows = json.data || [];
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
}

const created = { contacts: [], purchases: [], sales: [], shipments: 0 };
const pass = [];
const fail = [];

function check(name, expected, actual, extra = "") {
  const ok =
    expected && typeof expected === "object" && !Array.isArray(expected)
      ? Object.keys(expected).every((k) => near(expected[k], actual?.[k]))
      : near(expected, actual) || expected === actual;
  const row = { name, expected, actual, extra };
  if (ok) pass.push(row);
  else fail.push(row);
  return ok;
}

async function main() {
  let base = "";
  let headers = {};
  for (const b of bases) {
    try {
      const r = await login(b);
      if (r.ok && r.cookie) {
        base = b;
        headers = { Cookie: r.cookie, "Content-Type": "application/json" };
        break;
      }
    } catch {
      /* next */
    }
  }
  if (!base) throw new Error("app not reachable / login failed");

  const get = async (path) => {
    const r = await fetch(`${base}${path}`, { headers });
    return r.json();
  };
  const send = async (method, path, body) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const json = await r.json().catch(() => ({}));
    return { status: r.status, json };
  };

  const meta = await get("/api/meta");
  const locationId = meta.locations?.[0]?._id;
  if (!locationId) throw new Error("no location");

  const products = await get(`/api/products?limit=50&locationId=${locationId}`);
  const product = (products.data || [])[0];
  if (!product) throw new Error("no product");

  const cust = await send("POST", "/api/contacts", {
    type: "customer",
    name: `${TAG}_CUSTOMER`,
    mobile: `017${String(Date.now()).slice(-8)}`,
  });
  const sup = await send("POST", "/api/contacts", {
    type: "supplier",
    name: `${TAG}_SUPPLIER`,
    supplierName: `${TAG}_SUPPLIER`,
    mobile: `018${String(Date.now()).slice(-8)}`,
    supplierContact: `018${String(Date.now()).slice(-8)}`,
  });
  if (cust.status > 299 || !cust.json.data?._id) throw new Error(`customer create ${cust.status} ${JSON.stringify(cust.json)}`);
  if (sup.status > 299 || !sup.json.data?._id) throw new Error(`supplier create ${sup.status} ${JSON.stringify(sup.json)}`);
  created.contacts.push(cust.json.data._id, sup.json.data._id);
  const customerId = cust.json.data._id;
  const supplierId = sup.json.data._id;

  async function makePurchase({ paid, status = "received" }) {
    const r = await send("POST", "/api/purchases", {
      locationId,
      supplierId,
      supplierName: `${TAG}_SUPPLIER`,
      status,
      productName: `${TAG}_ITEM`,
      note: TAG,
      quantity: 1,
      buyingPrice: 100000,
      items: [{ productId: product._id, name: `${TAG}_ITEM`, sku: product.sku, qty: 1, unitCost: 100000 }],
      paidAmount: paid,
      payments: paid > 0 ? [{ method: "cash", amount: paid }] : [],
      paymentMethod: "cash",
    });
    if (r.status > 299 || !r.json.data?._id) throw new Error(`purchase ${r.status} ${JSON.stringify(r.json)}`);
    created.purchases.push(r.json.data._id);
    return r.json.data;
  }

  async function makeSale({ paid, status = "final", price = 150000 }) {
    const r = await send("POST", "/api/sales", {
      locationId,
      customerId,
      customerName: `${TAG}_CUSTOMER`,
      status,
      note: TAG,
      items: [
        {
          productId: product._id,
          name: `${TAG}_SALE`,
          sku: product.sku,
          qty: 1,
          unitPrice: price,
        },
      ],
      payments: paid > 0 ? [{ method: "cash", amount: paid }] : [],
    });
    if (r.status > 299 || !r.json.data?._id) throw new Error(`sale ${r.status} ${JSON.stringify(r.json)}`);
    created.sales.push(r.json.data._id);
    return r.json.data;
  }

  const purFull = await makePurchase({ paid: 100000 });
  const purPart = await makePurchase({ paid: 40000 });
  const saleFull = await makeSale({ paid: 150000 });
  const salePart = await makeSale({ paid: 50000 });
  const saleDraft = await makeSale({ paid: 0, status: "draft", price: 111 });
  const saleQuote = await makeSale({ paid: 0, status: "quotation", price: 222 });
  const purRet = await makePurchase({ paid: 0, status: "draft" });
  await send("PUT", `/api/purchases/${purRet._id}`, { status: "returned", note: TAG });

  const txFind = async (idPrefix, mongoId) => {
    const docs = await get("/api/accounts/transactions?kind=documents");
    return (docs.data || []).find((t) => t.id === `${idPrefix}:${mongoId}`);
  };

  const row1 = await txFind("purchase", purFull._id);
  check("1 Full-paid Purchase due", 0, row1?.due, `ref=${row1?.reference}`);
  check("1 Full-paid Purchase cash outflow", -100000, row1?.cashImpact);

  const row2 = await txFind("purchase", purPart._id);
  check("2 Partial-paid Purchase due", 60000, row2?.due);
  check("2 Partial-paid Purchase cash outflow", -40000, row2?.cashImpact);

  const row3 = await txFind("sale", saleFull._id);
  check("3 Full-paid Sale due", 0, row3?.due);
  check("3 Full-paid Sale cash inflow", 150000, row3?.cashImpact);

  const row4 = await txFind("sale", salePart._id);
  check("4 Partial-paid Sale due", 100000, row4?.due);
  check("4 Partial-paid Sale cash inflow", 50000, row4?.cashImpact);

  const sumBeforePay = await get("/api/accounts/summary");
  const custDueBefore = n(sumBeforePay.data?.customerDue);
  const cashBefore = n(sumBeforePay.data?.cashBalance);
  const supDueBefore = n(sumBeforePay.data?.supplierDue);

  const payCust = await send("POST", "/api/accounts/payments", {
    kind: "customer",
    contactId: customerId,
    documentId: salePart._id,
    amount: 30000,
    method: "cash",
    note: TAG,
  });
  check("5 Customer payment API", 200, payCust.status >= 200 && payCust.status < 300 ? 200 : payCust.status, JSON.stringify(payCust.json));

  const sumAfterCust = await get("/api/accounts/summary");
  check("5 Customer Due decreases by 30000", n(custDueBefore - 30000), n(sumAfterCust.data?.customerDue));
  check("5 Cash increases by 30000", n(cashBefore + 30000), n(sumAfterCust.data?.cashBalance));

  const paySup = await send("POST", "/api/accounts/payments", {
    kind: "supplier",
    contactId: supplierId,
    documentId: purPart._id,
    amount: 30000,
    method: "cash",
    note: TAG,
  });
  check("6 Supplier payment API", 200, paySup.status >= 200 && paySup.status < 300 ? 200 : paySup.status, JSON.stringify(paySup.json));

  const sumAfterSup = await get("/api/accounts/summary");
  check("6 Supplier Due decreases by 30000", n(supDueBefore - 30000), n(sumAfterSup.data?.supplierDue));
  check("6 Cash decreases by 30000", n(n(sumAfterCust.data?.cashBalance) - 30000), n(sumAfterSup.data?.cashBalance));

  const t1 = await get("/api/accounts/transactions?kind=documents");
  const t2 = await get("/api/accounts/transactions?kind=documents");
  const ids1 = (t1.data || []).map((x) => x.id).sort().join("|");
  const ids2 = (t2.data || []).map((x) => x.id).sort().join("|");
  check("7 Reload duplicate posting", ids1, ids2);

  const allIds = t1.data || [];
  const saleIds = allIds.filter((x) => x.type === "sale").map((x) => x.id);
  const purIds = allIds.filter((x) => x.type === "purchase").map((x) => x.id);
  check("9 sale:id uniqueness", saleIds.length, new Set(saleIds).size);
  check("9 purchase:id uniqueness", purIds.length, new Set(purIds).size);
  check("9 sale:id format", true, saleIds.every((id) => id.startsWith("sale:")));
  check("9 purchase:id format", true, purIds.every((id) => id.startsWith("purchase:")));

  const hasDraft = allIds.some((x) => x.id.includes(String(saleDraft._id)));
  const hasQuote = allIds.some((x) => x.id.includes(String(saleQuote._id)));
  const hasRet = allIds.some((x) => x.id.includes(String(purRet._id)));
  check("8 Draft excluded", false, hasDraft);
  check("8 Quotation excluded", false, hasQuote);
  check("8 Returned purchase excluded", false, hasRet);

  const [allSales, allPurchases, expenses] = await Promise.all([
    allPages(get, "/api/sales"),
    allPages(get, "/api/purchases"),
    get("/api/expenses").then((j) => j.data || []),
  ]);
  const wallets = meta.accounts || [];
  const indep = expectedFromSource({ sales: allSales, purchases: allPurchases, expenses, wallets });
  const dash = (await get("/api/accounts/summary")).data;
  check("10 Customer Due vs Sales outstanding", indep.customerDue, dash.customerDue);
  check("11 Supplier Due vs Purchase outstanding", indep.supplierDue, dash.supplierDue);
  check("12 Cash vs actual received/paid", indep.cashBalance, dash.cashBalance);
  check("12 Bank vs actual received/paid", indep.bankBalance, dash.bankBalance);
  check("13 Dashboard vs independent source", indep, {
    cashBalance: n(dash.cashBalance),
    bankBalance: n(dash.bankBalance),
    customerDue: n(dash.customerDue),
    supplierDue: n(dash.supplierDue),
    totalIncome: n(dash.totalIncome),
    totalExpense: n(dash.totalExpense),
    netBalance: n(dash.netBalance),
  });

  const reportRows = t2.data || [];
  const salePartRow = reportRows.find((x) => x.id === `sale:${salePart._id}`);
  check("14 Report partial sale paid/received", 80000, salePartRow?.paidReceived);
  check("14 Report partial sale due", 70000, salePartRow?.due);
  const purPartRow = reportRows.find((x) => x.id === `purchase:${purPart._id}`);
  check("14 Report partial purchase paid", 70000, purPartRow?.paidReceived);
  check("14 Report partial purchase due", 30000, purPartRow?.due);

  const crm = await get("/api/crm/summary");
  check("16 CRM summary reachable", true, Array.isArray(crm.data?.leads) || typeof crm.leads === "object" || typeof crm.data === "object", JSON.stringify(Object.keys(crm)).slice(0, 200));

  const leftover = { created: { ...created }, deleted: { contacts: 0, purchases: 0, sales: 0, shipments: 0 }, leftoverCount: 0 };
  try {
    const uri = mongoUri();
    const client = new MongoClient(uri);
    await client.connect();
    const dbName = new URL(uri.replace("mongodb+srv://", "https://")).pathname.replace("/", "") || "NurEngErp";
    const db = client.db(dbName.replace(/\?.*/, "") || "NurEngErp");
    leftover.deleted.shipments = (await db.collection("shipments").deleteMany({ saleId: { $in: created.sales.map((id) => new ObjectId(id)) } })).deletedCount;
    leftover.deleted.sales = (await db.collection("sales").deleteMany({ _id: { $in: created.sales.map((id) => new ObjectId(id)) } })).deletedCount;
    leftover.deleted.purchases = (await db.collection("purchases").deleteMany({ _id: { $in: created.purchases.map((id) => new ObjectId(id)) } })).deletedCount;
    leftover.deleted.contacts = (await db.collection("contacts").deleteMany({ _id: { $in: created.contacts.map((id) => new ObjectId(id)) } })).deletedCount;
    leftover.leftoverCount =
      (await db.collection("sales").countDocuments({ note: TAG })) +
      (await db.collection("purchases").countDocuments({ note: TAG })) +
      (await db.collection("contacts").countDocuments({ name: new RegExp(TAG) }));
    await client.close();
  } catch (e) {
    leftover.cleanupError = String(e.message || e);
    for (const id of created.sales) await send("DELETE", `/api/sales/${id}`);
    for (const id of created.purchases) await send("DELETE", `/api/purchases/${id}`);
    for (const id of created.contacts) await send("DELETE", `/api/contacts/${id}`);
  }

  console.log(JSON.stringify({ base, tag: TAG, pass, fail, leftover }, null, 2));
  if (fail.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
