const mongoose = require("mongoose");

const actividadSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },

    fecha: {
      type: Date,
      required: true
    },

    jurisdiccion: {
      type: Number,
      required: true
    },

    lugar: {
      type: String,
      required: true,
      trim: true
    },

    cantidadPersonas: {
      type: Number,
      required: true,
      min: 1
    },

    compensatorioMediosDias: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    estado: {
      type: String,
      enum: ["programada", "realizada", "cancelada"],
      default: "programada"
    },

    personas: [
      {
        persona: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Persona",
          required: true
        },

        estado: {
          type: String,
          enum: ["asignado", "presente", "ausente"],
          default: "asignado"
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Actividad", actividadSchema);