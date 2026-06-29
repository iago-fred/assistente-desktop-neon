import type { FastifyRequest, FastifyReply } from "fastify";
import type { MessagePayload, ApiResponse, Paragraph } from "../types/index.js";
import {
  validateAgent,
  routeMessageToAgent,
} from "../services/agentRouter.js";

// Mapa de emoji → tom
const EMOJI_TONE_MAP: Record<string, string> = {
  // animado
  '😄': 'animado', '🤩': 'animado', '🎉': 'animado', '🔥': 'animado',
  '🚀': 'animado', '✨': 'animado', '🎊': 'animado', '🥳': 'animado',
  '💥': 'animado', '⭐': 'animado', '🌟': 'animado', '💫': 'animado',
  // feliz
  '😊': 'feliz', '😁': 'feliz', '😃': 'feliz', '😸': 'feliz',
  '💙': 'feliz', '💕': 'feliz', '🥰': 'feliz', '❤️': 'feliz',
  '💖': 'feliz', '💜': 'feliz', '😍': 'feliz', '😘': 'feliz',
  // caloroso
  '🫶': 'caloroso', '🤗': 'caloroso', '☀️': 'caloroso', '🌅': 'caloroso',
  '🌸': 'caloroso', '🌺': 'caloroso',
  // pensativo
  '🤔': 'pensativo', '🧐': 'pensativo', '💭': 'pensativo',
  '🤷': 'pensativo', '🤷\u200d♂️': 'pensativo', '🤷\u200d♀️': 'pensativo',
  // brincalhao
  '😅': 'brincalhao', '😬': 'brincalhao', '🙃': 'brincalhao',
  '😜': 'brincalhao', '🤪': 'brincalhao', '😏': 'brincalhao',
  '😎': 'brincalhao', '🕶️': 'brincalhao',
  // triste
  '😢': 'triste', '😞': 'triste', '💔': 'triste', '😭': 'triste',
  '😩': 'triste', '😤': 'triste', '😠': 'triste', '💢': 'triste',
  // alerta
  '⚠️': 'alerta', '❗': 'alerta', '🚨': 'alerta', '🔴': 'alerta',
  '🛑': 'alerta', '❌': 'alerta', '🚫': 'alerta',
};

// Detecta o tom emocional de um parágrafo via emoji + regras textuais
function detectTone(paragraph: string): string {
  const text = paragraph.trim();
  if (!text) return 'neutro';

  // Passo 1: Verificar emojis (do fim pro começo — último emoji define tom)
  for (const char of [...text].reverse()) {
    const tone = EMOJI_TONE_MAP[char];
    if (tone) return tone;
  }

  // Passo 2: Regras de texto
  const lower = text.toLowerCase();

  // Alerta — palavras de urgência/perigo
  if (/\b(atenção|cuidado|importante|urgente|perigo)\b/i.test(text)) return 'alerta';

  // Animado — exclamação dupla ou mais
  if (/!{2,}$/.test(text.trim())) return 'animado';

  // Brincalhao — risadas, zoação
  if (/\b(kkk|rsrs|haha|lol|zoa(ndo|ção)?|troll(ei)?|zuera)\b/i.test(text)) return 'brincalhao';

  // Triste — lamentação, frustração
  if (/\b(que pena|triste|infelizmente|putz|poxa|droga|que merda)\b/i.test(lower)) return 'triste';

  // Caloroso — agradecimento, afeto
  if (/\b(obrigado|brigado|disponha|tamo junto|tmj|valeu|agradeço)\b/i.test(lower)) return 'caloroso';

  // Feliz — entusiasmo positivo
  if (/\b(amo|adoro|ótimo|maravilha|perfeito|show|baita)\b/i.test(text)) return 'feliz';

  // Pensativo — dúvida, interrogação
  if (/\?$/.test(text.trim()) || /\b(talvez|será|não sei|nao sei|quem sabe|depende)\b/i.test(lower)) return 'pensativo';

  // Animado (termina com exclamação simples)
  if (/!$/.test(text.trim())) return 'animado';

  return 'neutro';
}

function parseResponseWithTone(raw: string): Paragraph[] {
  if (!raw || !raw.trim()) return [];

  // Divide por parágrafos (dupla quebra de linha)
  const paragraphs = raw.split(/\n\n+/).filter(p => p.trim());

  return paragraphs.map(p => {
    // Remove marcador manual --tom: se existir (compatibilidade com mensagens antigas)
    const cleanText = p.trim().replace(/--tom:\s*\w+\s*$/g, '').trim();
    return {
      text: cleanText,
      tone: detectTone(cleanText),
    };
  });
}

export async function handleMessage(
  request: FastifyRequest<{ Body: MessagePayload }>,
  reply: FastifyReply,
): Promise<void> {
  const { agent, message, metadata } = request.body;

  // Validação básica
  if (!agent || !message) {
    const res: ApiResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Campos obrigatórios: 'agent' (string) e 'message' (string)",
    };
    reply.code(400).send(res);
    return;
  }

  // Valida se o agente existe
  const agentConfig = validateAgent(agent);
  if (!agentConfig) {
    const res: ApiResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      error: `Agente '${agent}' não encontrado. Agentes disponíveis: neon, emily, oliver`,
    };
    reply.code(404).send(res);
    return;
  }

  // Envia via openclaw agent --json (sessão webhook-interna)
  const result = await routeMessageToAgent(agent, message, metadata);

  if (result.success) {
      const paragraphs = parseResponseWithTone(result.response || '');

    const res: ApiResponse = {
      status: "sent",
      agent: agentConfig.name,
      response: paragraphs,
      timestamp: new Date().toISOString(),
    };
    reply.code(200).send(res);
  } else {
    const res: ApiResponse = {
      status: "error",
      agent: agentConfig.name,
      timestamp: new Date().toISOString(),
      error: result.output,
    };
    reply.code(502).send(res);
  }
}
