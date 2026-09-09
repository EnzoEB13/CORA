// ======================================================
// UTILIDADES PARA INTERPRETAR MENSAJES
// ======================================================

function normalizarTexto(texto = "") {
  return texto
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// ======================================================
// DISTANCIA LEVENSHTEIN
// Permite tolerar pequeños errores de escritura.
// ======================================================

function distanciaLevenshtein(a = "", b = "") {
  a = normalizarTexto(a);
  b = normalizarTexto(b);

  const matriz = Array.from(
    { length: b.length + 1 },
    () => Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) {
    matriz[0][i] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matriz[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const costo =
        a[i - 1] === b[j - 1] ? 0 : 1;

      matriz[j][i] = Math.min(
        matriz[j - 1][i] + 1,
        matriz[j][i - 1] + 1,
        matriz[j - 1][i - 1] + costo
      );
    }
  }

  return matriz[b.length][a.length];
}


// ======================================================
// COMPARAR PALABRAS CON PEQUEÑOS ERRORES
// ======================================================

function palabraParecida(
  recibida,
  esperada,
  tolerancia = 1
) {
  const a = normalizarTexto(recibida);
  const b = normalizarTexto(esperada);

  if (a === b) {
    return true;
  }

  return distanciaLevenshtein(a, b) <= tolerancia;
}


// ======================================================
// COMPARAR UNA FRASE CONTRA VARIAS ALTERNATIVAS
// ======================================================

function coincideConAlguna(
  texto,
  alternativas,
  tolerancia = 0
) {
  const valor = normalizarTexto(texto);

  return alternativas.some(alternativa => {
    const esperado = normalizarTexto(alternativa);

    if (valor === esperado) {
      return true;
    }

    if (tolerancia > 0) {
      return (
        distanciaLevenshtein(valor, esperado) <=
        tolerancia
      );
    }

    return false;
  });
}


// ======================================================
// RESPUESTAS AFIRMATIVAS
// ======================================================

function esAfirmacion(texto) {
  return coincideConAlguna(
    texto,
    [
      "si",
      "sí",
      "dale",
      "ok",
      "okay",
      "confirmo",
      "confirmar",
      "confirmado",
      "de acuerdo",
      "esta bien",
      "está bien",
      "correcto",
      "perfecto"
    ],
    1
  );
}


// ======================================================
// RESPUESTAS NEGATIVAS
// ======================================================

function esNegacion(texto) {
  return coincideConAlguna(
    texto,
    [
      "no",
      "cancelar",
      "cancela",
      "cancelalo",
      "cancelalo",
      "dejalo",
      "dejá",
      "no confirmar"
    ],
    1
  );
}


// ======================================================
// DETECTAR SI UNA FRASE EMPIEZA COMO ALGUNA VARIANTE
// ======================================================

function empiezaConAlguna(texto, alternativas) {
  const valor = normalizarTexto(texto);

  return alternativas.some(alternativa => {
    const esperado = normalizarTexto(alternativa);

    return (
      valor === esperado ||
      valor.startsWith(esperado + " ")
    );
  });
}


// ======================================================
// QUITAR UN INICIO POSIBLE
//
// Ejemplo:
//
// quitarInicio(
//   "no fue Enzo",
//   ["no fue", "falto", "faltaron"]
// )
//
// devuelve: "Enzo"
// ======================================================

function quitarInicio(texto, alternativas) {
  const original = texto.trim();
  const normalizado = normalizarTexto(original);

  for (const alternativa of alternativas) {
    const inicio = normalizarTexto(alternativa);

    if (
      normalizado === inicio ||
      normalizado.startsWith(inicio + " ")
    ) {
      const cantidadPalabras =
        inicio.split(" ").length;

      return original
        .trim()
        .split(/\s+/)
        .slice(cantidadPalabras)
        .join(" ")
        .trim();
    }
  }

  return original;
}


// ======================================================
// DETECTAR INTENCIÓN DE AUSENCIA
// ======================================================

function esMensajeDeAusencia(texto) {
  return empiezaConAlguna(texto, [
    "faltaron",
    "falto",
    "faltó",
    "falta",
    "no fue",
    "no fueron",
    "no asistio",
    "no asistió",
    "no asistieron",
    "ausente",
    "ausentes"
  ]);
}


function extraerTextoAusentes(texto) {
  return quitarInicio(texto, [
    "faltaron",
    "falto",
    "faltó",
    "falta",
    "no fue",
    "no fueron",
    "no asistio",
    "no asistió",
    "no asistieron",
    "ausente",
    "ausentes"
  ]);
}


// ======================================================
// DETECTAR "FUERON TODOS"
// ======================================================

function esAsistenciaCompleta(texto) {
  return coincideConAlguna(
    texto,
    [
      "fueron todos",
      "fueron todos",
      "asistieron todos",
      "vinieron todos",
      "estuvieron todos",
      "todos fueron",
      "todos asistieron",
      "todos vinieron",
      "ninguno falto",
      "ninguno faltó",
      "no falto nadie",
      "no faltó nadie"
    ],
    2
  );
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  normalizarTexto,
  distanciaLevenshtein,
  palabraParecida,
  coincideConAlguna,
  esAfirmacion,
  esNegacion,
  empiezaConAlguna,
  quitarInicio,
  esMensajeDeAusencia,
  extraerTextoAusentes,
  esAsistenciaCompleta
};