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
    taxPercent: { type: Number, default: 0 },
    alertQty: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    notForSale: { type: Boolean, default: false },
    imageUrl: String,
    hsCode: String,
    description: String,
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
    type: { type: String, enum: ["customer", "supplier", "both"], required: true },
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
    group: String,
    isActive: { type: Boolean, default: true },
    notes: String,
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
    name: String,
    sku: String,
    unit: String,
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
    invoiceNo: { type: String, required: true, unique: true },
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
    supplierId: { type: Schema.Types.ObjectId, ref: "Contact" },
    supplierName: String,
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
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    payments: [PaymentSchema],
    note: String,
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
    status: { type: String, enum: ["open", "won", "lost"], default: "open" },
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
    qty: Number,
    unitPrice: Number,
    lineTotal: Number,
  },
  { _id: false },
);

const SellReturnSchema = new Schema(
  {
    returnNo: { type: String, required: true, unique: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerName: String,
    items: [ReturnItemSchema],
    grandTotal: { type: Number, default: 0 },
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
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
    customerName: String,
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: String,
    shippedDate: Date,
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
export const Lead = models.Lead || model("Lead", LeadSchema);
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

export async function nextSeq(key: string) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return doc.seq as number;
}

export type { mongoose };
