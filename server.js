require("dotenv").config();

const express = require("express");
const { enviarMensaje } = require("./src/services/whatsapp.service");
const {
  procesarMensaje,
  procesarMensajePersonal
} = require("./src/services/bot.service");
const { buscarPersonaPorTelefono } = require("./src/services/persona.service");
const conectarDB = require("./src/config/db");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const numerosAutorizados = (process.env.WHATSAPP_NUMEROS_AUTORIZADOS || "")
  .split(",")
  .map(numero => numero.trim().replace(/\D/g, ""))
  .filter(Boolean);

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

app.get("/", (req, res) => {
  res.send("Gestor de Actividades funcionando");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    return res.status(200).send(challenge);
  }

  console.log("❌ Error verificando webhook");
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return;

    const numero = (message.from || "").replace(/\D/g, "");
    const esAdministrador = numerosAutorizados.includes(numero);
    const persona = esAdministrador ? null : await buscarPersonaPorTelefono(numero);
    const esPersonal = Boolean(persona);

    // Solo administradores y personal registrado pueden interactuar.
    if (!esAdministrador && !esPersonal) {
      console.log("⛔ Intento de acceso no autorizado:", numero);
      await enviarMensaje(
        numero,
        "⛔ Acceso no autorizado\n\nTu número no está registrado para utilizar CORA."
      );
      return;
    }

    // Los mensajes multimedia graciosos funcionan tanto para admins como para personal.
    if (message.type === "sticker") {
      const respuesta = respuestasSticker[Math.floor(Math.random() * respuestasSticker.length)];
      await enviarMensaje(numero, respuesta);
      return;
    }

    if (message.type !== "text") {
      const programadores = ["Enzo", "Nehuen", "Ariela", "Leandro"];
      const culpable = programadores[Math.floor(Math.random() * programadores.length)];

      let respuesta = `🤖 No tengo idea de qué me acabás de mandar.\n\nPreguntale a ${culpable}, parece que se olvidó de programarme para esto.`;

      if (message.type === "image") {
        const opciones = [
          `📷 Linda foto... probablemente.\n\nNo puedo verla. Reclamale a ${culpable}.`,
          `📷 Foto recibida.\n\n¿Verla? Eso no me lo programaron. Gracias, ${culpable}.`,
          `👀 Me mandaste una foto y yo sin poder verla.\n\nExcelente trabajo, ${culpable}.`,
          `📷 Recibí la imagen perfectamente.\n\nAhora solo falta que ${culpable} me enseñe a verla.`,
          `🤖 Detecto que es una foto. Hasta ahí llegan mis poderes.\n\nCualquier queja dirigila a ${culpable}.`
        ];
        respuesta = opciones[Math.floor(Math.random() * opciones.length)];
      } else if (message.type === "video") {
        const opciones = [
          `🎥 Recibí el video, pero no puedo verlo.\n\nOtra funcionalidad que ${culpable} dejó para "más adelante".`,
          `🍿 Video recibido. Yo ya preparé los pochoclos, pero ${culpable} se olvidó de darme ojos.`,
          `🎥 Seguro es un videazo.\n\nLástima que ${culpable} decidió que yo no necesitaba verlo.`,
          `🤖 Puedo confirmar que me mandaste un video.\n\nEso es todo. Gracias por tanto, ${culpable}.`
        ];
        respuesta = opciones[Math.floor(Math.random() * opciones.length)];
      } else if (message.type === "audio") {
        const opciones = [
          `🎙️ Audio recibido.\n\nEscucharlo no está dentro de mis habilidades. Consultas con ${culpable}.`,
          `🔊 Veo que mandaste un audio. Escucharlo ya sería pedirme demasiado.\n\n${culpable} se olvidó de enseñarme eso.`,
          `🎙️ Seguro dijiste algo importantísimo.\n\nPero ${culpable} decidió que yo jamás lo sabría.`,
          `🤖 No escucho audios todavía.\n\nMandale uno a ${culpable} y que me lo traduzca.`,
          `🎧 Audio detectado.\n\nOídos instalados: 0.\nProgramador responsable: ${culpable}.`
        ];
        respuesta = opciones[Math.floor(Math.random() * opciones.length)];
      } else if (message.type === "document") {
        const opciones = [
          `📄 Archivo recibido.\n\nAbrirlo no me lo enseñaron. Preguntale a ${culpable}.`,
          `📄 Veo un documento.\n\n¿Leerlo? Esa actualización parece que ${culpable} todavía no la terminó.`,
          `🤖 Documento detectado correctamente.\n\nCapacidad para leerlo: ninguna. Gracias a ${culpable}.`,
          `📄 Guardá ese archivo porque yo no sé qué hacer con él.\n\n${culpable} tendrá explicaciones.`
        ];
        respuesta = opciones[Math.floor(Math.random() * opciones.length)];
      } else if (message.type === "location") {
        const opciones = [
          `📍 Ubicación recibida.\n\n¿Y ahora qué hago con esto? Preguntale a ${culpable}.`,
          `🗺️ Sé que me mandaste una ubicación. Hasta ahí llegamos.\n\n${culpable} no me enseñó todavía eso.`,
          "📍 Perfecto, una ubicación que no puedo utilizar.\n\nExcelente planificación."
        ];
        respuesta = opciones[Math.floor(Math.random() * opciones.length)];
      } else if (message.type === "contacts") {
        const opciones = [
          `👤 Contacto recibido.\n\nNo sé qué hacer con él. ${culpable} sabrá por qué.`,
          `📇 Me mandaste un contacto.\n\nProcesarlo no estaba en los planes de ${culpable}, aparentemente.`,
          `👤 Contacto detectado.\n\nUtilidad para mí: ninguna.\nResponsable oficial de hoy: ${culpable}.`
        ];
        respuesta = opciones[Math.floor(Math.random() * opciones.length)];
      }

      await enviarMensaje(numero, respuesta);
      return;
    }

    const texto = message.text?.body || "";
    console.log("📩 Mensaje recibido");
    console.log("De:", numero);
    console.log("Rol:", esAdministrador ? "administrador" : `personal (${persona.nombre} ${persona.apellido})`);
    console.log("Texto:", texto);

    const respuesta = esAdministrador
      ? await procesarMensaje(texto, numero)
      : await procesarMensajePersonal(texto, persona);

    if (!respuesta) return;

    if (Array.isArray(respuesta)) {
      for (const mensaje of respuesta) {
        await enviarMensaje(numero, mensaje);
      }
      return;
    }

    await enviarMensaje(numero, respuesta);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
});

conectarDB();

app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en http://localhost:${PORT}`);
  console.log(`🔒 Administradores configurados: ${numerosAutorizados.length}`);
});
