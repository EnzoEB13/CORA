const MovimientoCompensatorio = require("../models/MovimientoCompensatorio");
const Persona = require("../models/Persona");

async function acreditarCompensatorioPorActividad(
  actividadId,
  personasPresentes,
  cantidadMediosDias,
  fecha
) {
  const movimientos = [];

  // Si la actividad no da compensatorio, no creamos movimientos.
  if (!cantidadMediosDias || cantidadMediosDias <= 0) {
    return movimientos;
  }

  for (const item of personasPresentes) {
    const personaId = item.persona._id || item.persona;

    const existente = await MovimientoCompensatorio.findOne({
      persona: personaId,
      actividad: actividadId,
      motivo: "actividad"
    });

    // Ya fue acreditado anteriormente.
    if (existente) {
      continue;
    }

    try {
      const movimiento = await MovimientoCompensatorio.create({
        persona: personaId,
        tipo: "credito",
        cantidadMediosDias,
        motivo: "actividad",
        actividad: actividadId,
        fecha
      });

      movimientos.push(movimiento);
    } catch (error) {
      // Protección adicional por el índice único.
      if (error.code === 11000) {
        continue;
      }

      throw error;
    }
  }

  return movimientos;
}

async function agregarCompensatorioManual(
  personaId,
  cantidadMediosDias,
  observacion = ""
) {
  return await MovimientoCompensatorio.create({
    persona: personaId,
    tipo: "credito",
    cantidadMediosDias,
    motivo: "manual",
    fecha: new Date(),
    observacion
  });
}

async function usarCompensatorio(
  personaId,
  cantidadMediosDias,
  fecha,
  turno = null,
  observacion = ""
) {
  const saldo = await obtenerSaldoCompensatorio(personaId);

  if (saldo < cantidadMediosDias) {
    return {
      ok: false,
      saldo
    };
  }

  const movimiento = await MovimientoCompensatorio.create({
    persona: personaId,
    tipo: "debito",
    cantidadMediosDias,
    motivo: "uso_compensatorio",
    fecha,
    turno,
    observacion
  });

  return {
    ok: true,
    movimiento,
    saldoAnterior: saldo,
    saldoNuevo: saldo - cantidadMediosDias
  };
}

async function obtenerSaldoCompensatorio(personaId) {
  const movimientos = await MovimientoCompensatorio.find({
    persona: personaId
  });

  return movimientos.reduce((saldo, movimiento) => {
    if (movimiento.tipo === "credito") {
      return saldo + movimiento.cantidadMediosDias;
    }

    if (movimiento.tipo === "debito") {
      return saldo - movimiento.cantidadMediosDias;
    }

    return saldo;
  }, 0);
}

async function obtenerMovimientosCompensatorio(personaId) {
  return await MovimientoCompensatorio.find({
    persona: personaId
  })
    .sort({ fecha: -1, createdAt: -1 })
    .populate("actividad");
}


// ======================================================
// OBTENER SALDOS DE TODO EL PERSONAL
// ======================================================

async function obtenerSaldosCompensatorios() {
  const personas = await Persona.find({
    activo: true
  })
    .sort({
      apellido: 1,
      nombre: 1
    });

  if (personas.length === 0) {
    return [];
  }

  const idsPersonas = personas.map(
    persona => persona._id
  );

  const movimientos = await MovimientoCompensatorio.find({
    persona: {
      $in: idsPersonas
    }
  });

  const saldos = new Map();

  for (const movimiento of movimientos) {
    const personaId = movimiento.persona.toString();

    const saldoActual = saldos.get(personaId) || 0;

    if (movimiento.tipo === "credito") {
      saldos.set(
        personaId,
        saldoActual + movimiento.cantidadMediosDias
      );
    }

    if (movimiento.tipo === "debito") {
      saldos.set(
        personaId,
        saldoActual - movimiento.cantidadMediosDias
      );
    }
  }

  return personas.map(persona => ({
    persona,
    saldo: saldos.get(persona._id.toString()) || 0
  }));
}


module.exports = {
  acreditarCompensatorioPorActividad,
  agregarCompensatorioManual,
  usarCompensatorio,
  obtenerSaldoCompensatorio,
  obtenerMovimientosCompensatorio,
  obtenerSaldosCompensatorios
};