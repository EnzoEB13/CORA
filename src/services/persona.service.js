const Persona = require("../models/Persona");

const {
  normalizarTexto,
  distanciaLevenshtein
} = require("../utils/texto.utils");


// ======================================================
// ESCAPAR TEXTO PARA REGEXP
// ======================================================

function escaparRegex(texto = "") {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// ======================================================
// CREAR PERSONA
// ======================================================

async function crearPersona(
  nombre,
  apellido,
  jurisdiccion
) {
  const existente = await Persona.findOne({
    nombre: new RegExp(
      `^${escaparRegex(nombre)}$`,
      "i"
    ),
    apellido: new RegExp(
      `^${escaparRegex(apellido)}$`,
      "i"
    ),
    activo: true
  });

  if (existente) {
    return {
      ok: false,
      persona: existente
    };
  }

  const persona = await Persona.create({
    nombre,
    apellido,
    jurisdiccion
  });

  return {
    ok: true,
    persona
  };
}


// ======================================================
// LISTAR PERSONAS
// ======================================================

async function listarPersonas() {
  return await Persona.find({
    activo: true
  }).sort({
    apellido: 1,
    nombre: 1
  });
}


// ======================================================
// BÚSQUEDA EXACTA NOMBRE + APELLIDO
// Se mantiene por compatibilidad con código existente.
// ======================================================

async function buscarPersonaPorNombre(
  nombre,
  apellido
) {
  return await Persona.findOne({
    nombre: new RegExp(
      `^${escaparRegex(nombre)}$`,
      "i"
    ),
    apellido: new RegExp(
      `^${escaparRegex(apellido)}$`,
      "i"
    ),
    activo: true
  });
}


// ======================================================
// BÚSQUEDA EXACTA POR NOMBRE COMPLETO
// Se mantiene para no romper comandos existentes.
// ======================================================

async function buscarPersonaPorNombreCompleto(
  nombreCompleto
) {
  const resultado =
    await buscarPersonasPorTexto(nombreCompleto);

  if (resultado.estado === "unica") {
    return resultado.persona;
  }

  return null;
}


// ======================================================
// CALCULAR TOLERANCIA DE ERROR
// ======================================================

function toleranciaPalabra(palabra) {
  if (palabra.length <= 3) {
    return 0;
  }

  if (palabra.length <= 7) {
    return 1;
  }

  return 2;
}


// ======================================================
// COMPARAR UNA PALABRA CON OTRA
// ======================================================

function palabrasCoinciden(
  buscada,
  candidata
) {
  const a = normalizarTexto(buscada);
  const b = normalizarTexto(candidata);

  if (a === b) {
    return true;
  }

  const tolerancia = Math.min(
    toleranciaPalabra(a),
    toleranciaPalabra(b)
  );

  if (tolerancia === 0) {
    return false;
  }

  return (
    distanciaLevenshtein(a, b) <= tolerancia
  );
}


// ======================================================
// CALCULAR PUNTAJE DE UNA PERSONA
// ======================================================

function puntuarPersona(
  textoBuscado,
  persona
) {
  const consulta =
    normalizarTexto(textoBuscado);

  if (!consulta) {
    return 0;
  }

  const nombre =
    normalizarTexto(persona.nombre);

  const apellido =
    normalizarTexto(persona.apellido);

  const completo =
    normalizarTexto(
      `${persona.nombre} ${persona.apellido}`
    );

  // ----------------------------------------------------
  // Coincidencia exacta del nombre completo
  // Enzo Brito
  // ----------------------------------------------------

  if (consulta === completo) {
    return 100;
  }

  // ----------------------------------------------------
  // Coincidencia exacta solamente con nombre
  // Enzo
  // ----------------------------------------------------

  if (consulta === nombre) {
    return 95;
  }

  // ----------------------------------------------------
  // Coincidencia exacta solamente con apellido
  // Brito
  // ----------------------------------------------------

  if (consulta === apellido) {
    return 93;
  }

  const palabrasConsulta =
    consulta.split(" ");

  const palabrasPersona = [
    ...nombre.split(" "),
    ...apellido.split(" ")
  ];

  // ----------------------------------------------------
  // Todas las palabras buscadas aparecen exactamente
  //
  // "Enzo Bri" todavía NO entra acá,
  // pero "Enzo Brito" sí.
  // ----------------------------------------------------

  const todasExactas =
    palabrasConsulta.every(
      palabraBuscada =>
        palabrasPersona.includes(
          palabraBuscada
        )
    );

  if (todasExactas) {
    return 90;
  }

  // ----------------------------------------------------
  // Coincidencia tolerando errores pequeños
  //
  // Enso -> Enzo
  // Enrrique -> Enrique
  // Figueredo -> Figueiredo (según distancia)
  // ----------------------------------------------------

  const todasParecidas =
    palabrasConsulta.every(
      palabraBuscada =>
        palabrasPersona.some(
          palabraPersona =>
            palabrasCoinciden(
              palabraBuscada,
              palabraPersona
            )
        )
    );

  if (todasParecidas) {
    return 75;
  }

  // ----------------------------------------------------
  // Coincidencia parcial al comienzo
  //
  // "Enz" -> Enzo
  // "Fig" -> Figueredo
  //
  // Solo usamos mínimo 3 caracteres.
  // ----------------------------------------------------

  if (
    consulta.length >= 3 &&
    palabrasPersona.some(
      palabra =>
        palabra.startsWith(consulta)
    )
  ) {
    return 60;
  }

  return 0;
}


// ======================================================
// BÚSQUEDA INTELIGENTE DE PERSONAS
//
// Puede recibir:
// - solamente texto
// - texto + lista de personas permitidas
//
// Ejemplo:
// buscarPersonasPorTexto("Enzo")
//
// o:
//
// buscarPersonasPorTexto(
//   "Enzo",
//   actividad.personas.map(x => x.persona)
// )
//
// Resultado:
//
// {
//   estado: "unica",
//   persona: ...
// }
//
// {
//   estado: "multiple",
//   coincidencias: [...]
// }
//
// {
//   estado: "ninguna",
//   coincidencias: []
// }
// ======================================================

async function buscarPersonasPorTexto(
  texto,
  personasPermitidas = null
) {
  const consulta =
    normalizarTexto(texto);

  if (!consulta) {
    return {
      estado: "ninguna",
      coincidencias: []
    };
  }

  let personas;

  if (
    Array.isArray(personasPermitidas)
  ) {
    personas =
      personasPermitidas.filter(Boolean);
  } else {
    personas = await Persona.find({
      activo: true
    });
  }

  if (personas.length === 0) {
    return {
      estado: "ninguna",
      coincidencias: []
    };
  }

  const puntuadas = personas
    .map(persona => ({
      persona,
      puntaje: puntuarPersona(
        consulta,
        persona
      )
    }))
    .filter(
      item => item.puntaje > 0
    )
    .sort(
      (a, b) =>
        b.puntaje - a.puntaje
    );

  if (puntuadas.length === 0) {
    return {
      estado: "ninguna",
      coincidencias: []
    };
  }

  const mejorPuntaje =
    puntuadas[0].puntaje;

  // Solamente consideramos ambiguas
  // las personas que obtuvieron el mismo
  // mejor puntaje.
  const mejores =
    puntuadas.filter(
      item =>
        item.puntaje === mejorPuntaje
    );

  if (mejores.length === 1) {
    return {
      estado: "unica",
      persona: mejores[0].persona,
      coincidencias: [
        mejores[0].persona
      ]
    };
  }

  return {
    estado: "multiple",
    coincidencias: mejores.map(
      item => item.persona
    )
  };
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  crearPersona,
  listarPersonas,
  buscarPersonaPorNombre,
  buscarPersonaPorNombreCompleto,
  buscarPersonasPorTexto
};