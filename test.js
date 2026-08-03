const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anikwitinstitute_db_user:anikwitinstitutegmailcom@d360crm.s0ebokd.mongodb.net/dit_pos?retryWrites=true&w=majority&appName=D360CRM')
.then(async () => {
  const ex = await mongoose.connection.db.collection('expenses').findOne();
  console.log('Expense:', ex);
  const sa = await mongoose.connection.db.collection('sales').findOne();
  console.log('Sale:', sa);
  const pr = await mongoose.connection.db.collection('products').findOne({});
  console.log('Product:', pr);
  process.exit(0);
});
