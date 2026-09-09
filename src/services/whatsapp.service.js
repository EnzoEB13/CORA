const axios = require("axios");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

/**
 * Envía un mensaje de texto por WhatsApp.
 */
async function enviarMensaje(numero, texto) {
  try {
    await axios.post(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numero,
        type: "text",
        text: {
          body: texto
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Respuesta enviada por WhatsApp");
  } catch (error) {
    console.error(
      "❌ Error enviando mensaje por WhatsApp:",
      error.response?.data || error.message
    );

    throw error;
  }
}

module.exports = {
  enviarMensaje
};