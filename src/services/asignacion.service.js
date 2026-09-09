const Persona = require("../models/Persona");
const Actividad = require("../models/Actividad");

/**
 * Devuelve personas sugeridas para una actividad.
 *
 * Prioridad:
 * 1. Personas activas de la jurisdicción.
 * 2. Primero quienes nunca asistieron.
 * 3. Después quienes asistieron hace más tiempo.
 */
async function obtenerPersonasSugeridas(jurisdiccion, cantidad) {
  const personas = await Persona.find({
    activo: true,
    jurisdiccion
  });

  const personasConHistorial = [];

  for (const persona of personas) {
    const ultimaActividad = await Actividad.findOne({
      estado: "realizada",
      personas: {
        $elemMatch: {
          persona: persona._id,
          estado: "presente"
        }
      }
    })
      .sort({ fecha: -1 })
      .select("fecha nombre");

    personasConHistorial.push({
      persona,
      ultimaActividad
    });
  }

  personasConHistorial.sort((a, b) => {
    // Los que nunca asistieron van primero
    if (!a.ultimaActividad && b.ultimaActividad) {
      return -1;
    }

    if (a.ultimaActividad && !b.ultimaActividad) {
      return 1;
    }

    // Si ninguno asistió todavía, desempate alfabético
    if (!a.ultimaActividad && !b.ultimaActividad) {
      const apellido = a.persona.apellido.localeCompare(
        b.persona.apellido
      );

      if (apellido !== 0) return apellido;

      return a.persona.nombre.localeCompare(
        b.persona.nombre
      );
    }

    // Quien asistió hace más tiempo tiene prioridad
    return (
      new Date(a.ultimaActividad.fecha) -
      new Date(b.ultimaActividad.fecha)
    );
  });

  return personasConHistorial.slice(0, cantidad);
}


/**
 * Busca automáticamente el mejor reemplazo posible.
 *
 * Excluye:
 * - a la persona que sale;
 * - a las personas que ya forman parte del grupo.
 *
 * Mantiene el mismo criterio de rotación de la
 * asignación automática.
 */
async function obtenerReemplazoSugerido(
  jurisdiccion,
  personasExcluidas = []
) {
  const personas = await Persona.find({
    activo: true,
    jurisdiccion,
    _id: {
      $nin: personasExcluidas
    }
  });

  if (personas.length === 0) {
    return null;
  }

  const personasConHistorial = [];

  for (const persona of personas) {
    const ultimaActividad = await Actividad.findOne({
      estado: "realizada",
      personas: {
        $elemMatch: {
          persona: persona._id,
          estado: "presente"
        }
      }
    })
      .sort({ fecha: -1 })
      .select("fecha nombre");

    personasConHistorial.push({
      persona,
      ultimaActividad
    });
  }

  personasConHistorial.sort((a, b) => {
    if (!a.ultimaActividad && b.ultimaActividad) {
      return -1;
    }

    if (a.ultimaActividad && !b.ultimaActividad) {
      return 1;
    }

    if (!a.ultimaActividad && !b.ultimaActividad) {
      const apellido = a.persona.apellido.localeCompare(
        b.persona.apellido
      );

      if (apellido !== 0) return apellido;

      return a.persona.nombre.localeCompare(
        b.persona.nombre
      );
    }

    return (
      new Date(a.ultimaActividad.fecha) -
      new Date(b.ultimaActividad.fecha)
    );
  });

  return personasConHistorial[0];
}


async function guardarAsignacion(
  actividadId,
  personasSugeridas
) {
  const actividad = await Actividad.findById(
    actividadId
  );

  if (!actividad) {
    throw new Error("Actividad no encontrada");
  }

  actividad.personas = personasSugeridas.map(item => ({
    persona: item.persona._id,
    estado: "asignado"
  }));

  await actividad.save();

  return actividad;
}


module.exports = {
  obtenerPersonasSugeridas,
  obtenerReemplazoSugerido,
  guardarAsignacion
};