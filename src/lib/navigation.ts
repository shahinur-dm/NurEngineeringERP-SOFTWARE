import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Contact,
  Package,
  Factory,
  Truck,
  ShoppingCart,
  ArrowLeftRight,
  SlidersHorizontal,
  Wallet,
  Landmark,
  BarChart3,
  Bell,
  Settings,
  Briefcase,
  Calendar,
  UserCircle,
  Wrench,
} from "lucide-react";

export type NavItem = {
  href?: string;
  labelKey: string;
  icon?: LucideIcon;
  moduleId?: string;
  defaultOpen?: boolean;
  children?: NavItem[];
};

/** Full sidebar tree — parity with Dawat IT POS V6.11 */
export const NAV_TREE: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  {
    labelKey: "nav.sell",
    icon: ShoppingCart,
    defaultOpen: true,
    children: [
      { href: "/pos", labelKey: "nav.pos", moduleId: "pos" },
      { href: "/sales/quotations", labelKey: "nav.listQuotations", moduleId: "sales-quotes" },
      { href: "/sales", labelKey: "nav.allSales", moduleId: "sales" },
      { href: "/sales/add", labelKey: "nav.addSale", moduleId: "sales-add" },
      { href: "/pos/list", labelKey: "nav.listPos", moduleId: "pos-list" },
      { href: "/sales/drafts/add", labelKey: "nav.addDraft", moduleId: "sales-draft-add" },
      { href: "/sales/drafts", labelKey: "nav.listDrafts", moduleId: "sales-drafts" },
      { href: "/sales/quotations/add", labelKey: "nav.addQuotation", moduleId: "sales-quote-add" },
      { href: "/sales/returns", labelKey: "nav.sellReturns", moduleId: "sell-returns" },
      { href: "/sales/shipments", labelKey: "nav.shipments", moduleId: "shipments" },
      { href: "/sales/discounts", labelKey: "nav.discounts", moduleId: "discounts" },
      { href: "/sales/import", labelKey: "nav.importSales", moduleId: "import-sales" },
    ],
  },
  {
    labelKey: "nav.contacts",
    icon: Contact,
    defaultOpen: true,
    children: [
      { href: "/contacts/customers", labelKey: "nav.customers", moduleId: "customers" },
      { href: "/contacts/suppliers", labelKey: "nav.suppliers", moduleId: "suppliers" },
      { href: "/contacts/employees", labelKey: "nav.employees", moduleId: "employees" },
      { href: "/contacts/payslips", labelKey: "nav.payslips", moduleId: "payslips" },
      { href: "/contacts/groups", labelKey: "nav.customerGroups", moduleId: "customer-groups" },
      { href: "/contacts/import", labelKey: "nav.importContacts", moduleId: "import-contacts" },
    ],
  },
  {
    labelKey: "nav.usersMgmt",
    icon: Users,
    children: [
      { href: "/users", labelKey: "nav.users", moduleId: "users" },
      { href: "/roles", labelKey: "nav.roles", moduleId: "roles" },
      { href: "/commission-agents", labelKey: "nav.commissionAgents", moduleId: "commission-agents" },
    ],
  },
  {
    labelKey: "nav.products",
    icon: Package,
    children: [
      { href: "/products", labelKey: "nav.listProducts", moduleId: "products" },
      { href: "/products/price", labelKey: "nav.updatePrice", moduleId: "products-price" },
      { href: "/products/labels", labelKey: "nav.printLabels", moduleId: "products-labels" },
      { href: "/products/variations", labelKey: "nav.variations", moduleId: "variations" },
      { href: "/products/import", labelKey: "nav.importProducts", moduleId: "products-import" },
      { href: "/products/opening-stock", labelKey: "nav.openingStock", moduleId: "opening-stock" },
      { href: "/products/price-groups", labelKey: "nav.priceGroups", moduleId: "price-groups" },
      { href: "/products/units", labelKey: "nav.units", moduleId: "units" },
      { href: "/products/categories", labelKey: "nav.categories", moduleId: "categories" },
      { href: "/products/brands", labelKey: "nav.brands", moduleId: "brands" },
      { href: "/products/warranties", labelKey: "nav.warranties", moduleId: "warranties" },
    ],
  },
  {
    labelKey: "nav.manufacturing",
    icon: Factory,
    children: [
      { href: "/manufacturing/recipes", labelKey: "nav.recipes", moduleId: "mfg-recipes" },
      { href: "/manufacturing/production", labelKey: "nav.production", moduleId: "mfg-production" },
      { href: "/manufacturing/settings", labelKey: "nav.mfgSettings", moduleId: "mfg-settings" },
      { href: "/manufacturing/reports", labelKey: "nav.mfgReport", moduleId: "mfg-report" },
    ],
  },
  {
    labelKey: "nav.purchases",
    icon: Truck,
    children: [
      { href: "/purchases/requisition", labelKey: "nav.purchaseRequisition", moduleId: "purchase-requisition" },
      { href: "/purchases", labelKey: "nav.listPurchases", moduleId: "purchases" },
      { href: "/purchases/add", labelKey: "nav.addPurchase", moduleId: "purchases-add" },
      { href: "/purchases/returns", labelKey: "nav.purchaseReturns", moduleId: "purchase-returns" },
    ],
  },
  {
    labelKey: "nav.services",
    icon: Wrench,
    children: [
      { href: "/services", labelKey: "nav.serviceJobs", moduleId: "services" },
      { href: "/services/machines", labelKey: "nav.machines", moduleId: "machines" },
      { href: "/services/technicians", labelKey: "nav.technicians", moduleId: "technicians" },
    ],
  },
  {
    labelKey: "nav.stockTransfers",
    icon: ArrowLeftRight,
    children: [
      { href: "/stock/transfers", labelKey: "nav.listTransfers", moduleId: "stock-transfers" },
      { href: "/stock/transfers/add", labelKey: "nav.addTransfer", moduleId: "stock-transfers-add" },
    ],
  },
  {
    labelKey: "nav.adjustments",
    icon: SlidersHorizontal,
    children: [
      { href: "/stock/adjustments", labelKey: "nav.listAdjustments", moduleId: "stock-adjustments" },
      { href: "/stock/adjustments/add", labelKey: "nav.addAdjustment", moduleId: "stock-adjustments-add" },
      { href: "/stock/cylinders", labelKey: "nav.cylinders", moduleId: "cylinders" },
    ],
  },
  {
    labelKey: "nav.expenses",
    icon: Wallet,
    children: [
      { href: "/expenses", labelKey: "nav.listExpenses", moduleId: "expenses" },
      { href: "/expenses/add", labelKey: "nav.addExpense", moduleId: "expenses-add" },
      { href: "/expenses/categories", labelKey: "nav.expenseCategories", moduleId: "expense-categories" },
    ],
  },
  {
    labelKey: "nav.accounts",
    icon: Landmark,
    children: [
      { href: "/accounts", labelKey: "nav.listAccounts", moduleId: "accounts" },
      { href: "/accounts/chart", labelKey: "nav.chartOfAccounts", moduleId: "chart-of-accounts" },
      { href: "/accounts/journals", labelKey: "nav.journals", moduleId: "journals" },
      { href: "/accounts/balance-sheet", labelKey: "nav.balanceSheet", moduleId: "balance-sheet" },
      { href: "/accounts/trial-balance", labelKey: "nav.trialBalance", moduleId: "trial-balance" },
      { href: "/accounts/cash-flow", labelKey: "nav.cashFlow", moduleId: "cash-flow" },
      { href: "/accounts/report", labelKey: "nav.accountReport", moduleId: "account-report" },
    ],
  },
  {
    labelKey: "nav.reports",
    icon: BarChart3,
    children: [
      { href: "/reports/profit-loss", labelKey: "reports.profitLoss", moduleId: "report-profit-loss" },
      { href: "/reports/purchase-sell", labelKey: "reports.purchaseSell", moduleId: "report-purchase-sell" },
      { href: "/reports/tax", labelKey: "reports.tax", moduleId: "report-tax" },
      { href: "/reports/customer-supplier", labelKey: "reports.customerSupplier", moduleId: "report-customer-supplier" },
      { href: "/reports/customer-groups", labelKey: "reports.customerGroups", moduleId: "report-customer-groups" },
      { href: "/reports/stock", labelKey: "reports.stock", moduleId: "report-stock" },
      { href: "/reports/stock-ledger", labelKey: "reports.stockLedger", moduleId: "report-stock-ledger" },
      { href: "/reports/stock-adjustment", labelKey: "reports.stockAdjustment", moduleId: "report-stock-adjustment" },
      { href: "/reports/trending", labelKey: "reports.trending", moduleId: "report-trending" },
      { href: "/reports/items", labelKey: "reports.items", moduleId: "report-items" },
      { href: "/reports/product-purchase", labelKey: "reports.productPurchase", moduleId: "report-product-purchase" },
      { href: "/reports/product-sell", labelKey: "reports.productSell", moduleId: "report-product-sell" },
      { href: "/reports/purchase-payment", labelKey: "reports.purchasePayment", moduleId: "report-purchase-payment" },
      { href: "/reports/sell-payment", labelKey: "reports.sellPayment", moduleId: "report-sell-payment" },
      { href: "/reports/expense", labelKey: "reports.expense", moduleId: "report-expense" },
      { href: "/reports/register", labelKey: "reports.register", moduleId: "report-register" },
      { href: "/reports/sales-rep", labelKey: "reports.salesRep", moduleId: "report-sales-rep" },
      { href: "/reports/service", labelKey: "reports.service", moduleId: "report-service" },
      { href: "/reports/activity-log", labelKey: "reports.activityLog", moduleId: "report-activity-log" },
    ],
  },
  { href: "/notification-templates", labelKey: "nav.notifications", icon: Bell, moduleId: "notification-templates" },
  {
    labelKey: "nav.settings",
    icon: Settings,
    children: [
      { href: "/settings", labelKey: "nav.businessSettings", moduleId: "settings-business" },
      { href: "/settings/locations", labelKey: "nav.locations", moduleId: "settings-locations" },
      { href: "/settings/invoices", labelKey: "nav.invoiceSettings", moduleId: "settings-invoices" },
      { href: "/settings/barcodes", labelKey: "nav.barcodeSettings", moduleId: "settings-barcodes" },
      { href: "/settings/printers", labelKey: "nav.printers", moduleId: "settings-printers" },
      { href: "/settings/tax", labelKey: "nav.taxRates", moduleId: "settings-tax" },
      { href: "/settings/subscription", labelKey: "nav.subscription", moduleId: "settings-subscription" },
    ],
  },
  {
    labelKey: "nav.crm",
    icon: Contact,
    children: [
      { href: "/crm", labelKey: "nav.crmDashboard", moduleId: "crm-dashboard" },
      { href: "/crm/leads", labelKey: "crm.leads", moduleId: "crm-leads" },
      { href: "/crm/followups", labelKey: "crm.followups", moduleId: "crm-followups" },
      { href: "/crm/campaigns", labelKey: "crm.campaigns", moduleId: "crm-campaigns" },
      { href: "/crm/proposals", labelKey: "nav.proposals", moduleId: "crm-proposals" },
      { href: "/crm/reports", labelKey: "nav.crmReports", moduleId: "crm-reports" },
      { href: "/crm/settings", labelKey: "nav.crmSettings", moduleId: "crm-settings" },
    ],
  },
  { href: "/project", labelKey: "nav.project", icon: Briefcase, moduleId: "project" },
  { href: "/calendar", labelKey: "nav.calendar", icon: Calendar, moduleId: "calendar" },
  { href: "/profile", labelKey: "nav.profile", icon: UserCircle, moduleId: "profile" },
];

export function flattenNav(items: NavItem[] = NAV_TREE): { href: string; moduleId?: string }[] {
  const out: { href: string; moduleId?: string }[] = [];
  for (const item of items) {
    if (item.href) out.push({ href: item.href, moduleId: item.moduleId });
    if (item.children) out.push(...flattenNav(item.children));
  }
  return out;
}
