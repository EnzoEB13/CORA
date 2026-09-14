const mongoose = require("mongoose");

async function conectarDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4
    });

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error conectando MongoDB:", error.message);
    process.exit(1);
  }
}

module.exports = conectarDB;