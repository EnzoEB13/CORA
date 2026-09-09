const {
  crearPersona,
  listarPersonas,
  buscarPersonaPorNombre,
  buscarPersonaPorNombreCompleto,
  buscarPersonasPorTexto
} = require("./persona.service");

const {
  crearActividad,
  listarActividadesProgramadas,
  buscarActividadPorId,
  obtenerProximaActividad,
  listarActividadesPendientesAsistencia,
  buscarActividadSinAsignar,
  prepararAsistencia,
  confirmarAsistencia,
  cancelarActividad
} = require("./actividad.service");

const {
  textoAmediosDias,
  mediosDiasATexto
} = require("../utils/compensatorio.utils");

const {
  obtenerPersonasSugeridas,
  obtenerReemplazoSugerido,
  guardarAsignacion
} = require("./asignacion.service");

const {
  acreditarCompensatorioPorActividad,
  agregarCompensatorioManual,
  obtenerSaldoCompensatorio,
  obtenerSaldosCompensatorios,
  obtenerMovimientosCompensatorio,
  usarCompensatorio
} = require("./compensatorio.service");

const {
  normalizarTexto,
  esAfirmacion,
  esMensajeDeAusencia,
  extraerTextoAusentes,
  esAsistenciaCompleta
} = require("../utils/texto.utils");


// ======================================================
// CONFIRMACIONES PENDIENTES POR NÚMERO DE WHATSAPP
// ======================================================

const asignacionesPendientes = new Map();
const asistenciasPendientes = new Map();
const compensatoriosPendientes = new Map();
const compensatoriosManualesPendientes = new Map();
const cancelacionesPendientes = new Map();
const actividadesAsistenciaSeleccionadas = new Map();
const reemplazosExcepcionalesPendientes = new Map();


// Procesa los mensajes recibidos y decide qué responder.
async function procesarMensaje(texto, numero) {

  let textoNormalizado = normalizarTexto(texto);


  // ======================================================
  // CONFIRMACIÓN NATURAL
  // Permite: si, sí, dale, ok, confirmo, perfecto...
  // ======================================================

  if (esAfirmacion(textoNormalizado)) {

    // La excepción de jurisdicción tiene prioridad porque
    // también existe una asignación pendiente al mismo tiempo.
    if (reemplazosExcepcionalesPendientes.has(numero)) {

      textoNormalizado = "si";

    } else {

      const accionesPendientes = [];

      if (asignacionesPendientes.has(numero)) {
        accionesPendientes.push({
          comando: "confirmar asignacion",
          nombre: "la asignación de personal"
        });
      }

      if (asistenciasPendientes.has(numero)) {
        accionesPendientes.push({
          comando: "confirmar asistencia",
          nombre: "la asistencia"
        });
      }

      if (compensatoriosPendientes.has(numero)) {
        accionesPendientes.push({
          comando: "confirmar compensatorio",
          nombre: "el uso de compensatorio"
        });
      }

      if (compensatoriosManualesPendientes.has(numero)) {
        accionesPendientes.push({
          comando: "confirmar compensatorio manual",
          nombre: "la carga manual de compensatorio"
        });
      }

      if (cancelacionesPendientes.has(numero)) {
        accionesPendientes.push({
          comando: "confirmar cancelacion",
          nombre: "la cancelación de actividad"
        });
      }

      if (accionesPendientes.length === 1) {

        textoNormalizado = accionesPendientes[0].comando;

      } else if (accionesPendientes.length > 1) {

        const lista = accionesPendientes
          .map(
            (accion, index) =>
              `${index + 1}. ${accion.nombre}`
          )
          .join("\n");

        return (
          "🤔 Hay más de una acción pendiente.\n\n" +
          lista +
          "\n\nDecime cuál querés confirmar."
        );

      } else {

        return (
          "No tengo ninguna acción pendiente para confirmar."
        );
      }
    }
  }


  // ======================================================
  // HOLA
  // ======================================================

  if (textoNormalizado === "hola") {

    return (
      "👋 ¡Hola! Soy CORA 🤖\n" +
      "👥 Tu asistente para la organización y gestión de actividades.\n\n" +

      "Estoy lista para ayudarte con actividades, asignaciones, asistencias y compensatorios.\n\n" +
      
      "📋 Escribí “menú” para ver todo lo que puedo hacer."
    );

  }


  // ======================================================
  // AYUDA / LISTA DE COMANDOS
  // ======================================================

  if (
    textoNormalizado === "ayuda" ||
    textoNormalizado === "comandos" ||
    textoNormalizado === "menu" ||
    textoNormalizado === "menú"
  ) {

    return (

      "🤖 GESTOR DE ACTIVIDADES\n\n" +

      "👥 PERSONAL\n" +

      "• Crear persona\n" +
      "  crear persona Enzo Brito jurisdiccion 5\n\n" +

      "• Listar personal\n" +
      "  listar personas\n\n" +

      "📅 ACTIVIDADES\n" +

      "ℹ️ Antes de crear otra actividad, la anterior debe tener personal asignado.\n\n" +

      "• Crear actividad\n" +
      "  crear actividad Operativo San Francisco\n" +
      "  fecha 10/9/2026\n" +
      "  jurisdiccion 5\n" +
      "  lugar SUM San Francisco\n" +
      "  personas 4\n" +
      "  compensatorio 1 dia\n\n" +

      "• Ver actividades programadas\n" +
      "  listar actividades\n\n" +

      "• Ver próxima actividad\n" +
      "  ver actividad\n\n" +

      "👥 ASIGNACIÓN\n" +

      "• Asignar personal automáticamente\n" +
      "  asignar personal\n\n" +

      "• Confirmar la asignación\n" +
      "  confirmar asignación\n\n" +

      "• Cambiar persona automáticamente\n" +
      "  cambiar Enzo Brito\n\n" +

      "• Cambiar persona manualmente\n" +
      "  cambiar Enzo Brito por Carlos Gomez\n\n" +

      "✅ ASISTENCIA\n" +

      "• Ver actividades pendientes de asistencia\n" +
      "  asistencia\n\n" +

      "• Seleccionar una actividad\n" +
      "  actividad 2\n\n" +

      "• Indicar quién faltó\n" +
      "  faltaron Enzo Brito y Carlos Gomez\n\n" +

      "• Si asistieron todos\n" +
      "  fueron todos\n\n" +

      "• Confirmar asistencia\n" +
      "  confirmar asistencia\n\n" +

      "🕐 COMPENSATORIOS\n" +

      "• Consultar saldo\n" +
      "  cuanto compensatorio tiene Enzo Brito\n\n" +

      "• Ver saldos de todo el personal\n" +
      "  listar compensatorios\n\n" +

      "• Ver historial de una persona\n" +
      "  ver compensatorios Enzo Brito\n\n" +

      "• Agregar compensatorio manual\n" +
      "  agregar medio día a Enzo Brito\n" +
      "  agregar 1 día a Enzo Brito motivo trabajo extra\n\n" +

      "• Confirmar carga manual\n" +
      "  confirmar compensatorio manual\n\n" +

      "• Usar compensatorio\n" +
      "  Enzo Brito se toma medio día mañana turno mañana\n" +
      "  Enzo Brito se toma 1 día el 10/9/2026\n\n" +

      "• Ver historial de una persona\n" +
      "  ver compensatorios de Enzo Brito\n\n" +

      "• Confirmar uso\n" +
      "  confirmar compensatorio\n\n" +

      "❌ CANCELAR ACTIVIDAD\n" +

      "• Preparar cancelación\n" +
      "  cancelar actividad\n\n" +

      "• Confirmar cancelación\n" +
      "  confirmar cancelación\n\n" +

      "ℹ️ Podés volver a ver este menú escribiendo:\n" +
      "ayuda"

    );

  }


  // ======================================================
  // CREAR PERSONA
  // ======================================================

  if (textoNormalizado.startsWith("crear persona ")) {

    const partes = texto.trim().split(" ");

    const indiceJurisdiccion = partes.findIndex(p =>
      p.toLowerCase().startsWith("jurisdic")
    );

    if (indiceJurisdiccion === -1) {

      return (
        "Formato incorrecto.\n\n" +
        "Ejemplo:\n" +
        "crear persona Enzo Brito jurisdiccion 5"
      );

    }

    const nombre = partes[2];

    const apellido = partes
      .slice(3, indiceJurisdiccion)
      .join(" ");

    const jurisdiccion = Number(
      partes[indiceJurisdiccion + 1]
    );

    if (!nombre || !apellido || !jurisdiccion) {

      return (
        "Formato incorrecto.\n\n" +
        "Ejemplo:\n" +
        "crear persona Enzo Brito jurisdiccion 5"
      );

    }

    const resultado = await crearPersona(
      nombre,
      apellido,
      jurisdiccion
    );

    if (!resultado.ok) {

      return (
        "⚠️ Esa persona ya está registrada.\n\n" +
        `${resultado.persona.nombre} ${resultado.persona.apellido}\n` +
        `Jurisdicción: ${resultado.persona.jurisdiccion}`
      );

    }

    const persona = resultado.persona;

    return (
      "✅ Persona registrada\n\n" +
      `${persona.nombre} ${persona.apellido}\n` +
      `Jurisdicción: ${persona.jurisdiccion}`
    );

  }


  // ======================================================
  // LISTAR PERSONAS
  // ======================================================

  if (textoNormalizado === "listar personas") {

    const personas = await listarPersonas();

    if (personas.length === 0) {

      return "No hay personas registradas todavía.";

    }

    const lista = personas
      .map(
        (persona, index) =>
          `${index + 1}. ${persona.nombre} ${persona.apellido} - Jurisdicción ${persona.jurisdiccion}`
      )
      .join("\n");

    return "👥 Personal registrado:\n\n" + lista;

  }


  // ======================================================
  // CREAR ACTIVIDAD
  // ======================================================

  if (textoNormalizado.startsWith("crear actividad")) {

    const actividadSinAsignar =
      await buscarActividadSinAsignar();

    if (actividadSinAsignar) {

      const fecha = new Date(
        actividadSinAsignar.fecha
      );

      const fechaTexto =
        `${fecha.getDate()}/` +
        `${fecha.getMonth() + 1}/` +
        `${fecha.getFullYear()}`;

      return (
        "⚠️ Hay una actividad pendiente de asignación.\n\n" +
        `📌 ${actividadSinAsignar.nombre}\n` +
        `📅 ${fechaTexto}\n` +
        `🏢 J${actividadSinAsignar.jurisdiccion}\n` +
        `📍 ${actividadSinAsignar.lugar}\n` +
        `👥 Personal necesario: ${actividadSinAsignar.cantidadPersonas}\n\n` +
        "Antes de crear otra actividad, asignale personal.\n\n" +
        "Escribí:\n" +
        "asignar personal"
      );

    }

    const lineas = texto
      .split("\n")
      .map(linea => linea.trim())
      .filter(Boolean);

    const nombre = lineas[0]
      .replace(/^crear actividad/i, "")
      .trim();

    const lineaFecha = lineas.find(l =>
      l.toLowerCase().startsWith("fecha ")
    );

    const lineaJurisdiccion = lineas.find(
      l =>
        l.toLowerCase().startsWith("jurisdiccion ") ||
        l.toLowerCase().startsWith("jurisdicción ")
    );

    const lineaLugar = lineas.find(l =>
      l.toLowerCase().startsWith("lugar ")
    );

    const lineaPersonas = lineas.find(l =>
      l.toLowerCase().startsWith("personas ")
    );

    const lineaCompensatorio = lineas.find(l =>
      l.toLowerCase().startsWith("compensatorio ")
    );

    if (
      !nombre ||
      !lineaFecha ||
      !lineaJurisdiccion ||
      !lineaLugar ||
      !lineaPersonas ||
      !lineaCompensatorio
    ) {

      return (
        "Formato incorrecto.\n\n" +
        "Ejemplo:\n\n" +
        "Crear actividad Operativo San Francisco\n" +
        "fecha 5/9/2026\n" +
        "jurisdiccion 5\n" +
        "lugar SUM San Francisco\n" +
        "personas 4\n" +
        "compensatorio 1 dia"
      );

    }


    // FECHA

    const fechaTexto = lineaFecha
      .replace(/^fecha /i, "")
      .trim();

    const partesFecha = fechaTexto.split("/");

    if (partesFecha.length !== 3) {

      return (
        "⚠️ La fecha debe tener formato día/mes/año. " +
        "Ejemplo: 5/9/2026"
      );

    }

    const dia = Number(partesFecha[0]);
    const mes = Number(partesFecha[1]);
    const anio = Number(partesFecha[2]);

    const fecha = new Date(
      anio,
      mes - 1,
      dia
    );

    if (
      fecha.getFullYear() !== anio ||
      fecha.getMonth() !== mes - 1 ||
      fecha.getDate() !== dia
    ) {

      return "⚠️ La fecha ingresada no es válida.";

    }


    // JURISDICCIÓN

    const jurisdiccion = Number(
      lineaJurisdiccion
        .replace(/^jurisdicci[oó]n /i, "")
        .trim()
    );


    // LUGAR

    const lugar = lineaLugar
      .replace(/^lugar /i, "")
      .trim();


    // CANTIDAD DE PERSONAS

    const cantidadPersonas = Number(
      lineaPersonas
        .replace(/^personas /i, "")
        .trim()
    );


    // COMPENSATORIO

    const compensatorioTexto =
      lineaCompensatorio
        .replace(/^compensatorio /i, "")
        .trim();

    const compensatorioMediosDias =
      textoAmediosDias(
        compensatorioTexto
      );


    if (!jurisdiccion || jurisdiccion < 1) {

      return (
        "⚠️ La jurisdicción ingresada no es válida."
      );

    }

    if (!lugar) {

      return (
        "⚠️ Tenés que indicar el lugar de la actividad."
      );

    }

    if (
      !cantidadPersonas ||
      cantidadPersonas < 1
    ) {

      return (
        "⚠️ La cantidad de personas debe ser mayor a 0."
      );

    }

    if (compensatorioMediosDias === null) {

      return (
        "⚠️ No entendí el compensatorio.\n\n" +
        "Podés escribir, por ejemplo:\n" +
        "• medio dia\n" +
        "• 1 dia\n" +
        "• un dia y medio\n" +
        "• 2 dias"
      );

    }


    const actividad = await crearActividad({
      nombre,
      fecha,
      jurisdiccion,
      lugar,
      cantidadPersonas,
      compensatorioMediosDias
    });


    return (
      "✅ Actividad creada\n\n" +
      `📌 ${actividad.nombre}\n` +
      `📅 ${dia}/${mes}/${anio}\n` +
      `📍 ${actividad.lugar}\n` +
      `🏢 Jurisdicción: ${actividad.jurisdiccion}\n` +
      `👥 Personas necesarias: ${actividad.cantidadPersonas}\n` +
      `🕐 Compensatorio: ${mediosDiasATexto(
        actividad.compensatorioMediosDias
      )}`
    );

  }


  // ======================================================
  // PREPARAR CANCELACIÓN DE ACTIVIDAD
  // ======================================================

  if (textoNormalizado === "cancelar actividad") {

    const actividad =
      await obtenerProximaActividad();

    if (!actividad) {

      return (
        "⚠️ No hay actividades programadas para cancelar."
      );

    }

    const fecha = new Date(
      actividad.fecha
    );

    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;

    cancelacionesPendientes.set(
      numero,
      {
        actividadId: actividad._id
      }
    );

    const cantidadAsignados =
      actividad.personas?.length || 0;

    return (
      "⚠️ Cancelar actividad\n\n" +
      `📌 ${actividad.nombre}\n` +
      `📅 ${fechaTexto}\n` +
      `📍 ${actividad.lugar}\n` +
      `🏢 Jurisdicción: ${actividad.jurisdiccion}\n` +
      `👥 Personas asignadas: ${cantidadAsignados}\n\n` +
      "¿Seguro que querés cancelar esta actividad?\n\n" +
      "Respondé: confirmar cancelación"
    );

  }


  // ======================================================
  // CONFIRMAR CANCELACIÓN DE ACTIVIDAD
  // ======================================================

  if (
    textoNormalizado === "confirmar cancelación" ||
    textoNormalizado === "confirmar cancelacion"
  ) {

    const pendiente =
      cancelacionesPendientes.get(numero);

    if (!pendiente) {

      return (
        "⚠️ No hay ninguna cancelación " +
        "pendiente para confirmar."
      );

    }

    const resultado =
      await cancelarActividad(
        pendiente.actividadId
      );

    cancelacionesPendientes.delete(
      numero
    );

    if (!resultado.ok) {

      if (
        resultado.motivo ===
        "no_encontrada"
      ) {

        return (
          "⚠️ La actividad ya no existe."
        );

      }

      if (
        resultado.motivo ===
        "estado_invalido"
      ) {

        return (
          "⚠️ La actividad ya no puede cancelarse.\n\n" +
          `Estado actual: ${resultado.estado}`
        );

      }

      return (
        "⚠️ No se pudo cancelar la actividad."
      );

    }

    const actividad =
      resultado.actividad;

    const fecha = new Date(
      actividad.fecha
    );

    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;

    return (
      "✅ Actividad cancelada\n\n" +
      `📌 ${actividad.nombre}\n` +
      `📅 ${fechaTexto}\n` +
      `📍 ${actividad.lugar}\n\n` +
      "La actividad quedó guardada en el historial " +
      "con estado cancelada."
    );

  }


  // ======================================================
  // LISTAR ACTIVIDADES
  // ======================================================

  if (
  [
    "listar actividades",
    "listar actividad",
    "lista de actividades",
    "lista de actividad",
    "ver actividades",
    "ver las actividades",
    "mostrar actividades",
    "mostrar las actividades",
    "actividades",
    "actividades programadas",
    "ver actividades programadas",
    "que actividades hay",
    "que actividades tenemos",
    "cuales son las actividades",
    "cuales son las actividades programadas"
  ].includes(textoNormalizado)
) {

    const actividades =
      await listarActividadesProgramadas();

    if (actividades.length === 0) {

      return "❌​ No hay actividades programadas.";

    }

    const lista = actividades
      .map((actividad, index) => {

        const fecha =
          new Date(actividad.fecha);

        const fechaTexto =
          `${fecha.getDate()}/` +
          `${fecha.getMonth() + 1}/` +
          `${fecha.getFullYear()}`;

        const asignados =
          actividad.personas?.length || 0;

        return (
          `${index + 1}. ${actividad.nombre}\n` +
          `📅 ${fechaTexto}\n` +
          `🏢 J${actividad.jurisdiccion}\n` +
          `📍 ${actividad.lugar}\n` +
          `👥 ${asignados}/${actividad.cantidadPersonas} asignados`
        );

      })
      .join("\n\n");

    return (
      "📅 ACTIVIDADES PROGRAMADAS\n\n" +
      lista
    );

  }


  // ======================================================
  // VER ACTIVIDAD
  // ======================================================

  if (textoNormalizado === "ver actividad") {

    const actividad =
      await obtenerProximaActividad();

    if (!actividad) {

      return "❌​ No hay actividades programadas.";

    }

    const fecha =
      new Date(actividad.fecha);

    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;

    let personalTexto =
      "​⚠️ Todavía no tiene personal asignado.";

    if (
      actividad.personas &&
      actividad.personas.length > 0
    ) {

      personalTexto =
        actividad.personas
          .map((item, index) => {

            const persona =
              item.persona;

            if (!persona) {
              return (
                `${index + 1}. Persona no encontrada`
              );
            }

            return (
              `${index + 1}. ` +
              `${persona.nombre} ${persona.apellido}` +
              ` - ${item.estado}`
            );

          })
          .join("\n");

    }

    return (
      "📌 ACTIVIDAD\n\n" +
      `Nombre: ${actividad.nombre}\n` +
      `📅 Fecha: ${fechaTexto}\n` +
      `📍 Lugar: ${actividad.lugar}\n` +
      `🏢 Jurisdicción: ${actividad.jurisdiccion}\n` +
      `👥 Personas necesarias: ${actividad.cantidadPersonas}\n` +
      `🕐 Compensatorio: ${mediosDiasATexto(
        actividad.compensatorioMediosDias
      )}\n\n` +
      "👥 Personal:\n" +
      personalTexto
    );

  }


  // ======================================================
  // VER ACTIVIDAD POR NÚMERO
  //
  // Ejemplo:
  // ver actividad 2
  // ======================================================

  if (
    /^ver actividad \d+$/.test(
      textoNormalizado
    )
  ) {

    const numeroActividad =
      Number(
        textoNormalizado
          .replace("ver actividad ", "")
          .trim()
      );

    const actividades =
      await listarActividadesProgramadas();

    if (
      numeroActividad < 1 ||
      numeroActividad > actividades.length
    ) {

      return (
        "⚠️ Ese número de actividad no existe.\n\n" +
        "Escribí:\n" +
        "listar actividades o ver actividades"
      );

    }

    const actividadBase =
      actividades[numeroActividad - 1];

    const actividad =
      await buscarActividadPorId(
        actividadBase._id
      );

    if (!actividad) {

      return "⚠️ No encontré esa actividad.";

    }

    const fecha =
      new Date(actividad.fecha);

    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;

    let personalTexto =
      "Todavía no tiene personal asignado.";

    if (
      actividad.personas &&
      actividad.personas.length > 0
    ) {

      personalTexto =
        actividad.personas
          .map((item, index) => {

            const persona =
              item.persona;

            if (!persona) {
              return (
                `${index + 1}. Persona no encontrada`
              );
            }

            return (
              `${index + 1}. ` +
              `${persona.nombre} ${persona.apellido}` +
              ` - ${item.estado}`
            );

          })
          .join("\n");

    }

    return (
      "📌 ACTIVIDAD\n\n" +
      `Nombre: ${actividad.nombre}\n` +
      `📅 Fecha: ${fechaTexto}\n` +
      `📍 Lugar: ${actividad.lugar}\n` +
      `🏢 Jurisdicción: ${actividad.jurisdiccion}\n` +
      `👥 Personas necesarias: ${actividad.cantidadPersonas}\n` +
      `🕐 Compensatorio: ${mediosDiasATexto(
        actividad.compensatorioMediosDias
      )}\n\n` +
      "👥 Personal:\n" +
      personalTexto
    );

  }


  // ======================================================
  // ASIGNAR PERSONAL
  // ======================================================

if (
  [
    "asignar personal",
    "asigna personal",
    "asigname personal",
    "asignar personas",
    "hacer asignacion",
    "hacer la asignacion",
    "armar grupo",
    "armar el grupo",
    "arma el grupo",
    "asignar grupo",
    "asigna gente",
    "elegir personal",
    "seleccionar personal",
    "generar asignacion"
  ].includes(textoNormalizado)
) {

    const actividad =
      await buscarActividadSinAsignar();

    if (!actividad) {

      return (
        "✅ No hay ninguna actividad pendiente de asignación.\n\n" +
        "Todas las actividades programadas ya tienen personal asignado."
      );

    }

    const sugeridos =
      await obtenerPersonasSugeridas(
        actividad.jurisdiccion,
        actividad.cantidadPersonas
      );

    if (sugeridos.length === 0) {

      return (
        "⚠️ No hay personal disponible en la jurisdicción " +
        actividad.jurisdiccion
      );

    }

    if (
      sugeridos.length <
      actividad.cantidadPersonas
    ) {

      return (
        "⚠️ No hay suficiente personal disponible.\n\n" +
        `La actividad necesita: ${actividad.cantidadPersonas}\n` +
        `Disponibles en J${actividad.jurisdiccion}: ${sugeridos.length}`
      );

    }

    const lista = sugeridos
      .map((item, index) => {

        let historial =
          "Nunca asistió a una actividad";

        if (item.ultimaActividad) {

          const fecha =
            new Date(
              item.ultimaActividad.fecha
            );

          historial =
            "Última asistencia: " +
            `${fecha.getDate()}/` +
            `${fecha.getMonth() + 1}/` +
            `${fecha.getFullYear()}`;

        }

        return (
          `${index + 1}. ` +
          `${item.persona.nombre} ${item.persona.apellido}\n` +
          `   ${historial}`
        );

      })
      .join("\n\n");

    asignacionesPendientes.set(
      numero,
      {
        actividadId: actividad._id,
        sugeridos
      }
    );

    const fecha =
      new Date(actividad.fecha);

    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;

    return (
      "👥 ASIGNACIÓN PROPUESTA\n\n" +
      `📌 ${actividad.nombre}\n` +
      `📅 ${fechaTexto}\n` +
      `🏢 Jurisdicción: ${actividad.jurisdiccion}\n` +
      `👥 Personas necesarias: ${actividad.cantidadPersonas}\n\n` +
      lista +
      "\n\n" +
      "Para guardar esta asignación escribí:\n" +
      "confirmar asignación\n\n" +
      "Si querés cambiar a alguien:\n" +
      "cambiar Nombre Apellido"
    );

  }


  // ======================================================
  // CAMBIAR PERSONA DE LA ASIGNACIÓN PENDIENTE
  //
  // Ejemplos:
  //
  // cambiar Enzo Brito
  //
  // cambiar Enzo Brito por Carlos Gomez
  // ======================================================

  if (
    textoNormalizado.startsWith("cambiar ")
  ) {

    const pendiente =
      asignacionesPendientes.get(numero);

    if (!pendiente) {

      return (
        "⚠️ No hay ninguna asignación pendiente.\n\n" +
        "Primero escribí:\n" +
        "asignar personal"
      );

    }

    const actividad =
      await buscarActividadPorId(
        pendiente.actividadId
      );

    if (!actividad) {

      asignacionesPendientes.delete(
        numero
      );

      return (
        "⚠️ La actividad ya no existe."
      );

    }

    const textoCambio = texto
      .trim()
      .replace(/^cambiar\s+/i, "")
      .trim();

    if (!textoCambio) {

      return (
        "⚠️ Indicá a quién querés cambiar.\n\n" +
        "Ejemplo:\n" +
        "cambiar Enzo Brito"
      );

    }


    // ====================================================
    // CAMBIO MANUAL:
    // cambiar Enzo Brito por Carlos Gomez
    // ====================================================

    const partesCambio =
      textoCambio.split(/\s+por\s+/i);

    if (partesCambio.length === 2) {

      const nombreSale =
        partesCambio[0].trim();

      const nombreEntra =
        partesCambio[1].trim();

      if (
        !nombreSale ||
        !nombreEntra
      ) {

        return (
          "⚠️ No entendí el cambio.\n\n" +
          "Ejemplo:\n" +
          "cambiar Enzo Brito por Carlos Gomez"
        );

      }


      // Buscar a la persona que sale
      // solamente dentro de la asignación pendiente.

      const personasAsignadas =
        pendiente.sugeridos.map(
          item => item.persona
        );

      const busquedaSale =
        await buscarPersonasPorTexto(
          nombreSale,
          personasAsignadas
        );

      if (
        busquedaSale.estado === "ninguna"
      ) {

        return (
          `⚠️ "${nombreSale}" no forma parte ` +
          "de la asignación propuesta."
        );

      }

      if (
        busquedaSale.estado === "multiple"
      ) {

        const opciones =
          busquedaSale.coincidencias
            .map(
              (persona, index) =>
                `${index + 1}. ${persona.nombre} ${persona.apellido}`
            )
            .join("\n");

        return (
          `🤔 Encontré más de una persona para "${nombreSale}".\n\n` +
          opciones +
          "\n\nIndicame el nombre completo."
        );

      }

      const personaSale =
        busquedaSale.persona;


      // Buscar a la persona que entra en todo
      // el personal activo.

      const busquedaEntra =
        await buscarPersonasPorTexto(
          nombreEntra
        );

      if (
        busquedaEntra.estado === "ninguna"
      ) {

        return (
          `⚠️ No encontré a "${nombreEntra}" ` +
          "entre el personal activo."
        );

      }

      if (
        busquedaEntra.estado === "multiple"
      ) {

        const opciones =
          busquedaEntra.coincidencias
            .map(
              (persona, index) =>
                `${index + 1}. ${persona.nombre} ${persona.apellido}`
            )
            .join("\n");

        return (
          `🤔 Encontré más de una persona para "${nombreEntra}".\n\n` +
          opciones +
          "\n\nIndicame un poco más del nombre."
        );

      }

      const personaEntra =
        busquedaEntra.persona;


      // No permitimos que la persona entrante
      // ya esté en el grupo.

      const yaAsignada =
        pendiente.sugeridos.some(
          item =>
            item.persona._id.toString() ===
            personaEntra._id.toString()
        );

      if (yaAsignada) {

        return (
          `⚠️ ${personaEntra.nombre} ${personaEntra.apellido} ` +
          "ya forma parte de la asignación."
        );

      }


      // ==================================================
      // EXCEPCIÓN DE JURISDICCIÓN
      // ==================================================

      if (
        personaEntra.jurisdiccion !==
        actividad.jurisdiccion
      ) {

        reemplazosExcepcionalesPendientes.set(
          numero,
          {
            personaSaleId:
              personaSale._id,
            personaEntra,
            actividadId:
              actividad._id
          }
        );

        return (
          `⚠️ ${personaEntra.nombre} ${personaEntra.apellido} ` +
          `pertenece a la jurisdicción ${personaEntra.jurisdiccion}.\n\n` +
          `Esta actividad corresponde a la jurisdicción ${actividad.jurisdiccion}.\n\n` +
          "¿Querés asignarlo igualmente como excepción?\n\n" +
          "Respondé:\n" +
          "SI"
        );

      }


      // ==================================================
      // CAMBIO MANUAL NORMAL
      // ==================================================

      const indice =
        pendiente.sugeridos.findIndex(
          item =>
            item.persona._id.toString() ===
            personaSale._id.toString()
        );

      if (indice === -1) {

        return (
          "⚠️ No pude encontrar a la persona " +
          "dentro de la asignación pendiente."
        );

      }

      pendiente.sugeridos[indice] = {
        persona: personaEntra,
        ultimaActividad: null
      };

      asignacionesPendientes.set(
        numero,
        pendiente
      );

      const nuevaLista =
        pendiente.sugeridos
          .map(
            (item, index) =>
              `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}`
          )
          .join("\n");

      return (
        "🔄 Cambio realizado en la propuesta\n\n" +
        `${personaSale.nombre} ${personaSale.apellido}\n` +
        "⬇️ sale\n\n" +
        `${personaEntra.nombre} ${personaEntra.apellido}\n` +
        "⬆️ entra\n\n" +
        "👥 Nueva asignación:\n\n" +
        nuevaLista +
        "\n\n" +
        "Para guardarla escribí:\n" +
        "confirmar asignación"
      );

    }


    // ====================================================
    // CAMBIO AUTOMÁTICO
    // cambiar Enzo Brito
    // ====================================================

    const personasAsignadas =
      pendiente.sugeridos.map(
        item => item.persona
      );

    const busquedaSale =
      await buscarPersonasPorTexto(
        textoCambio,
        personasAsignadas
      );

    if (
      busquedaSale.estado === "ninguna"
    ) {

      return (
        `⚠️ "${textoCambio}" no forma parte ` +
        "de la asignación propuesta."
      );

    }

    if (
      busquedaSale.estado === "multiple"
    ) {

      const opciones =
        busquedaSale.coincidencias
          .map(
            (persona, index) =>
              `${index + 1}. ${persona.nombre} ${persona.apellido}`
          )
          .join("\n");

      return (
        `🤔 Encontré más de una persona para "${textoCambio}".\n\n` +
        opciones +
        "\n\nIndicame el nombre completo."
      );

    }

    const personaSale =
      busquedaSale.persona;

    const idsExcluidos =
      pendiente.sugeridos.map(
        item => item.persona._id
      );

    const reemplazo =
      await obtenerReemplazoSugerido(
        actividad.jurisdiccion,
        idsExcluidos
      );

    if (!reemplazo) {

      return (
        "⚠️ No hay otra persona disponible " +
        `en la jurisdicción ${actividad.jurisdiccion}.`
      );

    }

    const indice =
      pendiente.sugeridos.findIndex(
        item =>
          item.persona._id.toString() ===
          personaSale._id.toString()
      );

    if (indice === -1) {

      return (
        "⚠️ No pude encontrar a la persona " +
        "dentro de la asignación pendiente."
      );

    }

    pendiente.sugeridos[indice] =
      reemplazo;

    asignacionesPendientes.set(
      numero,
      pendiente
    );

    const nuevaLista =
      pendiente.sugeridos
        .map(
          (item, index) =>
            `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}`
        )
        .join("\n");

    return (
      "🔄 Reemplazo sugerido\n\n" +
      `${personaSale.nombre} ${personaSale.apellido}\n` +
      "⬇️ sale\n\n" +
      `${reemplazo.persona.nombre} ${reemplazo.persona.apellido}\n` +
      "⬆️ entra\n\n" +
      "👥 Nueva asignación:\n\n" +
      nuevaLista +
      "\n\n" +
      "Para guardarla escribí:\n" +
      "confirmar asignación"
    );

  }


  // ======================================================
  // CONFIRMAR EXCEPCIÓN DE JURISDICCIÓN
  // ======================================================

  if (
    textoNormalizado === "si" &&
    reemplazosExcepcionalesPendientes.has(
      numero
    )
  ) {

    const excepcion =
      reemplazosExcepcionalesPendientes.get(
        numero
      );

    const pendiente =
      asignacionesPendientes.get(numero);

    if (!pendiente) {

      reemplazosExcepcionalesPendientes.delete(
        numero
      );

      return (
        "⚠️ La asignación pendiente ya no existe."
      );

    }

    if (
      pendiente.actividadId.toString() !==
      excepcion.actividadId.toString()
    ) {

      reemplazosExcepcionalesPendientes.delete(
        numero
      );

      return (
        "⚠️ La actividad pendiente cambió. " +
        "Volvé a realizar el cambio."
      );

    }

    const indice =
      pendiente.sugeridos.findIndex(
        item =>
          item.persona._id.toString() ===
          excepcion.personaSaleId.toString()
      );

    if (indice === -1) {

      reemplazosExcepcionalesPendientes.delete(
        numero
      );

      return (
        "⚠️ La persona que querías reemplazar " +
        "ya no está en la propuesta."
      );

    }

    pendiente.sugeridos[indice] = {
      persona:
        excepcion.personaEntra,
      ultimaActividad: null
    };

    asignacionesPendientes.set(
      numero,
      pendiente
    );

    reemplazosExcepcionalesPendientes.delete(
      numero
    );

    const nuevaLista =
      pendiente.sugeridos
        .map(
          (item, index) =>
            `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}`
        )
        .join("\n");

    return (
      "✅ Excepción aceptada\n\n" +
      `${excepcion.personaEntra.nombre} ${excepcion.personaEntra.apellido} ` +
      "fue agregado aunque pertenece a otra jurisdicción.\n\n" +
      "👥 Asignación actual:\n\n" +
      nuevaLista +
      "\n\n" +
      "Todavía no se guardó en la base.\n" +
      "Para guardarla escribí:\n" +
      "confirmar asignación"
    );

  }


  // ======================================================
  // CONFIRMAR ASIGNACIÓN
  // ======================================================

  if (
    textoNormalizado ===
      "confirmar asignación" ||
    textoNormalizado ===
      "confirmar asignacion"
  ) {

    const pendiente =
      asignacionesPendientes.get(numero);

    if (!pendiente) {

      return (
        "⚠️ No hay ninguna asignación pendiente " +
        "para confirmar."
      );

    }

    const actividad =
      await guardarAsignacion(
        pendiente.actividadId,
        pendiente.sugeridos
      );

    asignacionesPendientes.delete(
      numero
    );

    reemplazosExcepcionalesPendientes.delete(
      numero
    );

    const actividadCompleta =
      await buscarActividadPorId(
        actividad._id
      );

    const lista =
      actividadCompleta.personas
        .map(
          (item, index) =>
            `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}`
        )
        .join("\n");

    return (
      "✅ Asignación confirmada\n\n" +
      `📌 ${actividadCompleta.nombre}\n\n` +
      "👥 Personal asignado:\n" +
      lista
    );

  }


  // ======================================================
  // ASISTENCIA
  //
  // Si hay varias actividades pendientes:
  // muestra una lista y permite elegir "actividad 2".
  //
  // Si hay una sola:
  // la selecciona automáticamente.
  // ======================================================

  if (
    textoNormalizado === "asistencia" ||
    textoNormalizado ===
      "registrar asistencia"
  ) {

    const actividades =
      await listarActividadesPendientesAsistencia();

    if (actividades.length === 0) {

      actividadesAsistenciaSeleccionadas.delete(
        numero
      );

      return (
        "✅ No hay actividades pendientes de asistencia."
      );

    }

    if (actividades.length === 1) {

      const actividad =
        actividades[0];

      actividadesAsistenciaSeleccionadas.set(
        numero,
        {
          actividadId: actividad._id
        }
      );

      const fecha =
        new Date(actividad.fecha);

      const fechaTexto =
        `${fecha.getDate()}/` +
        `${fecha.getMonth() + 1}/` +
        `${fecha.getFullYear()}`;

      const personal =
        actividad.personas
          .map(
            (item, index) =>
              `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}`
          )
          .join("\n");

      return (
        "✅ Actividad seleccionada\n\n" +
        `📌 ${actividad.nombre}\n` +
        `📅 ${fechaTexto}\n` +
        `🏢 J${actividad.jurisdiccion}\n` +
        `📍 ${actividad.lugar}\n\n` +
        "👥 Personal asignado:\n" +
        personal +
        "\n\n" +
        "Ahora decime quién faltó.\n\n" +
        "Ejemplos:\n" +
        "faltó Enzo\n" +
        "no fue Carlos\n" +
        "faltaron Enzo y Carlos\n\n" +
        "Si fueron todos:\n" +
        "fueron todos"
      );

    }

    actividadesAsistenciaSeleccionadas.set(
      numero,
      {
        opciones: actividades.map(
          actividad =>
            actividad._id.toString()
        )
      }
    );

    const lista =
      actividades
        .map((actividad, index) => {

          const fecha =
            new Date(
              actividad.fecha
            );

          const fechaTexto =
            `${fecha.getDate()}/` +
            `${fecha.getMonth() + 1}/` +
            `${fecha.getFullYear()}`;

          return (
            `${index + 1}. ${actividad.nombre}\n` +
            `   📅 ${fechaTexto} - J${actividad.jurisdiccion}\n` +
            `   📍 ${actividad.lugar}`
          );

        })
        .join("\n\n");

    return (
      "📋 ACTIVIDADES PENDIENTES DE ASISTENCIA\n\n" +
      lista +
      "\n\n" +
      "¿De cuál querés registrar asistencia?\n\n" +
      "Respondé, por ejemplo:\n" +
      "actividad 2"
    );

  }


  // ======================================================
  // SELECCIONAR ACTIVIDAD PARA ASISTENCIA
  // ======================================================

  if (
    /^actividad \d+$/.test(
      textoNormalizado
    )
  ) {

    const seleccion =
      actividadesAsistenciaSeleccionadas.get(
        numero
      );

    if (
      !seleccion ||
      !Array.isArray(
        seleccion.opciones
      )
    ) {

      return (
        "⚠️ Primero escribí:\n" +
        "asistencia"
      );

    }

    const numeroElegido =
      Number(
        textoNormalizado
          .replace("actividad ", "")
          .trim()
      );

    if (
      numeroElegido < 1 ||
      numeroElegido >
        seleccion.opciones.length
    ) {

      return (
        "⚠️ Ese número de actividad no es válido."
      );

    }

    const actividadId =
      seleccion.opciones[
        numeroElegido - 1
      ];

    const actividad =
      await buscarActividadPorId(
        actividadId
      );

    if (
      !actividad ||
      actividad.estado !== "programada" ||
      !actividad.personas.length
    ) {

      actividadesAsistenciaSeleccionadas.delete(
        numero
      );

      return (
        "⚠️ Esa actividad ya no está disponible " +
        "para registrar asistencia."
      );

    }

    actividadesAsistenciaSeleccionadas.set(
      numero,
      {
        actividadId: actividad._id
      }
    );

    const fecha =
      new Date(actividad.fecha);

    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;

    const personal =
      actividad.personas
        .map(
          (item, index) =>
            `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}`
        )
        .join("\n");

    return (
      "✅ Actividad seleccionada\n\n" +
      `📌 ${actividad.nombre}\n` +
      `📅 ${fechaTexto}\n` +
      `🏢 J${actividad.jurisdiccion}\n` +
      `📍 ${actividad.lugar}\n\n` +
      "👥 Personal asignado:\n" +
      personal +
      "\n\n" +
      "Ahora decime quién faltó.\n\n" +
      "Ejemplos:\n" +
      "faltó Enzo\n" +
      "no fue Carlos\n" +
      "faltaron Enzo y Carlos\n\n" +
      "Si fueron todos:\n" +
      "fueron todos"
    );

  }


  // ======================================================
  // REGISTRAR AUSENTES
  //
  // Entiende:
  // faltó Enzo
  // falto Enzo
  // faltaron Enzo y Carlos
  // no fue Enzo
  // no asistió Enzo
  // ausente Enzo
  // ======================================================

  if (
    esMensajeDeAusencia(
      textoNormalizado
    )
  ) {

    let actividad = null;

    const seleccion =
      actividadesAsistenciaSeleccionadas.get(
        numero
      );

    if (
      seleccion?.actividadId
    ) {

      actividad =
        await buscarActividadPorId(
          seleccion.actividadId
        );

    } else {

      const actividades =
        await listarActividadesPendientesAsistencia();

      if (actividades.length === 1) {

        actividad =
          actividades[0];

        actividadesAsistenciaSeleccionadas.set(
          numero,
          {
            actividadId:
              actividad._id
          }
        );

      } else if (
        actividades.length > 1
      ) {

        return (
          "⚠️ Hay más de una actividad pendiente.\n\n" +
          "Primero escribí:\n" +
          "asistencia\n\n" +
          "y seleccioná la actividad."
        );

      }

    }

    if (!actividad) {

      return (
        "⚠️ No hay ninguna actividad pendiente de asistencia."
      );

    }

    if (
      actividad.estado !==
      "programada"
    ) {

      actividadesAsistenciaSeleccionadas.delete(
        numero
      );

      return (
        "⚠️ Esa actividad ya no está pendiente de asistencia."
      );

    }


    const textoAusentes =
      extraerTextoAusentes(texto);

    const nombresIngresados =
      textoAusentes
        .split(/,|\sy\s/i)
        .map(
          nombre => nombre.trim()
        )
        .filter(Boolean);

    if (
      nombresIngresados.length === 0
    ) {

      return (
        "⚠️ No entendí quién faltó.\n\n" +
        "Podés decir, por ejemplo:\n" +
        "faltó Enzo\n" +
        "no fue Carlos\n" +
        "faltaron Enzo y Carlos"
      );

    }


    // Buscamos exclusivamente entre las
    // personas asignadas a esta actividad.

    const personalPermitido =
      actividad.personas
        .map(
          item => item.persona
        )
        .filter(Boolean);

    const nombresAusentes = [];

    for (
      const nombreIngresado
      of nombresIngresados
    ) {

      const busqueda =
        await buscarPersonasPorTexto(
          nombreIngresado,
          personalPermitido
        );

      if (
        busqueda.estado ===
        "ninguna"
      ) {

        const asignados =
          personalPermitido
            .map(
              persona =>
                `• ${persona.nombre} ${persona.apellido}`
            )
            .join("\n");

        return (
          `🤔 No pude identificar a "${nombreIngresado}".\n\n` +
          "Personal asignado a esta actividad:\n" +
          asignados
        );

      }

      if (
        busqueda.estado ===
        "multiple"
      ) {

        const opciones =
          busqueda.coincidencias
            .map(
              (persona, index) =>
                `${index + 1}. ${persona.nombre} ${persona.apellido}`
            )
            .join("\n");

        return (
          `🤔 Encontré más de una persona para "${nombreIngresado}".\n\n` +
          opciones +
          "\n\nIndicame el nombre completo."
        );

      }

      nombresAusentes.push(
        `${busqueda.persona.nombre} ${busqueda.persona.apellido}`
      );

    }


    const resultado =
      await prepararAsistencia(
        actividad._id,
        nombresAusentes
      );

    asistenciasPendientes.set(
      numero,
      {
        actividadId:
          actividad._id,
        personas:
          resultado.personas
      }
    );

    const presentes =
      resultado.personas.filter(
        item =>
          item.estado === "presente"
      );

    const ausentes =
      resultado.personas.filter(
        item =>
          item.estado === "ausente"
      );

    const presentesTexto =
      presentes.length > 0
        ? presentes
            .map(
              item =>
                `• ${item.persona.nombre} ${item.persona.apellido}`
            )
            .join("\n")
        : "Ninguno";

    const ausentesTexto =
      ausentes.length > 0
        ? ausentes
            .map(
              item =>
                `• ${item.persona.nombre} ${item.persona.apellido}`
            )
            .join("\n")
        : "Ninguno";

    return (
      "📋 ASISTENCIA A CONFIRMAR\n\n" +
      `📌 ${actividad.nombre}\n\n` +
      "✅ Presentes:\n" +
      presentesTexto +
      "\n\n" +
      "❌ Ausentes:\n" +
      ausentesTexto +
      "\n\n" +
      "¿Está correcto?\n\n" +
      "Podés responder:\n" +
      "si"
    );

  }

    // ======================================================
  // FUERON TODOS
  //
  // Entiende:
  // fueron todos
  // todos fueron
  // asistieron todos
  // vinieron todos
  // ninguno faltó
  // no faltó nadie
  // ======================================================

  if (
    esAsistenciaCompleta(
      textoNormalizado
    )
  ) {

    let actividad = null;

    const seleccion =
      actividadesAsistenciaSeleccionadas.get(
        numero
      );

    if (
      seleccion?.actividadId
    ) {

      actividad =
        await buscarActividadPorId(
          seleccion.actividadId
        );

    } else {

      const actividades =
        await listarActividadesPendientesAsistencia();

      if (
        actividades.length === 0
      ) {

        return (
          "⚠️ No hay actividades pendientes de asistencia."
        );

      }

      if (
        actividades.length === 1
      ) {

        actividad =
          actividades[0];

        actividadesAsistenciaSeleccionadas.set(
          numero,
          {
            actividadId:
              actividad._id
          }
        );

      } else {

        return (
          "⚠️ Hay más de una actividad pendiente.\n\n" +
          "Primero escribí:\n" +
          "asistencia\n\n" +
          "y seleccioná la actividad."
        );

      }

    }


    if (!actividad) {

      return (
        "⚠️ No encontré la actividad."
      );

    }

    if (
      actividad.estado !==
      "programada"
    ) {

      actividadesAsistenciaSeleccionadas.delete(
        numero
      );

      return (
        "⚠️ Esa actividad ya no está pendiente de asistencia."
      );

    }

    if (
      !actividad.personas ||
      actividad.personas.length === 0
    ) {

      return (
        "⚠️ La actividad no tiene personal asignado."
      );

    }


    const resultado =
      await prepararAsistencia(
        actividad._id,
        []
      );


    asistenciasPendientes.set(
      numero,
      {
        actividadId:
          actividad._id,
        personas:
          resultado.personas
      }
    );


    const presentesTexto =
      resultado.personas
        .map(
          item =>
            `• ${item.persona.nombre} ${item.persona.apellido}`
        )
        .join("\n");


    return (
      "📋 ASISTENCIA A CONFIRMAR\n\n" +
      `📌 ${actividad.nombre}\n\n` +
      "✅ Fueron todos:\n" +
      presentesTexto +
      "\n\n" +
      "¿Está correcto?\n\n" +
      "Podés responder:\n" +
      "si"
    );

  }


  // ======================================================
  // CONFIRMAR ASISTENCIA
  // ======================================================

  if (
    textoNormalizado ===
    "confirmar asistencia"
  ) {

    const asistenciaPendiente =
      asistenciasPendientes.get(
        numero
      );

    if (
      !asistenciaPendiente
    ) {

      return (
        "⚠️ No hay ninguna asistencia pendiente para confirmar."
      );

    }


    const actividad =
      await confirmarAsistencia(
        asistenciaPendiente.actividadId,
        asistenciaPendiente.personas
      );


    const presentes =
      asistenciaPendiente.personas.filter(
        item =>
          item.estado === "presente"
      );


    const ausentes =
      asistenciaPendiente.personas.filter(
        item =>
          item.estado === "ausente"
      );


    // Acreditamos compensatorio
    // solamente a quienes asistieron.

    await acreditarCompensatorioPorActividad(
      actividad._id,
      presentes,
      actividad.compensatorioMediosDias,
      actividad.fecha
    );


    asistenciasPendientes.delete(
      numero
    );

    actividadesAsistenciaSeleccionadas.delete(
      numero
    );


    const listaPresentes =
      presentes.length > 0
        ? presentes
            .map(
              item =>
                `✅ ${item.persona.nombre} ${item.persona.apellido}`
            )
            .join("\n")
        : "Ninguno";


    const listaAusentes =
      ausentes.length > 0
        ? ausentes
            .map(
              item =>
                `❌ ${item.persona.nombre} ${item.persona.apellido}`
            )
            .join("\n")
        : "Ninguno";


    let mensajeCompensatorio = "";

    if (
      actividad.compensatorioMediosDias > 0
    ) {

      mensajeCompensatorio =
        "\n\n🕐 Compensatorio acreditado:\n" +
        `${mediosDiasATexto(
          actividad.compensatorioMediosDias
        )} a cada persona presente.`;

    }


    return (
      "✅ Asistencia registrada\n\n" +

      `📌 ${actividad.nombre}\n\n` +

      "Presentes:\n" +
      listaPresentes +

      "\n\nAusentes:\n" +
      listaAusentes +

      mensajeCompensatorio
    );

  }


  // ======================================================
  // PREPARAR USO DE COMPENSATORIO
  //
  // Ejemplos:
  //
  // Enzo Brito se toma medio día mañana turno mañana
  // Enzo Brito se toma 1 día el 10/9/2026
  // ======================================================

  if (
    textoNormalizado.includes(
      " se toma "
    )
  ) {

    let textoComando =
      texto.trim();

    let fecha = null;
    let fechaTextoRespuesta = "";
    let turno = null;


    // ====================================================
    // TURNO
    // ====================================================

    const matchTurno =
      textoComando.match(
        /\bturno\s+(mañana|manana|tarde)\b/i
      );

    if (matchTurno) {

      turno =
        normalizarTexto(
          matchTurno[1]
        );

      if (turno === "manana") {
        turno = "mañana";
      }

      textoComando =
        textoComando
          .replace(
            matchTurno[0],
            ""
          )
          .trim();

    }


    // ====================================================
    // FECHA: MAÑANA
    // ====================================================

    if (
      /\bmañana\b/i.test(
        textoComando
      ) ||
      /\bmanana\b/i.test(
        textoComando
      )
    ) {

      fecha = new Date();

      fecha.setDate(
        fecha.getDate() + 1
      );

      fecha.setHours(
        0,
        0,
        0,
        0
      );

      textoComando =
        textoComando
          .replace(
            /\bmañana\b/i,
            ""
          )
          .replace(
            /\bmanana\b/i,
            ""
          )
          .trim();

    }


    // ====================================================
    // FECHA EXPLÍCITA
    // ====================================================

    if (!fecha) {

      const matchFecha =
        textoComando.match(
          /(?:el\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})$/i
        );

      if (matchFecha) {

        const dia =
          Number(matchFecha[1]);

        const mes =
          Number(matchFecha[2]);

        const anio =
          Number(matchFecha[3]);


        const fechaCandidata =
          new Date(
            anio,
            mes - 1,
            dia
          );


        if (
          fechaCandidata.getFullYear() !==
            anio ||
          fechaCandidata.getMonth() !==
            mes - 1 ||
          fechaCandidata.getDate() !==
            dia
        ) {

          return (
            "⚠️ La fecha ingresada no es válida."
          );

        }


        fecha =
          fechaCandidata;


        textoComando =
          textoComando
            .replace(
              /\s*(?:el\s+)?\d{1,2}\/\d{1,2}\/\d{4}$/i,
              ""
            )
            .trim();

      }

    }


    if (!fecha) {

      return (
        "⚠️ Tenés que indicar cuándo se toma el compensatorio.\n\n" +
        "Ejemplos:\n" +
        "Enzo Brito se toma medio día mañana turno mañana\n\n" +
        "Enzo Brito se toma 1 día el 5/9/2026"
      );

    }


    // ====================================================
    // PERSONA + CANTIDAD
    // ====================================================

    const partesComando =
      textoComando.split(
        /\s+se toma\s+/i
      );

    if (
      partesComando.length !== 2
    ) {

      return (
        "⚠️ No entendí el pedido de compensatorio.\n\n" +
        "Ejemplo:\n" +
        "Enzo Brito se toma medio día mañana turno mañana"
      );

    }


    const nombreIngresado =
      partesComando[0].trim();

    const cantidadTexto =
      partesComando[1].trim();


    const cantidadMediosDias =
      textoAmediosDias(
        cantidadTexto
      );


    if (
      cantidadMediosDias === null
    ) {

      return (
        "⚠️ No entendí cuánto compensatorio se va a tomar.\n\n" +
        "Podés usar, por ejemplo:\n" +
        "• medio día\n" +
        "• 1 día\n" +
        "• 1 día y medio\n" +
        "• 2 días"
      );

    }


    if (
      cantidadMediosDias === 1 &&
      !turno
    ) {

      return (
        "⚠️ Si se toma medio día, indicá el turno.\n\n" +
        "Ejemplo:\n" +
        `${nombreIngresado} se toma medio día mañana turno mañana\n\n` +
        "También puede ser: turno tarde"
      );

    }


    // ====================================================
    // BUSCAR PERSONA DE FORMA FLEXIBLE
    // ====================================================

    const busquedaPersona =
      await buscarPersonasPorTexto(
        nombreIngresado
      );


    if (
      busquedaPersona.estado ===
      "ninguna"
    ) {

      return (
        `🤔 No encontré a "${nombreIngresado}" entre el personal activo.`
      );

    }


    if (
      busquedaPersona.estado ===
      "multiple"
    ) {

      const opciones =
        busquedaPersona.coincidencias
          .map(
            (persona, index) =>
              `${index + 1}. ${persona.nombre} ${persona.apellido}`
          )
          .join("\n");

      return (
        `🤔 Encontré más de una persona para "${nombreIngresado}".\n\n` +
        opciones +
        "\n\nIndicame un poco más del nombre."
      );

    }


    const persona =
      busquedaPersona.persona;


    // ====================================================
    // CONSULTAR SALDO
    // ====================================================

    const saldo =
      await obtenerSaldoCompensatorio(
        persona._id
      );


    if (
      saldo < cantidadMediosDias
    ) {

      return (
        `⚠️ ${persona.nombre} ${persona.apellido} ` +
        "no tiene compensatorio suficiente.\n\n" +
        `Disponible: ${mediosDiasATexto(saldo)}\n` +
        `Solicitado: ${mediosDiasATexto(
          cantidadMediosDias
        )}`
      );

    }


    fechaTextoRespuesta =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;


    compensatoriosPendientes.set(
      numero,
      {
        personaId:
          persona._id,

        personaNombre:
          `${persona.nombre} ${persona.apellido}`,

        cantidadMediosDias,

        fecha,

        turno
      }
    );


    const saldoNuevo =
      saldo -
      cantidadMediosDias;


    let textoTurno = "";

    if (turno) {

      textoTurno =
        `\n⏰ Turno: ${turno}`;

    }


    return (
      "🕐 Uso de compensatorio\n\n" +

      `👤 ${persona.nombre} ${persona.apellido}\n` +

      `📅 ${fechaTextoRespuesta}` +

      textoTurno +

      `\n➖ ${mediosDiasATexto(
        cantidadMediosDias
      )}\n\n` +

      `Saldo actual: ${mediosDiasATexto(
        saldo
      )}\n` +

      `Saldo después: ${mediosDiasATexto(
        saldoNuevo
      )}\n\n` +

      "¿Confirmar?\n" +
      "Podés responder:\n" +
      "si"
    );

  }


  // ======================================================
  // CONFIRMAR USO DE COMPENSATORIO
  // ======================================================

  if (
    textoNormalizado ===
    "confirmar compensatorio"
  ) {

    const compensatorioPendiente =
      compensatoriosPendientes.get(
        numero
      );


    if (
      !compensatorioPendiente
    ) {

      return (
        "⚠️ No hay ningún uso de compensatorio pendiente para confirmar."
      );

    }


    const resultado =
      await usarCompensatorio(

        compensatorioPendiente.personaId,

        compensatorioPendiente
          .cantidadMediosDias,

        compensatorioPendiente.fecha,

        compensatorioPendiente.turno

      );


    if (!resultado.ok) {

      compensatoriosPendientes.delete(
        numero
      );

      return (
        "⚠️ Ya no hay saldo suficiente para realizar este descuento.\n\n" +
        `Saldo actual: ${mediosDiasATexto(
          resultado.saldo
        )}`
      );

    }


    const fecha =
      new Date(
        compensatorioPendiente.fecha
      );


    const fechaTexto =
      `${fecha.getDate()}/` +
      `${fecha.getMonth() + 1}/` +
      `${fecha.getFullYear()}`;


    let textoTurno = "";

    if (
      compensatorioPendiente.turno
    ) {

      textoTurno =
        `\n⏰ Turno: ${compensatorioPendiente.turno}`;

    }


    compensatoriosPendientes.delete(
      numero
    );


    return (
      "✅ Compensatorio registrado\n\n" +

      `👤 ${compensatorioPendiente.personaNombre}\n` +

      `📅 ${fechaTexto}` +

      textoTurno +

      `\n➖ ${mediosDiasATexto(
        compensatorioPendiente
          .cantidadMediosDias
      )}\n\n` +

      `Saldo anterior: ${mediosDiasATexto(
        resultado.saldoAnterior
      )}\n` +

      `Saldo disponible: ${mediosDiasATexto(
        resultado.saldoNuevo
      )}`
    );

  }


  // ======================================================
  // PREPARAR COMPENSATORIO MANUAL
  //
  // Ejemplos:
  // agregar medio día a Iza
  // agregar 1 día a Enzo motivo trabajo extra
  // ======================================================

  if (
    textoNormalizado.startsWith(
      "agregar "
    )
  ) {

    const textoOriginal =
      texto.trim();


    const match =
      textoOriginal.match(
        /^agregar\s+(.+?)\s+a\s+(.+?)(?:\s+motivo\s+(.+))?$/i
      );


    if (!match) {

      return (
        "⚠️ No entendí cómo agregar el compensatorio.\n\n" +
        "Ejemplos:\n" +
        "agregar medio día a Iza\n" +
        "agregar 1 día a Enzo motivo trabajo extra"
      );

    }


    const cantidadTexto =
      match[1].trim();

    const nombreIngresado =
      match[2].trim();

    const observacion =
      match[3]?.trim() || "";


    const cantidadMediosDias =
      textoAmediosDias(
        cantidadTexto
      );


    if (
      cantidadMediosDias === null
    ) {

      return (
        "⚠️ No entendí la cantidad de compensatorio.\n\n" +
        "Podés escribir, por ejemplo:\n" +
        "• medio día\n" +
        "• 1 día\n" +
        "• 1 día y medio\n" +
        "• 2 días"
      );

    }


    // ====================================================
    // BUSCAR PERSONA FLEXIBLE
    // ====================================================

    const busquedaPersona =
      await buscarPersonasPorTexto(
        nombreIngresado
      );


    if (
      busquedaPersona.estado ===
      "ninguna"
    ) {

      return (
        `🤔 No encontré a "${nombreIngresado}" entre el personal activo.`
      );

    }


    if (
      busquedaPersona.estado ===
      "multiple"
    ) {

      const opciones =
        busquedaPersona.coincidencias
          .map(
            (persona, index) =>
              `${index + 1}. ${persona.nombre} ${persona.apellido}`
          )
          .join("\n");

      return (
        `🤔 Encontré más de una persona para "${nombreIngresado}".\n\n` +
        opciones +
        "\n\nIndicame un poco más del nombre."
      );

    }


    const persona =
      busquedaPersona.persona;


    const saldoActual =
      await obtenerSaldoCompensatorio(
        persona._id
      );


    const saldoNuevo =
      saldoActual +
      cantidadMediosDias;


    compensatoriosManualesPendientes.set(
      numero,
      {

        personaId:
          persona._id,

        personaNombre:
          `${persona.nombre} ${persona.apellido}`,

        cantidadMediosDias,

        observacion

      }
    );


    let textoMotivo = "";

    if (observacion) {

      textoMotivo =
        `\n📝 Motivo: ${observacion}`;

    }


    return (
      "➕ Compensatorio manual\n\n" +

      `👤 ${persona.nombre} ${persona.apellido}\n` +

      `🕐 Se agregarán: ${mediosDiasATexto(
        cantidadMediosDias
      )}` +

      textoMotivo +

      `\n\nSaldo actual: ${mediosDiasATexto(
        saldoActual
      )}\n` +

      `Saldo después: ${mediosDiasATexto(
        saldoNuevo
      )}\n\n` +

      "¿Confirmar?\n" +
      "Podés responder:\n" +
      "si"
    );

  }


  // ======================================================
  // CONFIRMAR COMPENSATORIO MANUAL
  // ======================================================

  if (
    textoNormalizado ===
    "confirmar compensatorio manual"
  ) {

    const pendiente =
      compensatoriosManualesPendientes.get(
        numero
      );


    if (!pendiente) {

      return (
        "⚠️ No hay ningún compensatorio manual pendiente para confirmar."
      );

    }


    const saldoAnterior =
      await obtenerSaldoCompensatorio(
        pendiente.personaId
      );


    await agregarCompensatorioManual(

      pendiente.personaId,

      pendiente.cantidadMediosDias,

      pendiente.observacion

    );


    const saldoNuevo =
      saldoAnterior +
      pendiente.cantidadMediosDias;


    compensatoriosManualesPendientes.delete(
      numero
    );


    let textoMotivo = "";

    if (
      pendiente.observacion
    ) {

      textoMotivo =
        `\n📝 Motivo: ${pendiente.observacion}`;

    }


    return (
      "✅ Compensatorio agregado\n\n" +

      `👤 ${pendiente.personaNombre}\n` +

      `➕ ${mediosDiasATexto(
        pendiente.cantidadMediosDias
      )}` +

      textoMotivo +

      `\n\nSaldo anterior: ${mediosDiasATexto(
        saldoAnterior
      )}\n` +

      `Saldo disponible: ${mediosDiasATexto(
        saldoNuevo
      )}`
    );

  }


  // ======================================================
  // LISTAR COMPENSATORIOS
  // ======================================================

  const comandosListarCompensatorios = [
  "listar compensatorios",
  "ver compensatorios",
  "mostrar compensatorios",
  "como estan los compensatorios",
  "cómo están los compensatorios",
  "cuanto compensatorio tiene cada uno",
  "cuánto compensatorio tiene cada uno",
  "quienes tienen compensatorio",
  "quiénes tienen compensatorio",
  "mostrame los compensatorios",
  "mostrar saldo de compensatorios",
  "ver saldo de compensatorios",
  "como estan los saldos",
  "cómo están los saldos",
  "quiero ver los compensatorios"
];

if (
  comandosListarCompensatorios.includes(
    textoNormalizado
  )
) {

    const saldos =
      await obtenerSaldosCompensatorios();


    if (
      saldos.length === 0
    ) {

      return (
        "No hay personal registrado."
      );

    }


    const lista =
      saldos
        .map(
          (item, index) =>
            `${index + 1}. ${item.persona.nombre} ${item.persona.apellido}` +
            ` — ${mediosDiasATexto(
              item.saldo
            )}`
        )
        .join("\n");


    return (
      "👥 Compensatorios disponibles\n\n" +
      lista
    );

  }
  // ======================================================
  // VER HISTORIAL DE COMPENSATORIOS DE UNA PERSONA
  //
  // Entiende:
  // ver compensatorios Enzo
  // ver compensatorios de Enzo
  // ======================================================

  if (
    textoNormalizado.startsWith(
      "ver compensatorios "
    )
  ) {

    const nombreIngresado =
      texto
        .trim()
        .replace(
          /^ver compensatorios(?:\s+de)?\s+/i,
          ""
        )
        .trim();


    if (!nombreIngresado) {

      return (
        "⚠️ Tenés que indicar una persona.\n\n" +
        "Ejemplos:\n" +
        "ver compensatorios Enzo\n" +
        "ver compensatorios de Enzo Brito"
      );

    }


    const busquedaPersona =
      await buscarPersonasPorTexto(
        nombreIngresado
      );


    if (
      busquedaPersona.estado ===
      "ninguna"
    ) {

      return (
        `🤔 No encontré a "${nombreIngresado}" entre el personal activo.`
      );

    }


    if (
      busquedaPersona.estado ===
      "multiple"
    ) {

      const opciones =
        busquedaPersona.coincidencias
          .map(
            (persona, index) =>
              `${index + 1}. ${persona.nombre} ${persona.apellido}`
          )
          .join("\n");

      return (
        `🤔 Encontré más de una persona para "${nombreIngresado}".\n\n` +
        opciones +
        "\n\nIndicame un poco más del nombre."
      );

    }


    const persona =
      busquedaPersona.persona;


    const saldo =
      await obtenerSaldoCompensatorio(
        persona._id
      );


    const movimientos =
      await obtenerMovimientosCompensatorio(
        persona._id
      );


    let respuesta =
      `📋 Compensatorios de ${persona.nombre} ${persona.apellido}\n\n` +
      `🕐 Saldo disponible: ${mediosDiasATexto(
        saldo
      )}\n`;


    if (
      movimientos.length === 0
    ) {

      return (
        respuesta +
        "\n📜 No tiene movimientos registrados."
      );

    }


    respuesta +=
      "\n📜 Historial:\n";


    for (
      const movimiento
      of movimientos
    ) {

      const fecha =
        new Date(
          movimiento.fecha
        );


      const fechaTexto =
        `${fecha.getDate()}/` +
        `${fecha.getMonth() + 1}/` +
        `${fecha.getFullYear()}`;


      const simbolo =
        movimiento.tipo ===
        "credito"
          ? "🟢"
          : "🔴";


      respuesta +=
        `\n${simbolo} ${mediosDiasATexto(
          movimiento.cantidadMediosDias
        )}\n`;


      respuesta +=
        `📅 ${fechaTexto}\n`;


      // ================================================
      // CRÉDITO POR ACTIVIDAD
      // ================================================

      if (
        movimiento.motivo ===
          "actividad" &&
        movimiento.actividad
      ) {

        respuesta +=
          `📌 Actividad: ${movimiento.actividad.nombre}\n`;

      }


      // ================================================
      // CARGA MANUAL
      // ================================================

      if (
        movimiento.motivo ===
        "manual"
      ) {

        respuesta +=
          "📝 Carga manual";

        if (
          movimiento.observacion
        ) {

          respuesta +=
            `: ${movimiento.observacion}`;

        }

        respuesta += "\n";

      }


      // ================================================
      // USO DE COMPENSATORIO
      // ================================================

      if (
        movimiento.motivo ===
        "uso_compensatorio"
      ) {

        respuesta +=
          "🏖️ Uso de compensatorio\n";


        if (
          movimiento.turno
        ) {

          respuesta +=
            `⏰ Turno: ${movimiento.turno}\n`;

        }


        if (
          movimiento.observacion
        ) {

          respuesta +=
            `📝 ${movimiento.observacion}\n`;

        }

      }

    }


    return respuesta.trim();

  }


  // ======================================================
  // CONSULTAR SALDO DE COMPENSATORIO
  //
  // Entiende actualmente:
  //
  // cuanto compensatorio tiene Enzo
  // cuánto compensatorio tiene Enzo
  // ======================================================

  if (
    textoNormalizado.startsWith(
      "cuanto compensatorio tiene "
    )
  ) {

    const nombreIngresado =
      texto
        .trim()
        .replace(
          /^cu[aá]nto compensatorio tiene\s+/i,
          ""
        )
        .trim();


    if (!nombreIngresado) {

      return (
        "⚠️ Tenés que indicar una persona.\n\n" +
        "Ejemplo:\n" +
        "cuanto compensatorio tiene Enzo"
      );

    }


    const busquedaPersona =
      await buscarPersonasPorTexto(
        nombreIngresado
      );


    if (
      busquedaPersona.estado ===
      "ninguna"
    ) {

      return (
        `🤔 No encontré a "${nombreIngresado}" entre el personal activo.`
      );

    }


    if (
      busquedaPersona.estado ===
      "multiple"
    ) {

      const opciones =
        busquedaPersona.coincidencias
          .map(
            (persona, index) =>
              `${index + 1}. ${persona.nombre} ${persona.apellido}`
          )
          .join("\n");

      return (
        `🤔 Encontré más de una persona para "${nombreIngresado}".\n\n` +
        opciones +
        "\n\nIndicame un poco más del nombre."
      );

    }


    const persona =
      busquedaPersona.persona;


    const saldo =
      await obtenerSaldoCompensatorio(
        persona._id
      );


    return (
      `🕐 Compensatorio de ${persona.nombre} ${persona.apellido}\n\n` +
      `Disponible: ${mediosDiasATexto(
        saldo
      )}`
    );

  }


  // ======================================================
  // CONSULTAS NATURALES DE SALDO
  //
  // Ejemplos:
  //
  // saldo de Enzo
  // compensatorio de Enzo
  // cuanto tiene Enzo
  // cuánto tiene Enzo
  // ======================================================

  let nombreConsultaSaldo = null;


  if (
    textoNormalizado.startsWith(
      "saldo de "
    )
  ) {

    nombreConsultaSaldo =
      texto
        .trim()
        .replace(
          /^saldo de\s+/i,
          ""
        )
        .trim();

  }


  else if (
    textoNormalizado.startsWith(
      "compensatorio de "
    )
  ) {

    nombreConsultaSaldo =
      texto
        .trim()
        .replace(
          /^compensatorio de\s+/i,
          ""
        )
        .trim();

  }


  else if (
    textoNormalizado.startsWith(
      "cuanto tiene "
    )
  ) {

    nombreConsultaSaldo =
      texto
        .trim()
        .replace(
          /^cu[aá]nto tiene\s+/i,
          ""
        )
        .trim();

  }


  if (
    nombreConsultaSaldo
  ) {

    const busquedaPersona =
      await buscarPersonasPorTexto(
        nombreConsultaSaldo
      );


    if (
      busquedaPersona.estado ===
      "ninguna"
    ) {

      return (
        `🤔 No encontré a "${nombreConsultaSaldo}" entre el personal activo.`
      );

    }


    if (
      busquedaPersona.estado ===
      "multiple"
    ) {

      const opciones =
        busquedaPersona.coincidencias
          .map(
            (persona, index) =>
              `${index + 1}. ${persona.nombre} ${persona.apellido}`
          )
          .join("\n");

      return (
        `🤔 Encontré más de una persona para "${nombreConsultaSaldo}".\n\n` +
        opciones +
        "\n\nIndicame un poco más del nombre."
      );

    }


    const persona =
      busquedaPersona.persona;


    const saldo =
      await obtenerSaldoCompensatorio(
        persona._id
      );


    return (
      `🕐 Compensatorio de ${persona.nombre} ${persona.apellido}\n\n` +
      `Disponible: ${mediosDiasATexto(
        saldo
      )}`
    );

  }


  // ======================================================
  // ALGUNAS FORMAS NATURALES DE PEDIR AYUDA
  // ======================================================

  if (
    textoNormalizado ===
      "que puedo hacer" ||
    textoNormalizado ===
      "que podes hacer" ||
    textoNormalizado ===
      "opciones" ||
    textoNormalizado ===
      "mostrar opciones"
  ) {

    return (
      "🤖 Puedo ayudarte con:\n\n" +

      "👥 Personal\n" +
      "• crear personas\n" +
      "• listar personas\n\n" +

      "📅 Actividades\n" +
      "• crear actividades\n" +
      "• ver actividades programadas\n" +
      "• cancelar actividades\n\n" +

      "👥 Asignaciones\n" +
      "• asignar personal automáticamente\n" +
      "• cambiar integrantes\n\n" +

      "✅ Asistencia\n" +
      "• registrar quién fue\n" +
      "• registrar quién faltó\n\n" +

      "🕐 Compensatorios\n" +
      "• consultar saldos\n" +
      "• ver historiales\n" +
      "• agregar compensatorios\n" +
      "• registrar su uso\n\n" +

      'Escribí "ayuda" para ver todos los ejemplos.'
    );

  }


  // ======================================================
  // MENSAJE NO RECONOCIDO
  // ======================================================

  return (
    "No entendí del todo ese mensaje.\n\n" +
    "Podés escribirlo de otra manera o escribí " +
    '"ayuda" para ver ejemplos.'
  );

}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  procesarMensaje
};