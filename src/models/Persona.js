const mongoose = require("mongoose");

const personaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    apellido: {
      type: String,
      required: true,
      trim: true
    },
    jurisdiccion: {
      type: Number,
      required: true
    },
    telefonoWhatsapp: {
      type: String,
      trim: true,
      default: undefined
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Solo los documentos que tengan teléfono participan del índice.
// Evita que el mismo número quede vinculado a dos personas.
personaSchema.index(
  { telefonoWhatsapp: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Persona", personaSchema);
