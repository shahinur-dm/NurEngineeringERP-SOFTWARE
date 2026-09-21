/**
 * Local/SQA CRM demo seed. Guarded by DEMO_CRM_SEED=1.
 * $env:DEMO_CRM_SEED='1'; $env:BASE='http://localhost:3000'; node scripts/seed-crm-demo.mjs
 */
const BASE = process.env.BASE || "http://localhost:3000";
if (process.env.DEMO_CRM_SEED !== "1") {
  console.log("Refusing to seed. Set DEMO_CRM_SEED=1");
  process.exit(0);
}

let cookie = "";
async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookie) headers.cookie = cookie;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, { ...opts, headers });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  let json = {};
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, json };
}

await req("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "admin@ditpharma.bd", password: "admin123" }),
});

const existing = await req("/api/crm/campaigns?q=DEMO_CRM_CAMPAIGN");
if ((existing.json.data || []).length >= 8) {
  console.log("Demo CRM campaigns already present. Skipping.");
  process.exit(0);
}

const campaigns = [
  { name: "DEMO_CRM_CAMPAIGN_Industrial Equipment Expo 2026", source: "Trade Fair", status: "active" },
  { name: "DEMO_CRM_CAMPAIGN_ERP Automation — September 2026", source: "Facebook Ads", status: "active" },
  { name: "DEMO_CRM_CAMPAIGN_Industrial Equipment B2B — Q3", source: "Google Ads", status: "active" },
  { name: "DEMO_CRM_CAMPAIGN_Factory Management Solution", source: "Referral", status: "completed" },
  { name: "DEMO_CRM_CAMPAIGN_Nur Engineering SME Outreach", source: "LinkedIn", status: "scheduled" },
  { name: "DEMO_CRM_CAMPAIGN_Bangladesh Manufacturing Expo", source: "Trade Fair", status: "completed" },
  { name: "DEMO_CRM_CAMPAIGN_Generator Supply Dhaka North", source: "WhatsApp", status: "active" },
  { name: "DEMO_CRM_CAMPAIGN_Chattogram Port Industries", source: "Phone", status: "active" },
  { name: "DEMO_CRM_CAMPAIGN_Gazipur Textile Cluster", source: "Email", status: "paused" },
  { name: "DEMO_CRM_CAMPAIGN_Website Enquiry Catch", source: "Website", status: "draft" },
];

const campIds = [];
for (const c of campaigns) {
  const r = await req("/api/crm/campaigns", { method: "POST", body: JSON.stringify({ ...c, notes: "DEMO_CRM_SEED" }) });
  if (r.status === 201) campIds.push({ id: r.json.data._id, ...c });
  else if (r.status === 409) {
    const found = (await req(`/api/crm/campaigns?q=${encodeURIComponent(c.name)}`)).json.data?.[0];
    if (found) campIds.push({ id: found._id, ...c });
  }
}

const people = [
  ["Md. Tanvir Hossain", "01711223344", "Rahman Industrial Solutions", "Dhaka"],
  ["Abdur Rahman", "01822334455", "ABC Engineering Ltd.", "Narayanganj"],
  ["Md. Kamal Hossain", "01933445566", "Modern Textile Industries", "Gazipur"],
  ["Shahadat Hossain", "01644556677", "Dhaka Industrial Solutions", "Dhaka"],
  ["Ariful Islam", "01355667788", "Prime Manufacturing Ltd.", "Chattogram"],
  ["Rashedul Hasan", "01466778899", "Eastern Machinery", "Khulna"],
  ["Nasrin Akter", "01577889900", "Bengal Packaging", "Cumilla"],
  ["Mahmudul Hasan", "01788990011", "Sylhet Agro Tech", "Sylhet"],
  ["Farzana Yasmin", "01899001122", "Rajshahi Steel Works", "Rajshahi"],
  ["Imran Kabir", "01900112233", "Port City Logistics", "Chattogram"],
  ["Sajjad Karim", "01611223300", "Gazipur Knit Composite", "Gazipur"],
  ["Lamia Chowdhury", "01322334411", "Dhaka Pharma Traders", "Dhaka"],
  ["Mehedi Hasan", "01433445522", "Narayanganj Yarn Hub", "Narayanganj"],
  ["Tahmina Sultana", "01544556633", "Khulna Ship Repair", "Khulna"],
  ["Jahidul Islam", "01755667744", "Cumilla Food Processing", "Cumilla"],
  ["Sharmin Jahan", "01866778855", "Sylhet Tea Estates", "Sylhet"],
  ["Nayeem Ahmed", "01977889966", "Rajshahi Cold Storage", "Rajshahi"],
  ["Rokeya Begum", "01688990077", "Uttara Light Engineering", "Dhaka"],
  ["Shakil Mahmud", "01399001188", "CEPZ Garments", "Chattogram"],
  ["Mitu Rahman", "01400112299", "Savar Furniture Park", "Dhaka"],
  ["Hasan Ali", "01511220033", "Keraniganj Metal Works", "Dhaka"],
  ["Anika Sultana", "01722331144", "Bogura Auto Parts", "Rajshahi"],
  ["Tariqul Islam", "01833442255", "Mymensingh Agro Mill", "Dhaka"],
  ["Nusrat Jahan", "01944553366", "Barishal Ice Plant", "Khulna"],
  ["Asif Chowdhury", "01655664477", "Rangpur Seed Company", "Rajshahi"],
  ["Sadia Islam", "01366775588", "Jashore Light Foundry", "Khulna"],
  ["Rakib Hasan", "01477886699", "Tongi Electronics", "Gazipur"],
  ["Faisal Ahmed", "01588997700", "Fatullah Dyeing", "Narayanganj"],
  ["Morshed Alam", "01799008811", "Halishahar Shipyard", "Chattogram"],
  ["Shila Akter", "01800119922", "Pabna Sugar Mill", "Rajshahi"],
  ["Zahid Hasan", "01911220044", "Cox's Bazar Cold Chain", "Chattogram"],
  ["Rina Khatun", "01622331155", "Dinajpur Wheat Mill", "Rajshahi"],
  ["Oliullah Khan", "01333442266", "Tejgaon Machine Tools", "Dhaka"],
  ["Ayesha Siddika", "01444553377", "Mirpur Ceramic", "Dhaka"],
  ["Badrul Alam", "01555664488", "Ashulia Woven", "Gazipur"],
  ["Sumaiya Haque", "01766775599", "Karnaphuli Paper", "Chattogram"],
  ["Shuvo Roy", "01877886600", "Ghorashal Power Spares", "Narayanganj"],
  ["Nabila Rahman", "01988997711", "Sreepur Packaging", "Gazipur"],
  ["Kamrul Islam", "01699008822", "Agrabad Trading", "Chattogram"],
  ["Tania Akter", "01300119933", "Motijheel Corporate", "Dhaka"],
  ["Shahriar Kabir", "01411223366", "Banani Tech Park", "Dhaka"],
  ["Moushumi Begum", "01522334477", "Feni Plastic", "Cumilla"],
  ["Adnan Hossain", "01733445588", "Noakhali Fish Cold", "Chattogram"],
  ["Jannatul Ferdous", "01844556699", "Comilla EPZ Unit", "Cumilla"],
  ["Saiful Islam", "01955667700", "Moulvibazar Gas Spares", "Sylhet"],
  ["Priyanka Das", "01666778811", "Khulna Jute Goods", "Khulna"],
  ["Wahiduzzaman", "01377889922", "Kushtia Tobacco Store", "Khulna"],
  ["Nusrat Mim", "01488990033", "Savar Dairy Plant", "Dhaka"],
];

const products = ["Customised Software", "Industrial Generator", "ERP Implementation", "CNC Spare Parts", "Boiler Service"];
const ratings = ["hot", "warm", "cold"];
const statuses = ["open", "contacted", "qualified", "open", "qualified", "won", "lost", "open"];
const stages = ["prospect", "qualified", "proposal", "negotiation", "won", "lost"];
const prefixes = ["017", "018", "019", "016", "013", "014", "015"];

const leadIds = [];
for (let i = 0; i < people.length; i++) {
  const [name, mobile, company] = people[i];
  const camp = campIds[i % campIds.length];
  const phone = prefixes[i % prefixes.length] + String(11000000 + i).slice(-8);
  const r = await req("/api/crm/leads", {
    method: "POST",
    body: JSON.stringify({
      name,
      mobile: mobile || phone,
      company,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.com.bd`.replace("..", "."),
      campaignId: camp?.id,
      source: camp?.source,
      rating: ratings[i % ratings.length],
      status: statuses[i % statuses.length],
      product: products[i % products.length],
      ownerName: i % 2 ? "Yasser Ahmad" : "Dipto Karmokar",
      notes: "DEMO_CRM_SEED",
      value: 50000 + i * 15000,
    }),
  });
  if (r.status === 201) leadIds.push({ id: r.json.data._id, name, company, i });
}

const fuStatuses = ["scheduled", "ongoing", "on_hold", "completed", "missed", "scheduled"];
for (let i = 0; i < Math.min(40, leadIds.length); i++) {
  const lead = leadIds[i];
  const offset = i % 5 === 0 ? -2 : i % 4 === 0 ? 1 : 3;
  await req("/api/crm/followups", {
    method: "POST",
    body: JSON.stringify({
      leadId: lead.id,
      scheduledAt: new Date(Date.now() + offset * 86400000 + i * 3600000).toISOString(),
      status: fuStatuses[i % fuStatuses.length],
      notes: i % 3 === 0 ? "Site visit and quotation discussion" : "Follow-up call on proposal",
    }),
  });
}

for (let i = 0; i < Math.min(24, leadIds.length); i++) {
  const lead = leadIds[i];
  const stage = stages[i % stages.length];
  const deal = await req("/api/crm/deals", {
    method: "POST",
    body: JSON.stringify({
      title: `${lead.company} — ${products[i % products.length]}`,
      leadId: lead.id,
      value: 120000 + i * 35000,
      stage,
      notes: "DEMO_CRM_SEED",
    }),
  });
  if (stage === "won" && deal.json.data?._id) {
    await req(`/api/crm/deals/${deal.json.data._id}/convert`, { method: "POST" });
  }
}

console.log(`Seeded campaigns=${campIds.length} leads=${leadIds.length}`);
