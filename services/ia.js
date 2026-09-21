// ═══════════════════════════════════════════════════════════════════
// services/ia.js · genera el contenido de las actividades (Ahorcado,
// Verdadero/Falso, Opción múltiple, Sopa de letras, Memorama,
// Crucigrama) usando Google Gemini — capa gratuita, sin tarjeta.
//
// Apagado seguro: si no hay GEMINI_API_KEY, avisa y no truena.
// Usa "structured output" (responseSchema) para que Gemini regrese
// siempre el formato exacto que espera cada juego, no texto libre.
// ═══════════════════════════════════════════════════════════════════

import { env } from '../config/env.js';

const MODEL = 'gemini-2.5-flash';

function quitarAcentos(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// Esquemas de salida por tipo de actividad — Gemini SIEMPRE regresa
// exactamente esta forma, no hay que parsear texto libre.
const SCHEMAS = {
  ahorcado: {
    type: 'OBJECT',
    properties: {
      palabra: { type: 'STRING', description: 'Una sola palabra clave del tema, en mayúsculas, sin acentos, de 5 a 12 letras' },
      pista: { type: 'STRING', description: 'Pista breve (una oración) que ayude a adivinar la palabra sin decirla' }
    },
    required: ['palabra', 'pista']
  },
  vf: {
    type: 'OBJECT',
    properties: {
      enunciado: { type: 'STRING', description: 'Una afirmación clara sobre el tema, que pueda juzgarse como verdadera o falsa' },
      respuesta: { type: 'BOOLEAN', description: 'Si el enunciado es verdadero o falso' }
    },
    required: ['enunciado', 'respuesta']
  },
  opcion: {
    type: 'OBJECT',
    properties: {
      pregunta: { type: 'STRING', description: 'Una pregunta de opción múltiple sobre el tema' },
      opciones: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 3, maxItems: 3, description: 'Exactamente 3 opciones de respuesta, solo una correcta' },
      correcta: { type: 'INTEGER', description: 'Índice (0, 1 o 2) de la opción correcta dentro del arreglo "opciones"' }
    },
    required: ['pregunta', 'opciones', 'correcta']
  },
  sopa: {
    type: 'OBJECT',
    properties: {
      palabras: {
        type: 'ARRAY', items: { type: 'STRING' }, minItems: 7, maxItems: 7,
        description: 'Exactamente 7 palabras clave del tema, en mayúsculas, sin acentos ni espacios, de 3 a 12 letras cada una'
      }
    },
    required: ['palabras']
  },
  memorama: {
    type: 'OBJECT',
    properties: {
      parejas: {
        type: 'ARRAY', minItems: 5, maxItems: 5,
        items: {
          type: 'OBJECT',
          properties: { termino: { type: 'STRING' }, definicion: { type: 'STRING' } },
          required: ['termino', 'definicion']
        },
        description: 'Exactamente 5 pares de término (una palabra o frase corta) y su definición breve, sobre el tema'
      }
    },
    required: ['parejas']
  },
  crucigrama: {
    type: 'OBJECT',
    properties: {
      pistas: {
        type: 'ARRAY', minItems: 5, maxItems: 5,
        items: {
          type: 'OBJECT',
          properties: { palabra: { type: 'STRING' }, pista: { type: 'STRING' } },
          required: ['palabra', 'pista']
        },
        description: 'Exactamente 5 palabras clave (en mayúsculas, sin acentos, sin espacios) con su pista, sobre el tema. Preferir palabras que compartan letras entre sí para que se puedan cruzar.'
      }
    },
    required: ['pistas']
  }
};

function construirPrompt({ tipo, temaClase, temaCurso, area }) {
  const contexto = `Curso: "${temaCurso || ''}" (área: ${area || 'gastronomía'}). Clase específica: "${temaClase || ''}".`;
  return `Eres un diseñador instruccional que crea actividades de repaso para un club de capacitación en gastronomía (cocina, repostería, panadería, control de costos, inocuidad alimentaria, catering, bebidas). ${contexto}

Genera el contenido de la actividad en ESPAÑOL MEXICANO, directo, correcto y relevante específicamente al tema de la clase indicada (no genérico de cocina en general). No inventes datos falsos. No incluyas texto ofensivo ni fuera de tema. Responde únicamente con el contenido pedido, en el formato JSON indicado.`;
}

async function llamarGemini(prompt, schema) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.geminiApiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.9
    }
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `Gemini HTTP ${r.status}`;
    throw new Error(msg);
  }
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error('Gemini no regresó contenido');
  return JSON.parse(texto);
}

/**
 * Genera el contenido de una actividad y lo regresa ya en el mismo
 * formato de texto que usan los campos del admin (strings con "\n" o
 * ",", igual que si el admin lo hubiera escrito a mano).
 */
export async function generarActividadIA({ tipo, temaClase, temaCurso, area }) {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  const schema = SCHEMAS[tipo];
  if (!schema) throw new Error(`Tipo de actividad no soportado: ${tipo}`);

  const prompt = construirPrompt({ tipo, temaClase, temaCurso, area });
  const json = await llamarGemini(prompt, schema);

  switch (tipo) {
    case 'ahorcado':
      return { palabra: quitarAcentos(json.palabra).replace(/[^A-ZÑ]/g, ''), pista: (json.pista || '').trim() };

    case 'vf':
      return { enunciado: (json.enunciado || '').trim(), respuesta: !!json.respuesta };

    case 'opcion':
      return {
        pregunta: (json.pregunta || '').trim(),
        opciones: (json.opciones || []).slice(0, 3).map(o => (o || '').trim()),
        correcta: Math.min(2, Math.max(0, parseInt(json.correcta, 10) || 0))
      };

    case 'sopa': {
      const palabras = (json.palabras || [])
        .map(p => quitarAcentos(p).replace(/[^A-ZÑ]/g, ''))
        .filter(p => p.length >= 3 && p.length <= 12);
      return { palabras: palabras.join(', ') };
    }

    case 'memorama': {
      const parejas = (json.parejas || [])
        .filter(p => p.termino && p.definicion)
        .map(p => `${p.termino.trim()} = ${p.definicion.trim()}`);
      return { parejas: parejas.join('\n') };
    }

    case 'crucigrama': {
      const pistas = (json.pistas || [])
        .filter(p => p.palabra && p.pista)
        .map(p => `${quitarAcentos(p.palabra).replace(/[^A-ZÑ]/g, '')} = ${p.pista.trim()}`);
      return { pistas: pistas.join('\n') };
    }

    default:
      throw new Error(`Tipo de actividad no soportado: ${tipo}`);
  }
}
