const mongoose = require("mongoose");

const movimientoCompensatorioSchema = new mongoose.Schema(
  {
    persona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Persona",
      required: true
    },

    tipo: {
      type: String,
      enum: ["credito", "debito"],
      required: true
    },

    cantidadMediosDias: {
      type: Number,
      required: true,
      min: 1
    },

    motivo: {
      type: String,
      enum: [
        "actividad",
        "manual",
        "uso_compensatorio"
      ],
      required: true
    },

    actividad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Actividad",
      default: null
    },

    fecha: {
      type: Date,
      required: true,
      default: Date.now
    },

    turno: {
      type: String,
      enum: ["mañana", "tarde", null],
      default: null
    },

    observacion: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

movimientoCompensatorioSchema.index(
  {
    persona: 1,
    actividad: 1,
    motivo: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      motivo: "actividad"
    }
  }
);

module.exports = mongoose.model(
  "MovimientoCompensatorio",
  movimientoCompensatorioSchema
);