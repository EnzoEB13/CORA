function textoAmediosDias(texto) {

  const valor = texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  // ====================================================
  // SIN COMPENSATORIO
  // ====================================================
  //
  // Ejemplos:
  //
  // 0
  // 0 dia
  // 0 dias
  // sin compensatorio
  // ninguno
  // ninguna
  // no
  //
  // ====================================================

  if (
    valor === "0" ||
    valor === "0 dia" ||
    valor === "0 dias" ||
    valor === "sin compensatorio" ||
    valor === "ninguno" ||
    valor === "ninguna" ||
    valor === "no"
  ) {
    return 0;
  }

  // ====================================================
  // MEDIO DÍA
  // ====================================================

  if (
    valor === "medio dia" ||
    valor === "media jornada"
  ) {
    return 1;
  }

  // ====================================================
  // PALABRAS BÁSICAS
  // ====================================================

  const numerosEnPalabras = {
    un: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10
  };

  // ====================================================
  // EJEMPLOS:
  //
  // 1 dia
  // 2 dias
  // 4 dias
  // 10 dias
  // ====================================================

  let match = valor.match(
    /^(\d+)\s+dias?$/
  );

  if (match) {

    const dias = Number(match[1]);

    if (dias < 0) {
      return null;
    }

    return dias * 2;
  }

  // ====================================================
  // EJEMPLOS:
  //
  // un dia
  // dos dias
  // cuatro dias
  // ====================================================

  match = valor.match(
    /^(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+dias?$/
  );

  if (match) {

    const dias =
      numerosEnPalabras[match[1]];

    return dias * 2;
  }

  // ====================================================
  // EJEMPLOS:
  //
  // 1 dia y medio
  // 2 dias y medio
  // 4 dias y medio
  // ====================================================

  match = valor.match(
    /^(\d+)\s+dias?\s+y\s+medio$/
  );

  if (match) {

    const dias = Number(match[1]);

    if (dias < 0) {
      return null;
    }

    return dias * 2 + 1;
  }

  // ====================================================
  // EJEMPLOS:
  //
  // un dia y medio
  // dos dias y medio
  // cuatro dias y medio
  // ====================================================

  match = valor.match(
    /^(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+dias?\s+y\s+medio$/
  );

  if (match) {

    const dias =
      numerosEnPalabras[match[1]];

    return dias * 2 + 1;
  }

  return null;
}


function mediosDiasATexto(cantidad) {

  if (cantidad === 0) {
    return "sin compensatorio";
  }

  if (cantidad === 1) {
    return "medio día";
  }

  const diasCompletos =
    Math.floor(cantidad / 2);

  const tieneMedioDia =
    cantidad % 2 !== 0;

  if (
    diasCompletos === 1 &&
    !tieneMedioDia
  ) {
    return "1 día";
  }

  if (
    diasCompletos === 1 &&
    tieneMedioDia
  ) {
    return "1 día y medio";
  }

  if (tieneMedioDia) {
    return `${diasCompletos} días y medio`;
  }

  return `${diasCompletos} días`;
}


module.exports = {
  textoAmediosDias,
  mediosDiasATexto
};