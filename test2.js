const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anikwitinstitute_db_user:anikwitinstitutegmailcom@d360crm.s0ebokd.mongodb.net/dit_pos?retryWrites=true&w=majority&appName=D360CRM')
.then(async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for(let c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(c.name, count);
  }
  process.exit(0);
});
