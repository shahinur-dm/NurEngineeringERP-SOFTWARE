import { NextRequest, NextResponse } from "next/server";
import { connectDB, pruneOrphanCollections, pruneEmptyCollectionsClusterWide } from "@/lib/db";
import { readSession, hashPassword } from "@/lib/auth";
import {
  ACCOUNTS,
  BRANDS,
  CATALOG_SUPPLIERS,
  CATEGORIES,
  CATEGORY_ALT_SUPPLIER,
  CUSTOMER_GROUPS,
  DEMO_ADMIN,
  EXPENSE_CATEGORIES,
  EXTRA_SUPPLIERS,
  LEDGER_ACCOUNTS,
  LOCATIONS,
  PRODUCTS,
  ROLES,
  UNITS,
  daysAgo,
  offerPrices,
} from "@/lib/seed-data";
import {
  Business,
  Location,
  Category,
  Product,
  ProductSupplier,
  Contact,
  Account,
  LedgerAccount,
  User,
  Sale,
  Purchase,
  Expense,
  Role,
  CustomerGroup,
  Brand,
  Unit,
  SellReturn,
  PurchaseReturn,
  Shipment,
  PurchaseRequisition,
  Lead,
  Recipe,
  CommissionAgent,
  Discount,
  ExpenseCategory,
  NotificationTemplate,
  Project,
  Production,
  StockTransfer,
  StockAdjustment,
  Counter,
  Machine,
  Technician,
  ServiceJob,
} from "@/models";

const DEMO_ADMIN_ALIASES = [DEMO_ADMIN.email, "admin@greenpharma.bd"];

async function wipeAllDemoData() {
  const emptyResult = await pruneEmptyCollectionsClusterWide();
  const pruneResult = await pruneOrphanCollections();

  await Promise.all([
    Business.deleteMany({}),
    Location.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    ProductSupplier.deleteMany({}),
    Contact.deleteMany({}),
    Account.deleteMany({}),
    Sale.deleteMany({}),
    Purchase.deleteMany({}),
    Expense.deleteMany({}),
    Role.deleteMany({}),
    CustomerGroup.deleteMany({}),
    Brand.deleteMany({}),
    Unit.deleteMany({}),
    SellReturn.deleteMany({}),
    PurchaseReturn.deleteMany({}),
    Shipment.deleteMany({}),
    PurchaseRequisition.deleteMany({}),
    Lead.deleteMany({}),
    Recipe.deleteMany({}),
    CommissionAgent.deleteMany({}),
    Discount.deleteMany({}),
    ExpenseCategory.deleteMany({}),
    NotificationTemplate.deleteMany({}),
    Project.deleteMany({}),
    Production.deleteMany({}),
    StockTransfer.deleteMany({}),
    StockAdjustment.deleteMany({}),
    Counter.deleteMany({}),
    Machine.deleteMany({}),
    Technician.deleteMany({}),
    ServiceJob.deleteMany({}),
    User.deleteMany({}),
  ]);

  return {
    pruned: pruneResult.dropped,
    prunedEmpty: emptyResult.dropped,
  };
}

async function ensureDemoAdmin(locationId?: unknown) {
  const passwordHash = await hashPassword(DEMO_ADMIN.password);
  let admin = await User.findOne({ email: { $in: DEMO_ADMIN_ALIASES } });
  if (!admin) {
    admin = await User.create({
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
      passwordHash,
      role: "admin",
      phone: DEMO_ADMIN.phone,
      locale: "bn",
      isActive: true,
      ...(locationId ? { locationIds: [locationId] } : {}),
    });
  } else {
    admin.email = DEMO_ADMIN.email;
    admin.passwordHash = passwordHash;
    admin.isActive = true;
    admin.name = DEMO_ADMIN.name;
    if (locationId) admin.locationIds = [locationId as never];
    await admin.save();
  }
  return admin;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type IdDoc = { _id: unknown; name?: string; nameBn?: string; mobile?: string; sku?: string; purchasePrice?: number; sellPrice?: string | number };

/** GET — relation health check / counts (auth required) */
export async function GET() {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await connectDB();
    const [
      products,
      suppliers,
      customers,
      links,
      purchases,
      sales,
      locations,
      categories,
      business,
      orphanLinks,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Contact.countDocuments({ type: { $in: ["supplier", "both"] }, isActive: true }),
      Contact.countDocuments({ type: { $in: ["customer", "both"] }, isActive: true }),
      ProductSupplier.countDocuments({ isActive: true }),
      Purchase.countDocuments({}),
      Sale.countDocuments({}),
      Location.countDocuments({ isActive: true }),
      Category.countDocuments({ kind: "product" }),
      Business.findOne().lean(),
      ProductSupplier.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "p",
          },
        },
        {
          $lookup: {
            from: "contacts",
            localField: "supplierId",
            foreignField: "_id",
            as: "s",
          },
        },
        {
          $match: {
            $or: [{ p: { $size: 0 } }, { s: { $size: 0 } }],
          },
        },
        { $count: "n" },
      ]),
    ]);

    const sample = await Product.findOne({ isActive: true }).sort({ sku: 1 }).lean();
    const { attachOffersToProducts } = await import("@/lib/product-suppliers");
    const [withOffers] = sample ? await attachOffersToProducts([sample]) : [null];
    const sampleOffers = withOffers?.supplierOffers || [];

    return NextResponse.json({
      ok: true,
      counts: {
        products,
        suppliers,
        customers,
        productSupplierLinks: links,
        purchases,
        sales,
        locations,
        categories,
      },
      orphanLinks: orphanLinks[0]?.n || 0,
      business: business?.name || null,
      sample: sample
        ? { name: sample.name, sku: sample.sku, offers: sampleOffers }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "status failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    const body = await req.json().catch(() => ({}));
    const force = Boolean(body.force);

    // Allow first-time seed without session when DB is empty.
    // Force reseed always requires admin.
    await connectDB();
    const existing = await Business.findOne();

    if (force) {
      if (!session || session.role !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    } else if (existing && !session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (existing && !force) {
      if (session) await ensureDemoAdmin(undefined);
      return NextResponse.json({
        ok: true,
        seeded: false,
        message: "already_seeded",
        tip: "POST { force: true } as admin to wipe and reseed",
      });
    }

    let pruned: string[] = [];
    let prunedEmpty: string[] = [];
    if (force) {
      const wipe = await wipeAllDemoData();
      pruned = wipe.pruned;
      prunedEmpty = wipe.prunedEmpty;
    }

    // ─── Core business ───────────────────────────────────────────
    await Business.create({
      name: "Nur Engineering ERP (EEE Equipment)",
      nameBn: "নূর ইঞ্জিনিয়ারিং ইআরপি (ইইই সরঞ্জাম)",
      address: "House 12, Road 5, Dhanmondi, Dhaka-1205",
      addressBn: "বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা-১২০৫",
      phone: DEMO_ADMIN.phone,
      email: "info@ditpos.bd",
      bin: "000000000-0000",
      tin: "000000000000",
      mushak: "6.3",
      invoicePrefix: "DIT",
      timezone: "Asia/Dhaka",
      fiscalYearStartMonth: 7,
      defaultLocale: "bn",
    });

    const locations = (await Location.insertMany(
      LOCATIONS.map((l) => ({ ...l, isActive: true })),
    )) as unknown as IdDoc[];
    const hq = locations[0]!;

    const cats = (await Category.insertMany(
      CATEGORIES.map((c) => ({ ...c, kind: "product" })),
    )) as unknown as (IdDoc & { name: string })[];
    const catByName = new Map(cats.map((c) => [c.name, c]));

    await Brand.insertMany(BRANDS.map((name) => ({ name })));
    await Unit.insertMany(UNITS.map((u) => ({ ...u })));
    await Role.insertMany(ROLES.map((r) => ({ ...r })));
    await CustomerGroup.insertMany(CUSTOMER_GROUPS.map((g) => ({ ...g })));

    await CommissionAgent.insertMany([
      { name: "Karim Sales Agent", mobile: "01721000001", commissionPercent: 3 },
      { name: "Hasan Campus Agent", mobile: "01721000002", commissionPercent: 4 },
      { name: "Sultana Dealer Agent", mobile: "01721000003", commissionPercent: 5 },
    ]);

    // ─── Suppliers (Contact) ─────────────────────────────────────
    const catalogSuppliers = (await Contact.insertMany(
      CATALOG_SUPPLIERS.map((s) => ({
        type: "supplier" as const,
        name: s.name,
        nameBn: s.nameBn,
        mobile: s.mobile,
        address: s.address,
        city: s.city,
        balance: rand(5000, 80000),
        openingBalance: 0,
        isActive: true,
      })),
    )) as unknown as IdDoc[];

    const extraSuppliers = (await Contact.insertMany(
      EXTRA_SUPPLIERS.map((s) => ({
        type: "supplier" as const,
        name: s.name,
        nameBn: s.nameBn,
        mobile: s.mobile,
        address: s.address,
        city: s.city,
        balance: rand(2000, 40000),
        openingBalance: 0,
        isActive: true,
      })),
    )) as unknown as IdDoc[];
    const allSuppliers = [...catalogSuppliers, ...extraSuppliers];

    // ─── Products + ProductSupplier relation ─────────────────────
    const productRows = PRODUCTS.map((p, idx) => {
      const cat = catByName.get(p.category) || cats[idx % cats.length]!;
      const stocks = locations.slice(0, 4).map((loc, i) => ({
        locationId: loc._id,
        qty: Math.max(5, rand(15, 120) - i * 10),
        batchNo: `B${p.sku}-${i + 1}`,
      }));
      const prices = offerPrices(p.purchasePrice, p.supplierFactors);
      const supplierOffers = catalogSuppliers.map((s, i) => ({
        supplierId: s._id,
        name: s.name,
        nameBn: s.nameBn,
        price: prices[i]!,
      }));

      return {
        name: p.name,
        nameBn: p.nameBn,
        sku: p.sku,
        barcode: p.sku,
        categoryId: cat._id,
        brand: p.brand,
        unit: "Pcs",
        unitBn: "পিস",
        purchasePrice: p.purchasePrice,
        sellPrice: p.sellPrice,
        alertQty: p.alertQty,
        isActive: true,
        supplierOffers,
        stocks,
      };
    });

    const productDocs = (await Product.insertMany(productRows)) as unknown as (IdDoc & {
      purchasePrice: number;
      sellPrice: number;
      sku: string;
      name: string;
    })[];

    // ProductSupplier links:
    // - Every product shares 2 common suppliers (Alamin + VoltLab)
    // - 3rd supplier differs by product/category (Circuit Hub or specialty supplier)
    const linkRows: Record<string, unknown>[] = [];
    const seenPair = new Set<string>();
    const supplierByName = new Map(
      [...catalogSuppliers, ...extraSuppliers].map((s) => [String(s.name), s]),
    );

    function addLink(
      productId: unknown,
      supplier: IdDoc,
      price: number,
      notes?: string,
    ) {
      const key = `${String(productId)}:${String(supplier._id)}`;
      if (seenPair.has(key)) return;
      seenPair.add(key);
      linkRows.push({
        productId,
        supplierId: supplier._id,
        price,
        isActive: true,
        ...(notes ? { notes } : {}),
      });
    }

    for (let i = 0; i < productDocs.length; i++) {
      const p = productDocs[i]!;
      const seed = PRODUCTS[i]!;
      const prices = offerPrices(seed.purchasePrice, seed.supplierFactors);

      const alamin = catalogSuppliers[0]!;
      const voltlab = catalogSuppliers[1]!;
      const circuitHub = catalogSuppliers[2]!;

      // Common on almost every product
      addLink(p._id, alamin, prices[0]!);
      addLink(p._id, voltlab, prices[1]!);

      // Different 3rd supplier per product
      let third: IdDoc = circuitHub;
      let thirdPrice = prices[2]!;
      let thirdNote = "Catalog alternate";

      if (i % 3 === 1) {
        const altName = CATEGORY_ALT_SUPPLIER[seed.category];
        const alt = altName ? supplierByName.get(altName) : undefined;
        if (alt) {
          third = alt;
          thirdPrice = Math.round(seed.purchasePrice * 0.98);
          thirdNote = `${seed.category} specialist`;
        }
      } else if (i % 3 === 2) {
        third = extraSuppliers[i % extraSuppliers.length]!;
        thirdPrice = Math.round(seed.purchasePrice * 1.05);
        thirdNote = "Product-specific source";
      }
      // i % 3 === 0 → keep Circuit Hub (shared with many products)

      addLink(p._id, third, thirdPrice, thirdNote);

      // A few products also get a 4th specialty link (shared suppliers across products)
      if (i % 5 === 0) {
        const fourth = extraSuppliers[(i + 2) % extraSuppliers.length]!;
        if (String(fourth._id) !== String(third._id)) {
          addLink(
            p._id,
            fourth,
            Math.round(seed.purchasePrice * 0.96),
            "Secondary specialty",
          );
        }
      }
    }
    await ProductSupplier.insertMany(linkRows);

    // Mirror join table → product.supplierOffers cache (live Contact names)
    const { refreshProductEmbeddedOffers } = await import("@/lib/product-suppliers");
    for (const p of productDocs) {
      await refreshProductEmbeddedOffers(p._id);
    }

    // ─── Customers ───────────────────────────────────────────────
    const campusNames = [
      "BUET EEE Lab",
      "DU Robotics Club",
      "AUST Project Lab",
      "RUET Workshop",
      "CUET Maker Space",
      "IUT Tech Club",
      "NSU Innovation Hub",
      "BRACU Hardware Lab",
      "KUET Power Lab",
      "SUST Electronics Club",
    ];
    const customerDocs = (await Contact.insertMany([
      {
        type: "customer",
        name: "Walk-in Customer",
        nameBn: "নগদ গ্রাহক",
        mobile: "00000000000",
        address: "Counter",
        balance: 0,
        isActive: true,
      },
      ...campusNames.map((name, i) => ({
        type: "customer" as const,
        name,
        nameBn: name,
        mobile: `0173${String(1000000 + i).slice(1)}`,
        email: `lab${i + 1}@campus.bd`,
        address: pick(["Dhaka", "Chittagong", "Rajshahi", "Sylhet", "Khulna"]),
        creditLimit: pick([50000, 100000, 200000]),
        balance: i % 3 === 0 ? rand(2000, 35000) : 0,
        group: pick([...CUSTOMER_GROUPS]).name,
        isActive: true,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        type: "customer" as const,
        name: `Retail Buyer ${i + 1}`,
        nameBn: `রিটেইল ক্রেতা ${i + 1}`,
        mobile: `0174${String(1000000 + i).slice(1)}`,
        address: pick(["Mirpur", "Uttara", "Dhanmondi", "Motijheel"]),
        creditLimit: 20000,
        balance: 0,
        isActive: true,
      })),
    ])) as unknown as IdDoc[];

    // ─── Accounts / users ────────────────────────────────────────
    await Account.insertMany(ACCOUNTS.map((a) => ({ ...a, isActive: true })));
    await LedgerAccount.insertMany(
      LEDGER_ACCOUNTS.map((a) => ({ ...a, openingBalance: 0, balance: 0, isActive: true })),
    );

    const admin = await ensureDemoAdmin(hq._id);
    const pwd = admin.passwordHash;
    await User.insertMany([
      {
        name: "Manager Rahim",
        email: "manager@ditpharma.bd",
        passwordHash: pwd,
        role: "manager",
        phone: "01730000001",
        locale: "bn",
        locationIds: [hq._id],
        isActive: true,
      },
      {
        name: "Cashier Nila",
        email: "cashier@ditpharma.bd",
        passwordHash: pwd,
        role: "cashier",
        phone: "01730000002",
        locale: "bn",
        locationIds: [hq._id],
        isActive: true,
      },
      {
        name: "Accountant Karim",
        email: "accounts@ditpharma.bd",
        passwordHash: pwd,
        role: "accountant",
        phone: "01730000003",
        locale: "en",
        locationIds: [hq._id],
        isActive: true,
      },
    ]);

    // ─── Expenses ────────────────────────────────────────────────
    await ExpenseCategory.insertMany(
      EXPENSE_CATEGORIES.map((name) => ({ name, kind: "expense" })),
    );
    await Expense.insertMany(
      Array.from({ length: 120 }, (_, i) => {
        const category = pick(EXPENSE_CATEGORIES);
        return {
          category,
          title: `${category} — ${pick(["Monthly", "Routine", "Urgent", "Maintenance", "Office"])} #${i + 1}`,
          amount: rand(500, 50000),
          locationId: pick(locations)._id,
          paymentMethod: pick(["cash", "bank", "bkash", "nagad"] as const),
          expenseDate: daysAgo(rand(0, 45)),
          createdBy: admin._id,
        };
      })
    );

    // ─── Purchases (only via ProductSupplier-linked pairs) ────────
    const activeLinks = await ProductSupplier.find({ isActive: true }).lean();
    const linksBySupplier = new Map<string, typeof activeLinks>();
    for (const link of activeLinks) {
      const key = String(link.supplierId);
      const arr = linksBySupplier.get(key) || [];
      arr.push(link);
      linksBySupplier.set(key, arr);
    }

    const purchaseRows = [];
    let poN = 3000;
    for (const supplier of allSuppliers) {
      const links = linksBySupplier.get(String(supplier._id)) || [];
      if (!links.length) continue;
      for (let n = 0; n < 8; n++) {
        const chosen = links.slice(0, Math.min(3, links.length));
        const items = chosen.map((link) => {
          const p = productDocs.find((x) => String(x._id) === String(link.productId))!;
          const qty = rand(8, 40);
          const unitCost = Number(link.price || p.purchasePrice);
          return {
            productId: p._id,
            name: p.name,
            sku: p.sku,
            qty,
            unitCost,
            lineTotal: qty * unitCost,
            batchNo: `IN-${p.sku}-${n + 1}`,
          };
        });
        const subtotal = items.reduce((a, x) => a + x.lineTotal, 0);
        const due = n === 0 ? Math.floor(subtotal * 0.15) : 0;
        poN += 1;
        purchaseRows.push({
          referenceNo: `PO-${poN}`,
          supplierId: supplier._id,
          supplierName: supplier.name,
          locationId: pick(locations)._id,
          status: "received" as const,
          items,
          subtotal,
          grandTotal: subtotal,
          paidAmount: subtotal - due,
          dueAmount: due,
          purchaseDate: daysAgo(rand(5, 80)),
          payments: [{ method: "bank", amount: subtotal - due }],
          createdBy: admin._id,
        });
      }
    }
    await Purchase.insertMany(purchaseRows);

    // ─── Sales ───────────────────────────────────────────────────
    const saleRows = Array.from({ length: 250 }, (_, i) => {
      const cust = pick(customerDocs);
      const items = Array.from({ length: rand(1, 4) }, () => {
        const p = pick(productDocs);
        const qty = rand(1, 8);
        return {
          productId: p._id,
          name: p.name,
          sku: p.sku,
          unit: "Pcs",
          qty,
          unitPrice: p.sellPrice,
          lineTotal: qty * p.sellPrice,
        };
      });
      const subtotal = items.reduce((a, x) => a + x.lineTotal, 0);
      const status = i % 10 === 0 ? "quotation" : i % 9 === 0 ? "draft" : "final";
      const due = status === "final" && i % 4 === 0 ? Math.floor(subtotal * 0.2) : 0;
      const paid = status === "final" ? subtotal - due : 0;
      return {
        invoiceNo:
          status === "draft"
            ? `DIT-D${2000 + i}`
            : status === "quotation"
              ? `DIT-Q${2000 + i}`
              : `DIT-${12000 + i}`,
        customerId: cust._id,
        customerName: cust.name,
        customerMobile: cust.mobile,
        locationId: pick(locations)._id,
        status,
        items,
        subtotal,
        grandTotal: subtotal,
        paidAmount: paid,
        dueAmount: due,
        saleDate: daysAgo(rand(0, 70)),
        soldBy: admin._id,
        soldByName: admin.name,
        payments: paid > 0 ? [{ method: pick(["cash", "bkash", "bank"] as const), amount: paid }] : [],
      };
    });
    const createdSales = (await Sale.insertMany(saleRows)) as unknown as (IdDoc & {
      status: string;
      customerName?: string;
    })[];
    const finalSales = createdSales.filter((s) => s.status === "final");

    // ─── Returns / shipments / stock ─────────────────────────────
    await SellReturn.insertMany(
      Array.from({ length: 45 }, (_, i) => {
        const sale = pick(finalSales.length ? finalSales : createdSales);
        const p = pick(productDocs);
        const qty = rand(1, 3);
        return {
          returnNo: `SR-${500 + i}`,
          saleId: sale._id,
          customerName: sale.customerName || "Walk-in",
          items: [
            {
              productId: p._id,
              name: p.name,
              qty,
              unitPrice: p.sellPrice,
              lineTotal: qty * p.sellPrice,
            },
          ],
          grandTotal: qty * p.sellPrice,
          returnDate: daysAgo(rand(0, 40)),
        };
      }),
    );

    await PurchaseReturn.insertMany(
      Array.from({ length: 30 }, (_, i) => {
        const supplier = pick(catalogSuppliers);
        const p = pick(productDocs);
        const qty = rand(1, 5);
        return {
          returnNo: `PR-${500 + i}`,
          supplierName: supplier.name,
          items: [
            {
              productId: p._id,
              name: p.name,
              qty,
              unitPrice: p.purchasePrice,
              lineTotal: qty * p.purchasePrice,
            },
          ],
          grandTotal: qty * p.purchasePrice,
          returnDate: daysAgo(rand(0, 50)),
        };
      }),
    );

    await Shipment.insertMany(
      Array.from({ length: 65 }, (_, i) => {
        const sale = pick(createdSales);
        return {
          shipmentNo: `SH-${800 + i}`,
          saleId: sale._id,
          customerName: sale.customerName,
          status: pick(["pending", "shipped", "delivered"] as const),
          shippingAddress: pick(["Dhaka", "Chittagong", "Sylhet"]),
          shippedDate: daysAgo(rand(0, 20)),
        };
      }),
    );

    await PurchaseRequisition.insertMany(
      Array.from({ length: 40 }, (_, i) => {
        const loc = pick(locations);
        return {
          reqNo: `REQ-${600 + i}`,
          locationId: loc._id,
          locationName: loc.name,
          status: pick(["pending", "approved", "ordered"] as const),
          items: Array.from({ length: rand(1, 3) }, () => ({
            productName: pick(productDocs).name,
            qty: rand(20, 100),
          })),
        };
      }),
    );

    await StockTransfer.insertMany(
      Array.from({ length: 12 }, (_, i) => {
        const from = locations[0]!;
        const to = locations[(i % (locations.length - 1)) + 1]!;
        const p = pick(productDocs);
        return {
          transferNo: `ST-${700 + i}`,
          fromLocationId: from._id,
          toLocationId: to._id,
          items: [{ productId: p._id, name: p.name, qty: rand(5, 25) }],
          status: "completed" as const,
          note: "Branch restock",
          transferDate: daysAgo(rand(0, 40)),
          createdBy: admin._id,
        };
      }),
    );

    await StockAdjustment.insertMany(
      Array.from({ length: 10 }, (_, i) => {
        const p = pick(productDocs);
        return {
          adjustmentNo: `SA-${400 + i}`,
          locationId: hq._id,
          items: [
            {
              productId: p._id,
              name: p.name,
              qtyChange: pick([-3, -1, 1, 2, 5]),
              reason: pick(["Damaged", "Found", "Count fix"]),
            },
          ],
          note: "Physical count",
          adjustmentDate: daysAgo(rand(0, 30)),
          createdBy: admin._id,
        };
      }),
    );

    await Discount.insertMany([
      {
        name: "Campus Lab 10%",
        discountType: "percentage",
        value: 10,
        startsAt: daysAgo(30),
        endsAt: daysAgo(-30),
        isActive: true,
      },
      {
        name: "Bulk Kit ৳200 Off",
        discountType: "fixed",
        value: 200,
        startsAt: daysAgo(10),
        endsAt: daysAgo(-20),
        isActive: true,
      },
      {
        name: "Festival 5%",
        discountType: "percentage",
        value: 5,
        startsAt: daysAgo(5),
        endsAt: daysAgo(-15),
        isActive: true,
      },
    ]);

    await Lead.insertMany(
      Array.from({ length: 70 }, (_, i) => ({
        name: `Prospect Lab ${i + 1}`,
        mobile: `0194${String(1000000 + i).slice(1)}`,
        email: `prospect${i + 1}@edu.bd`,
        source: pick(["phone", "facebook", "referral", "walk-in"]),
        lifeStage: pick(["new", "contacted", "qualified", "proposal"]),
        status: pick(["open", "open", "won", "lost"] as const),
        notes: "EEE lab equipment inquiry",
        nextFollowUp: daysAgo(rand(-5, 15)),
      })),
    );

    const recipeDocs = await Recipe.insertMany(
      Array.from({ length: 8 }, (_, i) => {
        const finished = productDocs[i]!;
        return {
          finishedProductId: finished._id,
          finishedProductName: finished.name,
          outputQty: pick([10, 20, 50]),
          ingredients: [
            {
              productId: productDocs[i + 5]?._id,
              name: productDocs[i + 5]?.name || "Component A",
              qty: rand(2, 10),
            },
            {
              productId: productDocs[i + 8]?._id,
              name: productDocs[i + 8]?.name || "Component B",
              qty: rand(1, 5),
            },
          ],
          wastePercent: 2,
          isActive: true,
        };
      }),
    );

    await Production.insertMany(
      recipeDocs.map((recipe, i) => ({
        productionNo: `PRD-${900 + i}`,
        recipeId: recipe._id,
        productName: recipe.finishedProductName,
        qty: pick([10, 20, 30]),
        productionDate: daysAgo(rand(0, 40)),
      })),
    );

    await Project.insertMany(
      Array.from({ length: 15 }, (_, i) => ({
        name: `Project ${i + 1}: ${pick(["Lab Expansion", "Warehouse Upgrade", "Branch Setup", "Robotics Kit Supply", "IoT Automation"])}`,
        status: pick(["open", "completed"]),
        description: `Project description for project ${i + 1}`,
        dueDate: daysAgo(rand(-60, 60)),
      }))
    );

    await CommissionAgent.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        name: `Agent ${pick(["Hasan", "Jamal", "Rafiq", "Sujon", "Kamal"])} ${i + 1}`,
        email: `agent${i + 1}@ditpharma.bd`,
        phone: `0182${String(1000000 + i).slice(1)}`,
        commissionPercent: pick([2, 5, 10, 15]),
        address: pick(["Dhaka", "Sylhet", "Chittagong", "Rajshahi"]),
        isActive: true
      }))
    );

    await Role.insertMany([
      { name: "Super Admin", permissions: ["all"], description: "Full access" },
      { name: "Sales Exec", permissions: ["sales.create", "sales.view"], description: "Only sales access" },
      { name: "Support Agent", permissions: ["service.view", "service.edit"], description: "Service management access" }
    ]);

    const { ActivityLog } = await import("@/models");
    if(ActivityLog) {
      await ActivityLog.insertMany(
        Array.from({ length: 150 }, (_, i) => ({
          userId: admin._id,
          userName: admin.name,
          action: pick(["create", "update", "delete", "login"]),
          entityType: pick(["Sale", "Purchase", "Product", "Contact", "Expense", "ServiceJob"]),
          entityId: admin._id,
          details: `Performed ${pick(["create", "update", "delete", "login"])} operation on ${pick(["Sale", "Purchase", "Product", "Contact", "Expense", "ServiceJob"])}`,
          ipAddress: `192.168.1.${rand(10, 255)}`,
          createdAt: daysAgo(rand(0, 30)),
        }))
      );
    }

    await NotificationTemplate.insertMany([
      {
        name: "Low Stock SMS",
        type: "sms",
        subject: "Low stock",
        body: "{{product}} stock is below alert qty at {{location}}",
      },
      {
        name: "Invoice Email",
        type: "email",
        subject: "Invoice {{invoiceNo}}",
        body: "Dear {{customer}}, your invoice total is {{amount}}.",
      },
      {
        name: "Purchase Due Reminder",
        type: "email",
        subject: "Payment due {{referenceNo}}",
        body: "Supplier {{supplier}} has due amount {{amount}}.",
      },
    ]);

    // ─── Service Management Data ─────────────────────────────────
    const machinesDocs = await Machine.insertMany([
      { customerId: customerDocs[0]._id, brand: "DIT Lab", model: "Oscilloscope 10x", serialNo: "OSC-001", machineType: "Meters" },
      { customerId: customerDocs[1]._id, brand: "TechGear BD", model: "Soldering Station 60W", serialNo: "SOLD-002", machineType: "Lab Tools" },
      { customerId: customerDocs[2]._id, brand: "VoltLab BD", model: "Power Supply 5A Bench", serialNo: "PS-103", machineType: "Power Supply" },
      { customerId: customerDocs[3]._id, brand: "MakerEEE", model: "PLC Trainer Board Basic", serialNo: "PLC-005", machineType: "Kits & Boards" },
      { customerId: customerDocs[4]._id, brand: "LabCore", model: "Function Generator DDS", serialNo: "FG-902", machineType: "Meters" },
    ]);

    const techsDocs = await Technician.insertMany([
      { name: "Rafiq Hasan", mobile: "01750000010", speciality: "Microcontrollers" },
      { name: "Sujon Ali", mobile: "01750000011", speciality: "Power Supply" },
      { name: "Kamal Uddin", mobile: "01750000012", speciality: "Motors" },
      { name: "Jashim", mobile: "01750000013", speciality: "General Repair" },
    ]);

    const serviceJobRows = Array.from({ length: 90 }, (_, i) => {
      const cust = pick(customerDocs);
      const machine = pick(machinesDocs);
      const tech = pick(techsDocs);
      
      const hasParts = i % 3 !== 0;
      let parts = [];
      let partsTotal = 0;
      
      if (hasParts) {
        const numParts = rand(1, 3);
        for(let j=0; j<numParts; j++) {
           const p = pick(productDocs);
           const qty = rand(1, 3);
           parts.push({
             productId: p._id,
             name: p.name,
             qty: qty,
             unitPrice: p.sellPrice,
             lineTotal: p.sellPrice * qty
           });
           partsTotal += (p.sellPrice * qty);
        }
      }

      const serviceCharges = pick([500, 800, 1000, 1500, 2000]);
      const subtotal = partsTotal + serviceCharges;
      const discount = i % 5 === 0 ? 100 : 0;
      const grandTotal = subtotal - discount;
      const isCompleted = i % 2 === 0;
      const status = isCompleted ? "delivered" : pick(["pending", "in_progress", "completed"]);
      const paid = status === "delivered" ? grandTotal : (i % 3 === 0 ? Math.floor(grandTotal / 2) : 0);
      const due = grandTotal - paid;

      return {
        jobNo: `SJ-${1000 + i}`,
        customerId: cust._id,
        machineId: machine._id,
        technicianId: tech._id,
        status: status,
        issueDescription: pick(["Not turning on", "Display broken", "Port damaged", "Software issue", "Overheating", "Motor jammed"]),
        serviceCharges,
        parts,
        partsTotal,
        discount,
        tax: 0,
        grandTotal,
        paidAmount: paid,
        dueAmount: due,
        payments: paid > 0 ? [{ method: pick(["cash", "bkash"]), amount: paid }] : [],
        receivedDate: daysAgo(rand(1, 40)),
        deliveredDate: status === "delivered" ? daysAgo(rand(0, 10)) : undefined,
        warrantyDays: status === "delivered" ? pick([0, 15, 30, 90]) : 0,
        notes: "Seed dummy service data",
        createdBy: admin._id,
      };
    });
    await ServiceJob.insertMany(serviceJobRows);

    // ─── Verify relations ────────────────────────────────────────
    const [
      productCount,
      supplierCount,
      linkCount,
      purchaseCount,
      saleCount,
      productsWithLinks,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Contact.countDocuments({ type: "supplier", isActive: true }),
      ProductSupplier.countDocuments({ isActive: true }),
      Purchase.countDocuments({}),
      Sale.countDocuments({}),
      ProductSupplier.distinct("productId", { isActive: true }),
    ]);

    const sample = await Product.findOne({ sku: "105" }).lean();
    const { attachOffersToProducts } = await import("@/lib/product-suppliers");
    const [sampleWithOffers] = sample
      ? await attachOffersToProducts([sample])
      : [null];

    return NextResponse.json({
      ok: true,
      seeded: true,
      force: Boolean(force || existing),
      wiped: Boolean(force || existing),
      prunedCollections: pruned.length,
      prunedEmptyCollections: prunedEmpty.length,
      relations: {
        model: "Product ← ProductSupplier → Contact(supplier)",
        productsWithLinks: productsWithLinks.length,
        allProductsLinked: productsWithLinks.length === productCount,
        sampleArduinoOffers: sampleWithOffers?.supplierOffers || [],
      },
      counts: {
        products: productCount,
        suppliers: supplierCount,
        productSupplierLinks: linkCount,
        customers: customerDocs.length,
        purchases: purchaseCount,
        sales: saleCount,
        locations: locations.length,
        categories: cats.length,
      },
      admin: DEMO_ADMIN.email,
      tip: "Open /products — cards show live supplier names from ProductSupplier",
      session: session?.email ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    console.error("POST /api/seed", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
