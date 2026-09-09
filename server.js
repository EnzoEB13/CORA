require("dotenv").config();

const express = require("express");
const { enviarMensaje } = require("./src/services/whatsapp.service");
const { procesarMensaje } = require("./src/services/bot.service");
const conectarDB = require("./src/config/db");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;


// ======================================================
// NÚMEROS AUTORIZADOS
// ======================================================

const numerosAutorizados = (
  process.env.WHATSAPP_NUMEROS_AUTORIZADOS || ""
)
  .split(",")
  .map(numero => numero.trim())
  .filter(Boolean);


// ======================================================
// RESPUESTAS ALEATORIAS PARA STICKERS
// ======================================================

const respuestasSticker = [
  "😂 Qué buen sticker. Lástima que ni lo puedo ver.",
  "👍 Excelente sticker... supongo.",
  "🤖 Muy lindo. Mis ojos imaginarios dicen que está buenísimo.",
  "😂 JAJAJA... me río por compromiso, no puedo ver el sticker.",
  "👀 Tremendo sticker. Fuente: mi imaginación.",
  "🤨 No sé qué mandaste, pero seguro te pareció gracioso.",
  "⭐ 10/10 el sticker. No vi absolutamente nada.",
  "🤖 Soy un bot, no un crítico de stickers.",
  "😂 Me encantó. No tengo idea de qué era.",
  "📸 Recibí un sticker. Comprenderlo ya es otro servicio.",
  "🙄 Otra vez mandando stickers a alguien que no los puede ver...",
  "👏 Espectacular. Ahora mandame uno que pueda ver.",
  "🤔 Voy a asumir que ese sticker tenía sentido.",
  "😂 Jajajaja buenísimo... ¿de qué nos reímos?",
  "🫡 Sticker recibido. Interpretación: pendiente para el año 2050."
];


// ======================================================
// PARA COMPROBAR QUE EL SERVIDOR ESTÁ VIVO
// ======================================================

app.get("/", (req, res) => {
  res.send("Gestor de Actividades funcionando");
});


// ======================================================
// VERIFICACIÓN DEL WEBHOOK DE META
// ======================================================

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN
  ) {
    console.log("✅ Webhook verificado por Meta");

    return res
      .status(200)
      .send(challenge);
  }

  console.log("❌ Error verificando webhook");

  return res.sendStatus(403);
});


// ======================================================
// ACÁ LLEGAN LOS MENSAJES DE WHATSAPP
// ======================================================

app.post("/webhook", async (req, res) => {
  // Respondemos rápido a Meta
  res.sendStatus(200);

  try {
    const value =
      req.body?.entry?.[0]?.changes?.[0]?.value;

    const message =
      value?.messages?.[0];

    // Si no hay mensaje, ignoramos el evento
    if (!message) {
      return;
    }

    const numero = message.from;


    // ==================================================
    // CONTROL DE ACCESO
    // ==================================================

    if (!numerosAutorizados.includes(numero)) {
      console.log(
        "⛔ Intento de acceso no autorizado:",
        numero
      );

      await enviarMensaje(
        numero,
        "⛔ Acceso no autorizado\n\n" +
        "Tu número no está autorizado para utilizar este bot."
      );

      return;
    }


    // ==================================================
    // STICKERS
    // ==================================================

    if (message.type === "sticker") {
      console.log(
        "😂 Sticker recibido de:",
        numero
      );

      const respuesta =
        respuestasSticker[
          Math.floor(
            Math.random() * respuestasSticker.length
          )
        ];

      await enviarMensaje(
        numero,
        respuesta
      );

      return;
    }


// ======================================================
// MENSAJES QUE NO SON TEXTO
// ======================================================

if (message.type !== "text") {
  console.log(
    "⚠️ Mensaje recibido que no es texto:",
    message.type
  );

  // Elegimos un programador culpable al azar 😅
  const programadores = [
    "Enzo",
    "Nehuen",
    "Ariela",
    "Leandro"
  ];

  const culpable =
    programadores[
      Math.floor(Math.random() * programadores.length)
    ];

  let respuestaNoCompatible =
    "🤖 No tengo idea de qué me acabás de mandar.\n\n" +
    `Preguntale a ${culpable}, parece que se olvidó de programarme para esto.`;

  // ==================================================
  // FOTOS
  // ==================================================

  if (message.type === "image") {
    const respuestas = [
      `📷 Linda foto... probablemente.\n\nNo puedo verla. Reclamale a ${culpable}.`,
      `📷 Foto recibida.\n\n¿Verla? Eso no me lo programaron. Gracias, ${culpable}.`,
      `👀 Me mandaste una foto y yo sin poder verla.\n\nExcelente trabajo, ${culpable}.`,
      `📷 Recibí la imagen perfectamente.\n\nAhora solo falta que ${culpable} me enseñe a verla.`,
      `🤖 Detecto que es una foto. Hasta ahí llegan mis poderes.\n\nCualquier queja dirigila a ${culpable}.`
    ];

    respuestaNoCompatible =
      respuestas[
        Math.floor(Math.random() * respuestas.length)
      ];
  }

  // ==================================================
  // VIDEOS
  // ==================================================

  else if (message.type === "video") {
    const respuestas = [
      `🎥 Recibí el video, pero no puedo verlo.\n\nOtra funcionalidad que ${culpable} dejó para "más adelante".`,
      `🍿 Video recibido. Yo ya preparé los pochoclos, pero ${culpable} se olvidó de darme ojos.`,
      `🎥 Seguro es un videazo.\n\nLástima que ${culpable} decidió que yo no necesitaba verlo.`,
      `🤖 Puedo confirmar que me mandaste un video.\n\nEso es todo. Gracias por tanto, ${culpable} por olvidarte programarme unos ojos.`
    ];

    respuestaNoCompatible =
      respuestas[
        Math.floor(Math.random() * respuestas.length)
      ];
  }

  // ==================================================
  // AUDIOS
  // ==================================================

  else if (message.type === "audio") {
    const respuestas = [
      `🎙️ Audio recibido.\n\nEscucharlo no está dentro de mis habilidades. Consultas con ${culpable}.`,
      `🔊 Veo que mandaste un audio. Escucharlo ya sería pedirme demasiado.\n\n ${culpable} se olvido de enseñarme eso.`,
      `🎙️ Seguro dijiste algo importantísimo.\n\n Pero ${culpable} decidió que yo jamás lo sabría.`,
      `🤖 No escucho audios todavía.\n\nMandale uno a ${culpable} y que me lo traduzca.`,
      `🎧 Audio detectado.\n\nOídos instalados: 0.\n Programador Responsable: ${culpable}.`
    ];

    respuestaNoCompatible =
      respuestas[
        Math.floor(Math.random() * respuestas.length)
      ];
  }

  // ==================================================
  // DOCUMENTOS
  // ==================================================

  else if (message.type === "document") {
    const respuestas = [
      `📄 Archivo recibido.\n\nAbrirlo no me lo enseñaron. Preguntale a ${culpable}.`,
      `📄 Veo un documento.\n\n¿Leerlo? Esa actualización parece que ${culpable} todavía no la terminó.`,
      `🤖 Documento detectado correctamente.\n\nCapacidad para leerlo: ninguna.\nGracias a, ${culpable} por no programarme eso. `,
      `📄 Guardá ese archivo porque yo no sé qué hacer con él.\n\n${culpable} tendrá explicaciones.`
    ];

    respuestaNoCompatible =
      respuestas[
        Math.floor(Math.random() * respuestas.length)
      ];
  }

  // ==================================================
  // UBICACIONES
  // ==================================================

  else if (message.type === "location") {
    const respuestas = [
      `📍 Ubicación recibida.\n\n¿Y ahora qué hago con esto? Preguntale a ${culpable}.`,
      `🗺️ Sé que me mandaste una ubicación. Hasta ahí llegamos.\n\n${culpable} no me enseño todavia eso.`,
      `📍 Perfecto, una ubicación que no puedo utilizar.\n\nExcelente planificación.`
    ];

    respuestaNoCompatible =
      respuestas[
        Math.floor(Math.random() * respuestas.length)
      ];
  }

  // ==================================================
  // CONTACTOS
  // ==================================================

  else if (message.type === "contacts") {
    const respuestas = [
      `👤 Contacto recibido.\n\nNo sé qué hacer con él. ${culpable} sabrá por qué.`,
      `📇 Me mandaste un contacto.\n\nProcesarlo no estaba en los planes de ${culpable}, aparentemente.`,
      `👤 Contacto detectado.\n\nUtilidad para mí: ninguna.\nResponsable oficial de hoy: ${culpable} por programarme.`
    ];

    respuestaNoCompatible =
      respuestas[
        Math.floor(Math.random() * respuestas.length)
      ];
  }

  await enviarMensaje(
    numero,
    respuestaNoCompatible
  );

  return;
}


    // ==================================================
    // MENSAJES DE TEXTO
    // ==================================================

    const texto =
      message.text?.body;

    console.log("📩 Mensaje recibido");
    console.log("De:", numero);
    console.log("Texto:", texto);

    const respuesta =
      await procesarMensaje(
        texto,
        numero
      );

    if (!respuesta) {
      return;
    }

    await enviarMensaje(
      numero,
      respuesta
    );

  } catch (error) {
    console.error(
      "❌ Error:",
      error.response?.data ||
      error.message
    );
  }
});


// ======================================================
// BASE DE DATOS
// ======================================================

conectarDB();


// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(PORT, () => {
  console.log(
    `✅ Servidor iniciado en http://localhost:${PORT}`
  );

  console.log(
    `🔒 Números autorizados: ${numerosAutorizados.length}`
  );
});