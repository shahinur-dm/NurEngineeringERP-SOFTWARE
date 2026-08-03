const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anikwitinstitute_db_user:anikwitinstitutegmailcom@d360crm.s0ebokd.mongodb.net/dit_pos?retryWrites=true&w=majority&appName=D360CRM', { dbName: 'nur_engineering_erp' })
.then(async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

  const salesAgg = await mongoose.connection.db.collection('sales').aggregate([
    { $match: { saleDate: { $gte: thirtyDaysAgo } } },
    { $group: { _id: "$status", total: { $sum: "$grandTotal" } } }
  ]).toArray();
  console.log('salesByStatusAgg:', salesAgg);

  const expAgg = await mongoose.connection.db.collection('expenses').aggregate([
    { $match: { expenseDate: { $gte: thirtyDaysAgo } } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } }
  ]).toArray();
  console.log('expensesByCategoryAgg:', expAgg);

  process.exit(0);
});
