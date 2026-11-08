/**
 * Envío de mensajes por Telegram con el bot personal del usuario. El token y el chat vienen de
 * los secretos TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID; nunca se imprimen.
 */

/** Escapa el texto para el modo HTML de Telegram. */
export function escaparHtml(texto) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function enviarTelegram(token, chat, texto) {
  const respuesta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: escaparHtml(texto), parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(`Telegram respondió ${respuesta.status}: ${String(cuerpo?.description ?? "").slice(0, 120)}`);
  }
}
