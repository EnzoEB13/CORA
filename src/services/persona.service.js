const Persona = require("../models/Persona");
const {
  normalizarTexto,
  distanciaLevenshtein
} = require("../utils/texto.utils");

function escaparRegex(texto = "") {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizarTelefono(numero = "") {
  return numero.toString().replace(/\D/g, "");
}

async function crearPersona(nombre, apellido, jurisdiccion) {
  const existente = await Persona.findOne({
    nombre: new RegExp(`^${escaparRegex(nombre)}$`, "i"),
    apellido: new RegExp(`^${escaparRegex(apellido)}$`, "i"),
    activo: true
  });

  if (existente) return { ok: false, persona: existente };

  const persona = await Persona.create({ nombre, apellido, jurisdiccion });
  return { ok: true, persona };
}

async function listarPersonas() {
  return await Persona.find({ activo: true }).sort({ apellido: 1, nombre: 1 });
}

async function buscarPersonaPorNombre(nombre, apellido) {
  return await Persona.findOne({
    nombre: new RegExp(`^${escaparRegex(nombre)}$`, "i"),
    apellido: new RegExp(`^${escaparRegex(apellido)}$`, "i"),
    activo: true
  });
}

async function buscarPersonaPorNombreCompleto(nombreCompleto) {
  const resultado = await buscarPersonasPorTexto(nombreCompleto);
  return resultado.estado === "unica" ? resultado.persona : null;
}

function toleranciaPalabra(palabra) {
  if (palabra.length <= 3) return 0;
  if (palabra.length <= 7) return 1;
  return 2;
}

function palabrasCoinciden(buscada, candidata) {
  const a = normalizarTexto(buscada);
  const b = normalizarTexto(candidata);
  if (a === b) return true;
  const tolerancia = Math.min(toleranciaPalabra(a), toleranciaPalabra(b));
  if (tolerancia === 0) return false;
  return distanciaLevenshtein(a, b) <= tolerancia;
}

function puntuarPersona(textoBuscado, persona) {
  const consulta = normalizarTexto(textoBuscado);
  if (!consulta) return 0;
  const nombre = normalizarTexto(persona.nombre);
  const apellido = normalizarTexto(persona.apellido);
  const completo = normalizarTexto(`${persona.nombre} ${persona.apellido}`);
  if (consulta === completo) return 100;
  if (consulta === nombre) return 95;
  if (consulta === apellido) return 93;

  const palabrasConsulta = consulta.split(" ");
  const palabrasPersona = [...nombre.split(" "), ...apellido.split(" ")];
  if (palabrasConsulta.every(p => palabrasPersona.includes(p))) return 90;
  if (palabrasConsulta.every(p => palabrasPersona.some(pp => palabrasCoinciden(p, pp)))) return 75;
  if (consulta.length >= 3 && palabrasPersona.some(p => p.startsWith(consulta))) return 60;
  return 0;
}

async function buscarPersonasPorTexto(texto, personasPermitidas = null) {
  const consulta = normalizarTexto(texto);
  if (!consulta) return { estado: "ninguna", coincidencias: [] };

  const personas = Array.isArray(personasPermitidas)
    ? personasPermitidas.filter(Boolean)
    : await Persona.find({ activo: true });

  if (personas.length === 0) return { estado: "ninguna", coincidencias: [] };

  const puntuadas = personas
    .map(persona => ({ persona, puntaje: puntuarPersona(consulta, persona) }))
    .filter(item => item.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje);

  if (puntuadas.length === 0) return { estado: "ninguna", coincidencias: [] };

  const mejorPuntaje = puntuadas[0].puntaje;
  const mejores = puntuadas.filter(item => item.puntaje === mejorPuntaje);
  if (mejores.length === 1) {
    return { estado: "unica", persona: mejores[0].persona, coincidencias: [mejores[0].persona] };
  }
  return { estado: "multiple", coincidencias: mejores.map(item => item.persona) };
}

async function buscarPersonaPorTelefono(numero) {
  const telefonoWhatsapp = normalizarTelefono(numero);
  if (!telefonoWhatsapp) return null;
  return await Persona.findOne({ telefonoWhatsapp, activo: true });
}

async function asignarTelefonoPersona(personaId, numero) {
  const telefonoWhatsapp = normalizarTelefono(numero);
  if (!telefonoWhatsapp || telefonoWhatsapp.length < 8) {
    return { ok: false, motivo: "telefono_invalido" };
  }

  const otraPersona = await Persona.findOne({
    telefonoWhatsapp,
    _id: { $ne: personaId }
  });
  if (otraPersona) return { ok: false, motivo: "telefono_en_uso", persona: otraPersona };

  const persona = await Persona.findById(personaId);
  if (!persona) return { ok: false, motivo: "persona_no_encontrada" };

  persona.telefonoWhatsapp = telefonoWhatsapp;
  await persona.save();
  return { ok: true, persona };
}

async function quitarTelefonoPersona(personaId) {
  const persona = await Persona.findById(personaId);
  if (!persona) return { ok: false, motivo: "persona_no_encontrada" };
  persona.telefonoWhatsapp = undefined;
  await persona.save();
  return { ok: true, persona };
}

module.exports = {
  crearPersona,
  listarPersonas,
  buscarPersonaPorNombre,
  buscarPersonaPorNombreCompleto,
  buscarPersonasPorTexto,
  buscarPersonaPorTelefono,
  asignarTelefonoPersona,
  quitarTelefonoPersona,
  normalizarTelefono
};
