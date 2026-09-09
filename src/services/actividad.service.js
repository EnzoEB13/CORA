const Actividad = require("../models/Actividad");

async function crearActividad({
  nombre,
  fecha,
  jurisdiccion,
  lugar,
  cantidadPersonas,
  compensatorioMediosDias
}) {
  const actividad = await Actividad.create({
    nombre,
    fecha,
    jurisdiccion,
    lugar,
    cantidadPersonas,
    compensatorioMediosDias,
    estado: "programada",
    personas: []
  });

  return actividad;
}

async function listarActividadesProgramadas() {
  return await Actividad.find({
    estado: "programada"
  }).sort({ fecha: 1 });
}

async function buscarActividadPorId(id) {
  return await Actividad.findById(id)
    .populate("personas.persona");
}

async function obtenerProximaActividad() {
  return await Actividad.findOne({
    estado: "programada"
  })
    .sort({ fecha: 1 })
    .populate("personas.persona");
}


// ======================================================
// ACTIVIDADES PENDIENTES DE ASISTENCIA
// ======================================================

async function listarActividadesPendientesAsistencia() {
  const actividades = await Actividad.find({
    estado: "programada",
    "personas.0": {
      $exists: true
    }
  })
    .sort({
      fecha: 1,
      jurisdiccion: 1,
      nombre: 1
    })
    .populate("personas.persona");

  return actividades;
}


// ======================================================
// PREPARAR ASISTENCIA
// ======================================================

async function prepararAsistencia(
  actividadId,
  nombresAusentes
) {
  const actividad = await Actividad.findById(
    actividadId
  ).populate("personas.persona");

  if (!actividad) {
    throw new Error("Actividad no encontrada");
  }

  if (actividad.estado !== "programada") {
    throw new Error(
      "La actividad ya no está pendiente de asistencia"
    );
  }

  if (!actividad.personas.length) {
    throw new Error(
      "La actividad no tiene personal asignado"
    );
  }

  const normalizar = texto =>
    texto
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

  const ausentesNormalizados =
    nombresAusentes.map(normalizar);

  const personas = actividad.personas.map(item => {
    const nombreCompleto =
      `${item.persona.nombre} ${item.persona.apellido}`;

    const ausente =
      ausentesNormalizados.includes(
        normalizar(nombreCompleto)
      );

    return {
      persona: item.persona,
      estado: ausente ? "ausente" : "presente"
    };
  });

  return {
    actividad,
    personas
  };
}


// ======================================================
// CONFIRMAR ASISTENCIA
// ======================================================

async function confirmarAsistencia(
  actividadId,
  personas
) {
  const actividad = await Actividad.findById(
    actividadId
  );

  if (!actividad) {
    throw new Error("Actividad no encontrada");
  }

  if (actividad.estado !== "programada") {
    throw new Error(
      "La actividad ya no está pendiente de asistencia"
    );
  }

  actividad.personas = personas.map(item => ({
    persona: item.persona._id || item.persona,
    estado: item.estado
  }));

  actividad.estado = "realizada";

  await actividad.save();

  return actividad;
}


// ======================================================
// CANCELAR ACTIVIDAD
// ======================================================

async function cancelarActividad(actividadId) {
  const actividad = await Actividad.findById(
    actividadId
  );

  if (!actividad) {
    return {
      ok: false,
      motivo: "no_encontrada"
    };
  }

  if (actividad.estado !== "programada") {
    return {
      ok: false,
      motivo: "estado_invalido",
      estado: actividad.estado,
      actividad
    };
  }

  actividad.estado = "cancelada";

  await actividad.save();

  return {
    ok: true,
    actividad
  };
}

async function buscarActividadSinAsignar() {
  return await Actividad.findOne({
    estado: "programada",
    "personas.0": {
      $exists: false
    }
  }).sort({ fecha: 1 });
}


module.exports = {
  crearActividad,
  listarActividadesProgramadas,
  buscarActividadPorId,
  obtenerProximaActividad,
  listarActividadesPendientesAsistencia,
  buscarActividadSinAsignar,
  prepararAsistencia,
  confirmarAsistencia,
  cancelarActividad
};