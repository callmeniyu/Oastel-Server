require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log("MongoDB connected to database");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
