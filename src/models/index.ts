import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier", "accountant", "viewer"],
      default: "cashier",
    },
    phone: String,
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    locale: { type: String, enum: ["bn", "en"], default: "bn" },
    locationIds: [{ type: Schema.Types.ObjectId, ref: "Location" }],
  },
  { timestamps: true },
);

const LocationSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    address: String,
    phone: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const BusinessSchema = new Schema(
  {
    name: { type: String, required: true },
    nameBn: String,
    address: String,
    addressBn: String,
    phone: String,
    email: String,
    website: String,
    bin: String,
    tin: String,
    mushak: String,
    logoUrl: String,
    faviconUrl: String,
    currency: { type: String, default: "BDT" },
    timezone: { type: String, default: "Asia/Dhaka" },
    fiscalYearStartMonth: { type: Number, default: 7 },
    invoicePrefix: { type: String, default: "INV" },
    purchasePrefix: { type: String, default: "PUR" },
    stockMethod: { type: String, enum: ["fifo", "lifo", "avg"], default: "fifo" },
    defaultLocale: { type: String, enum: ["bn", "en"], default: "bn" },
  },
  { timestamps: true },
);

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    nameBn: String,
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    kind: { type: String, enum: ["product", "expense"], default: "product" },
  },
  { timestamps: true },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    nameBn: String,
    sku: { type: String, required: true, unique: true },
    barcode: String,
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    brand: String,
    unit: { type: String, default: "Pcs" },
    unitBn: { type: String, default: "পিস" },
    purchasePrice: { type: Number, default: 0 },
    sellPrice: { type: Number, default: 0 },
    currency: {
      type: String,
      enum: ["BDT", "USD", "RMB"],
      default: "BDT",
    },
    taxPercent: { type: Number, default: 0 },
    alertQty: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    notForSale: { type: Boolean, default: false },
    imageUrl: String,
    hsCode: String,
    description: String,
    shippingCost: { type: Number, default: 0 },
    shippingCurrency: { type: String, enum: ["BDT", "USD", "RMB"], default: "BDT" },
    quantity: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    buyingDate: Date,
    receivingDate: Date,
    supplierName: String,
    supplierAddress: String,
    supplierMobile: String,
    supplierWeChat: String,
    supplierWhatsApp: String,
    supplierLocation: String,
    /** Product warranty period in months (0 = none) */
    warrantyMonths: { type: Number, default: 0 },
    /** Serial / SL number */
    serialNo: String,
    /** Chart of accounts mapping */
    incomeAccountId: { type: Schema.Types.ObjectId, ref: "LedgerAccount" },
    expenseAccountId: { type: Schema.Types.ObjectId, ref: "LedgerAccount" },
    /** Per-product costing; empty = use business default */
    stockMethod: {
      type: String,
      enum: ["fifo", "lifo", "avg"],
    },
    supplierOffers: [
      {
        supplierId: { type: Schema.Types.ObjectId, ref: "Contact" },
        name: { type: String, required: true },
        nameBn: String,
        price: { type: Number, default: 0 },
      },
    ],
    stocks: [
      {
        locationId: { type: Schema.Types.ObjectId, ref: "Location" },
        qty: { type: Number, default: 0 },
        batchNo: String,
        expiryDate: Date,
      },
    ],
  },
  { timestamps: true },
);

ProductSchema.index({ name: "text", nameBn: "text", sku: "text", barcode: "text" });
ProductSchema.index({ categoryId: 1, isActive: 1 });
ProductSchema.index({ isActive: 1, name: 1 });

/**
 * Join table (many-to-many):
 * Product ← ProductSupplier → Contact(supplier)
 * Same supplierId can appear on many products.
 */
const ProductSupplierSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Contact", required: true, index: true },
    price: { type: Number, default: 0, min: 0 },
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ProductSupplierSchema.index({ productId: 1, supplierId: 1 }, { unique: true });
ProductSupplierSchema.index({ supplierId: 1, isActive: 1 });
ProductSupplierSchema.index({ productId: 1, isActive: 1 });

const ContactSchema = new Schema(
  {
    type: { type: String, enum: ["customer", "supplier", "both", "employee"], required: true },
    name: { type: String, required: true },
    nameBn: String,
    mobile: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    addressBn: String,
    city: String,
    nid: String,
    bin: String,
    tin: String,
    creditLimit: { type: Number, default: 0 },
    openingBalance: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    /** Monthly / payslip base for employees */
    basicSalary: { type: Number, default: 0 },
    group: String,
    isActive: { type: Boolean, default: true },
    notes: String,
    location: String,
    supplierName: String,
    supplierContact: String,
    supplierEmail: String,
    supplierWhatsApp: String,
    supplierWeChat: String,
    supplierCurrencyName: String,
  },
  { timestamps: true },
);

ContactSchema.index({ name: "text", mobile: "text" });
ContactSchema.index({ type: 1, isActive: 1 });
ContactSchema.index({ mobile: 1 });
ContactSchema.index({ type: 1, name: 1 });

const SaleItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    /** Sale-specific snapshot — does not rename Product Master */
    name: String,
    sku: String,
    unit: String,
    description: String,
    imageUrl: String,
    qty: { type: Number, required: true },
    bonusQty: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const PaymentSchema = new Schema(
  {
    method: {
      type: String,
      enum: ["cash", "card", "bkash", "nagad", "rocket", "cheque", "bank", "credit"],
      required: true,
    },
    amount: { type: Number, required: true },
    reference: String,
    note: String,
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const SaleSchema = new Schema(
  {
    invoiceNo: { type: String, unique: true, sparse: true },
    quotationNo: { type: String },
    salesOrderNo: { type: String, unique: true, sparse: true },
    /** Master reference shared across quotation → SO → invoice → challan */
    referenceNo: { type: String },
    poNo: String,
    poDate: Date,
    subject: String,
    section: String,
    attention: String,
    documentBody: String,
    terms: String,
    status: {
      type: String,
      enum: ["draft", "quotation", "final", "suspended", "returned"],
      default: "final",
    },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    customerId: { type: Schema.Types.ObjectId, ref: "Contact" },
    customerName: String,
    customerMobile: String,
    customerAddress: String,
    customerEmail: String,
    pfNo: String,
    challanNo: String,
    binNo: String,
    sourceQuotationId: { type: Schema.Types.ObjectId, ref: "Sale" },
    items: [SaleItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    payments: [PaymentSchema],
    note: String,
    staffNote: String,
    soldBy: { type: Schema.Types.ObjectId, ref: "User" },
    soldByName: String,
    hasSignature: { type: Boolean, default: false },
    saleDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

SaleSchema.index({ saleDate: -1 });
SaleSchema.index({ customerId: 1, saleDate: -1 });

const PurchaseSchema = new Schema(
  {
    referenceNo: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["draft", "ordered", "received", "returned"],
      default: "received",
    },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    purchaseType: { type: String, enum: ["local", "import"], default: "local" },
    supplierId: { type: Schema.Types.ObjectId, ref: "Contact" },
    supplierName: String,
    supplierWhatsapp: String,
    supplierWechat: String,
    supplierAddress: String,
    supplierMobile: String,
    supplierLocation: String,
    productName: String,
    productDescription: String,
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    brand: String,
    quantity: { type: Number, default: 0 },
    buyingPrice: { type: Number, default: 0 },
    shippingCurrency: { type: String, enum: ["BDT", "USD", "RMB"], default: "BDT" },
    costPrice: { type: Number, default: 0 },
    paymentMethod: String,
    paymentStatus: String,
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        sku: String,
        qty: Number,
        unitCost: Number,
        lineTotal: Number,
        batchNo: String,
        expiryDate: Date,
      },
    ],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCost: { type: Number, default: 0 },
    currency: { type: String, enum: ["BDT", "USD", "RMB"], default: "BDT" },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    payments: [PaymentSchema],
    note: String,
    receivingDate: Date,
    documentName: String,
    documentUrl: String,
    purchaseDate: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const ExpenseSchema = new Schema(
  {
    category: { type: String, required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bkash", "nagad", "rocket", "cheque", "bank"],
      default: "cash",
    },
    note: String,
    expenseDate: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const StockTransferSchema = new Schema(
  {
    transferNo: { type: String, required: true, unique: true },
    fromLocationId: { type: Schema.Types.ObjectId, ref: "Location" },
    toLocationId: { type: Schema.Types.ObjectId, ref: "Location" },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        qty: Number,
      },
    ],
    status: { type: String, enum: ["pending", "completed"], default: "completed" },
    note: String,
    transferDate: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const StockAdjustmentSchema = new Schema(
  {
    adjustmentNo: { type: String, required: true, unique: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        qtyChange: Number,
        reason: String,
      },
    ],
    note: String,
    adjustmentDate: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const AccountSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["cash", "bank", "bkash", "nagad", "rocket", "other"],
      default: "cash",
    },
    accountNo: String,
    openingBalance: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/** Chart of Accounts (GL) — separate from payment wallets */
const LedgerAccountSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    nameBn: String,
    type: {
      type: String,
      enum: ["asset", "liability", "equity", "income", "expense"],
      required: true,
    },
    openingBalance: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
LedgerAccountSchema.index({ code: 1 }, { unique: true });
LedgerAccountSchema.index({ type: 1, isActive: 1 });

const JournalLineSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "LedgerAccount", required: true },
    accountName: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    memo: String,
  },
  { _id: false },
);

const JournalEntrySchema = new Schema(
  {
    entryNo: { type: String, required: true, unique: true },
    entryDate: { type: Date, default: Date.now },
    memo: String,
    status: { type: String, enum: ["draft", "posted"], default: "draft" },
    lines: { type: [JournalLineSchema], default: [] },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    postedAt: Date,
  },
  { timestamps: true },
);

/** Cylinder / returnable packaging movement (not a financial sale) */
const CylinderMovementSchema = new Schema(
  {
    movementDate: { type: Date, default: Date.now },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: String,
    partyType: {
      type: String,
      enum: ["customer", "supplier", "warehouse"],
      required: true,
    },
    partyId: { type: Schema.Types.ObjectId },
    partyName: { type: String, required: true },
    delivered: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    note: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
CylinderMovementSchema.index({ partyType: 1, partyId: 1, productId: 1, movementDate: 1 });

const PayslipSchema = new Schema(
  {
    slipNo: { type: String, required: true, unique: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    employeeName: String,
    periodLabel: String,
    periodFrom: Date,
    periodTo: Date,
    basicSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "paid"], default: "draft" },
    paidAt: Date,
    note: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const LeadSchema = new Schema(
  {
    name: { type: String, required: true },
    mobile: String,
    email: String,
    source: String,
    lifeStage: { type: String, default: "new" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
    nextFollowUp: Date,
    status: {
      type: String,
      enum: ["open", "new", "contacted", "qualified", "unqualified", "won", "lost"],
      default: "open",
    },
    company: String,
    product: String,
    ownerName: String,
    rating: { type: String, default: "warm" },
  },
  { timestamps: true },
);

const CrmFollowUpSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    leadName: String,
    clientId: String,
    clientName: String,
    scheduledAt: { type: Date, required: true },
    status: { type: String, default: "scheduled" },
    notes: String,
    campaignId: String,
    campaignName: String,
    ownerName: String,
    company: String,
    phone: String,
    conversations: [
      {
        at: { type: Date, default: Date.now },
        text: String,
        userName: String,
      },
    ],
  },
  { timestamps: true },
);

const CrmClientSchema = new Schema(
  {
    name: { type: String, required: true },
    mobile: String,
    email: String,
    company: String,
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    notes: String,
    status: { type: String, default: "active" },
    campaignId: String,
    campaignName: String,
    dealId: String,
    source: String,
    ownerName: String,
    photoUrl: String,
    website: String,
    address: String,
    city: String,
    country: String,
    passwordHash: String,
  },
  { timestamps: true },
);

const CrmDealSchema = new Schema(
  {
    title: { type: String, required: true },
    value: { type: Number, default: 0 },
    stage: { type: String, default: "prospect" },
    clientId: String,
    clientName: String,
    leadId: String,
    leadName: String,
    notes: String,
    campaignId: String,
    campaignName: String,
    ownerName: String,
    company: String,
    phone: String,
    email: String,
    expectedClose: Date,
  },
  { timestamps: true },
);

const CrmCampaignSchema = new Schema(
  {
    name: { type: String, required: true },
    source: String,
    status: { type: String, default: "draft" },
    startsAt: Date,
    endsAt: Date,
    notes: String,
    description: String,
    budget: Number,
    audience: String,
    ownerName: String,
  },
  { timestamps: true },
);

const RecipeSchema = new Schema(
  {
    finishedProductId: { type: Schema.Types.ObjectId, ref: "Product" },
    finishedProductName: String,
    outputQty: { type: Number, default: 1 },
    ingredients: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        qty: Number,
      },
    ],
    wastePercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const RoleSchema = new Schema(
  { name: { type: String, required: true }, permissions: [String] },
  { timestamps: true },
);

const CommissionAgentSchema = new Schema(
  {
    name: { type: String, required: true },
    mobile: String,
    commissionPercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CustomerGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    discountPercent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const BrandSchema = new Schema({ name: { type: String, required: true } }, { timestamps: true });
const UnitSchema = new Schema(
  { name: { type: String, required: true }, shortName: String },
  { timestamps: true },
);

const ReturnItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    name: String,
    sku: String,
    description: String,
    qty: Number,
    unitPrice: Number,
    discount: Number,
    lineTotal: Number,
  },
  { _id: false },
);

const SellReturnSchema = new Schema(
  {
    returnNo: { type: String, required: true, unique: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerId: { type: Schema.Types.ObjectId, ref: "Contact" },
    customerName: String,
    customerMobile: String,
    customerAddress: String,
    customerEmail: String,
    attention: String,
    challanNo: String,
    referenceNo: String,
    invoiceNo: String,
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    terms: String,
    documentBody: String,
    note: String,
    items: [ReturnItemSchema],
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    payments: [PaymentSchema],
    status: { type: String, default: "Returned" },
    returnDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const PurchaseReturnSchema = new Schema(
  {
    returnNo: { type: String, required: true, unique: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    supplierName: String,
    items: [ReturnItemSchema],
    grandTotal: { type: Number, default: 0 },
    returnDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ShipmentSchema = new Schema(
  {
    shipmentNo: { type: String, required: true, unique: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", index: true },
    invoiceNo: String,
    customerName: String,
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: String,
    shippedDate: Date,
    referenceNo: String,
    items: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: "Product" },
          name: String,
          sku: String,
          description: String,
          imageUrl: String,
          qty: Number,
          unit: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

const DiscountSchema = new Schema(
  {
    name: { type: String, required: true },
    discountType: { type: String, enum: ["fixed", "percentage"], default: "percentage" },
    value: { type: Number, default: 0 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const PurchaseRequisitionSchema = new Schema(
  {
    reqNo: { type: String, required: true, unique: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    locationName: String,
    status: { type: String, enum: ["pending", "approved", "ordered"], default: "pending" },
    items: [{ productName: String, qty: Number }],
  },
  { timestamps: true },
);

const ExpenseCategorySchema = new Schema(
  { name: { type: String, required: true }, kind: { type: String, default: "expense" } },
  { timestamps: true },
);

const NotificationTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["email", "sms"], default: "email" },
    subject: String,
    body: String,
  },
  { timestamps: true },
);

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ["open", "completed", "on_hold"], default: "open" },
    description: String,
    dueDate: Date,
  },
  { timestamps: true },
);

const ProductionSchema = new Schema(
  {
    productionNo: { type: String, required: true, unique: true },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    productName: String,
    qty: { type: Number, default: 1 },
    productionDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const MachineSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    brand: String,
    model: String,
    serialNo: { type: String, unique: true, sparse: true },
    machineType: String,
    purchaseDate: Date,
    warrantyExpiryDate: Date,
    notes: String,
  },
  { timestamps: true },
);

const TechnicianSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    mobile: String,
    speciality: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ServiceJobItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    name: String,
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const ServiceJobSchema = new Schema(
  {
    jobNo: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    machineId: { type: Schema.Types.ObjectId, ref: "Machine" },
    technicianId: { type: Schema.Types.ObjectId, ref: "Technician" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "delivered", "cancelled"],
      default: "pending",
    },
    issueDescription: { type: String, required: true },
    serviceCharges: { type: Number, default: 0 },
    parts: [ServiceJobItemSchema],
    partsTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    payments: [PaymentSchema], // Re-uses PaymentSchema
    receivedDate: { type: Date, default: Date.now },
    expectedDeliveryDate: Date,
    deliveredDate: Date,
    warrantyDays: { type: Number, default: 0 },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const ActivityLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true }, // e.g., "Created", "Updated", "Deleted"
    entityType: { type: String, required: true }, // e.g., "Sale", "Product", "ServiceJob"
    entityId: { type: String },
    details: { type: String }, // e.g., "Invoice #101 created"
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
export const Location = models.Location || model("Location", LocationSchema);
export const Business = models.Business || model("Business", BusinessSchema);
export const Category = models.Category || model("Category", CategorySchema);
export const Product = models.Product || model("Product", ProductSchema);
export const ProductSupplier =
  models.ProductSupplier || model("ProductSupplier", ProductSupplierSchema);
export const Contact = models.Contact || model("Contact", ContactSchema);
export const Sale = models.Sale || model("Sale", SaleSchema);
export const Purchase = models.Purchase || model("Purchase", PurchaseSchema);
export const Expense = models.Expense || model("Expense", ExpenseSchema);
export const StockTransfer =
  models.StockTransfer || model("StockTransfer", StockTransferSchema);
export const StockAdjustment =
  models.StockAdjustment || model("StockAdjustment", StockAdjustmentSchema);
export const Account = models.Account || model("Account", AccountSchema);
export const LedgerAccount =
  models.LedgerAccount || model("LedgerAccount", LedgerAccountSchema);
export const JournalEntry =
  models.JournalEntry || model("JournalEntry", JournalEntrySchema);
export const CylinderMovement =
  models.CylinderMovement || model("CylinderMovement", CylinderMovementSchema);
export const Payslip = models.Payslip || model("Payslip", PayslipSchema);
export const Lead = models.Lead || model("Lead", LeadSchema);
export const CrmFollowUp = models.CrmFollowUp || model("CrmFollowUp", CrmFollowUpSchema);
export const CrmClient = models.CrmClient || model("CrmClient", CrmClientSchema);
export const CrmDeal = models.CrmDeal || model("CrmDeal", CrmDealSchema);
export const CrmCampaign = models.CrmCampaign || model("CrmCampaign", CrmCampaignSchema);
export const Recipe = models.Recipe || model("Recipe", RecipeSchema);
export const Counter = models.Counter || model("Counter", CounterSchema);
export const Role = models.Role || model("Role", RoleSchema);
export const CommissionAgent = models.CommissionAgent || model("CommissionAgent", CommissionAgentSchema);
export const CustomerGroup = models.CustomerGroup || model("CustomerGroup", CustomerGroupSchema);
export const Brand = models.Brand || model("Brand", BrandSchema);
export const Unit = models.Unit || model("Unit", UnitSchema);
export const SellReturn = models.SellReturn || model("SellReturn", SellReturnSchema);
export const PurchaseReturn = models.PurchaseReturn || model("PurchaseReturn", PurchaseReturnSchema);
export const Shipment = models.Shipment || model("Shipment", ShipmentSchema);
export const Discount = models.Discount || model("Discount", DiscountSchema);
export const PurchaseRequisition =
  models.PurchaseRequisition || model("PurchaseRequisition", PurchaseRequisitionSchema);
export const ExpenseCategory =
  models.ExpenseCategory ||
  model("ExpenseCategory", ExpenseCategorySchema, "categories");
export const NotificationTemplate =
  models.NotificationTemplate || model("NotificationTemplate", NotificationTemplateSchema);
export const Project = models.Project || model("Project", ProjectSchema);
export const Production = models.Production || model("Production", ProductionSchema);

export const Machine = models.Machine || model("Machine", MachineSchema);
export const Technician = models.Technician || model("Technician", TechnicianSchema);
export const ServiceJob = models.ServiceJob || model("ServiceJob", ServiceJobSchema);
export const ActivityLog = models.ActivityLog || model("ActivityLog", ActivityLogSchema);

// Hot-reload: compiled models keep the first schema. Patch new sale/challan fields.
try {
  for (const field of ["company", "product", "ownerName", "rating"] as const) {
    if (!Lead.schema.path(field)) Lead.schema.add({ [field]: String });
  }
  if (!Lead.schema.path("value")) Lead.schema.add({ value: Number });
  for (const field of ["campaignId", "campaignName"] as const) {
    if (!Lead.schema.path(field)) Lead.schema.add({ [field]: String });
  }
  for (const field of ["campaignId", "campaignName", "ownerName", "company", "phone", "email"] as const) {
    if (!CrmDeal.schema.path(field)) CrmDeal.schema.add({ [field]: String });
  }
  if (!CrmDeal.schema.path("expectedClose")) CrmDeal.schema.add({ expectedClose: Date });
  for (const field of ["description", "audience", "ownerName"] as const) {
    if (!CrmCampaign.schema.path(field)) CrmCampaign.schema.add({ [field]: String });
  }
  if (!CrmCampaign.schema.path("budget")) CrmCampaign.schema.add({ budget: Number });
  for (const field of ["campaignId", "campaignName", "dealId", "source", "ownerName", "photoUrl", "website", "address", "city", "country", "passwordHash"] as const) {
    if (!CrmClient.schema.path(field)) CrmClient.schema.add({ [field]: String });
  }
  for (const field of ["campaignId", "campaignName", "ownerName", "company", "phone"] as const) {
    if (!CrmFollowUp.schema.path(field)) CrmFollowUp.schema.add({ [field]: String });
  }
  const leadStatus = Lead.schema.path("status") as { enumValues?: string[] } | undefined;
  if (leadStatus) {
    leadStatus.enumValues = ["open", "new", "contacted", "qualified", "unqualified", "won", "lost"];
  }
  if (!User.schema.path("avatarUrl")) {
    User.schema.add({ avatarUrl: String });
  }
  if (!Business.schema.path("faviconUrl")) {
    Business.schema.add({ faviconUrl: String });
  }
  const saleItems = Sale.schema.path("items") as mongoose.Schema.Types.DocumentArray | undefined;
  if (saleItems?.schema && !saleItems.schema.path("description")) {
    saleItems.schema.add({ description: String });
  }
  if (saleItems?.schema && !saleItems.schema.path("imageUrl")) {
    saleItems.schema.add({ imageUrl: String });
  }
  for (const field of [
    "quotationNo",
    "referenceNo",
    "salesOrderNo",
    "poNo",
    "subject",
    "attention",
    "documentBody",
    "terms",
    "customerEmail",
    "pfNo",
    "challanNo",
    "binNo",
  ] as const) {
    if (!Sale.schema.path(field)) Sale.schema.add({ [field]: String });
  }
  for (const field of [
    "customerMobile",
    "customerAddress",
    "customerEmail",
    "attention",
    "challanNo",
    "referenceNo",
    "invoiceNo",
    "terms",
    "documentBody",
    "note",
    "status",
  ] as const) {
    if (!SellReturn.schema.path(field)) SellReturn.schema.add({ [field]: String });
  }
  if (!Sale.schema.path("sourceQuotationId")) {
    Sale.schema.add({ sourceQuotationId: { type: Schema.Types.ObjectId, ref: "Sale" } });
  }
  if (!Sale.schema.path("poDate")) Sale.schema.add({ poDate: Date });
  if (!Sale.schema.path("hasSignature")) Sale.schema.add({ hasSignature: Boolean });
  const invPath = Sale.schema.path("invoiceNo") as mongoose.SchemaType | undefined;
  if (invPath) {
    if (typeof invPath.required === "function") invPath.required(false);
    (invPath as { isRequired?: boolean }).isRequired = false;
    const validators = (invPath as { validators?: { type?: string }[] }).validators;
    if (Array.isArray(validators)) {
      (invPath as { validators: { type?: string }[] }).validators = validators.filter(
        (v) => v.type !== "required",
      );
    }
  }
  if (!Shipment.schema.path("invoiceNo")) {
    Shipment.schema.add({ invoiceNo: String });
  }
  if (!Shipment.schema.path("referenceNo")) {
    Shipment.schema.add({ referenceNo: String });
  }
  if (!Shipment.schema.path("items")) {
    Shipment.schema.add({
      items: {
        type: [
          {
            productId: { type: Schema.Types.ObjectId, ref: "Product" },
            name: String,
            sku: String,
            description: String,
            imageUrl: String,
            qty: Number,
            unit: String,
          },
        ],
        default: [],
      },
    });
  }
  const shipItems = Shipment.schema.path("items") as mongoose.Schema.Types.DocumentArray | undefined;
  if (shipItems?.schema && !shipItems.schema.path("description")) {
    shipItems.schema.add({ description: String });
  }
  if (shipItems?.schema && !shipItems.schema.path("imageUrl")) {
    shipItems.schema.add({ imageUrl: String });
  }
  for (const field of [
    "location",
    "supplierName",
    "supplierContact",
    "supplierEmail",
    "supplierWhatsApp",
    "supplierWeChat",
    "supplierCurrencyName",
  ] as const) {
    if (!Contact.schema.path(field)) Contact.schema.add({ [field]: String });
  }
  if (!Product.schema.path("shippingCost")) {
    Product.schema.add({
      shippingCost: { type: Number, default: 0 },
      shippingCurrency: { type: String, enum: ["BDT", "USD", "RMB"], default: "BDT" },
      quantity: { type: Number, default: 0 },
      costPrice: { type: Number, default: 0 },
      buyingDate: Date,
      receivingDate: Date,
      supplierName: String,
      supplierAddress: String,
      supplierMobile: String,
      supplierWeChat: String,
      supplierWhatsApp: String,
      supplierLocation: String,
    });
  }
  if (!Purchase.schema.path("productName")) {
    Purchase.schema.add({
      productName: String,
      productDescription: String,
      categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
      brand: String,
      quantity: { type: Number, default: 0 },
      buyingPrice: { type: Number, default: 0 },
      shippingCurrency: { type: String, enum: ["BDT", "USD", "RMB"], default: "BDT" },
      costPrice: { type: Number, default: 0 },
      supplierAddress: String,
      supplierMobile: String,
      supplierLocation: String,
      paymentMethod: String,
      paymentStatus: String,
    });
  }
} catch (err) {
  console.error("[models] schema patch skipped", err);
}

export async function nextSeq(key: string, startAfter = 0) {
  if (startAfter > 0) {
    const exists = await Counter.findOne({ key });
    if (!exists) {
      try {
        await Counter.create({ key, seq: startAfter });
      } catch {
        /* concurrent insert */
      }
    }
  }
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return doc.seq as number;
}

export type { mongoose };
