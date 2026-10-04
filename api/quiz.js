import { QuizError, adminQuiz, createQuiz, createSolo, getQuiz, mutateQuiz, presentQuiz, quizMeta } from './_quiz.js';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function eventStream(request, roomCode, viewerId) {
  const encoder = new TextEncoder();
  let closed = false;
  const body = new ReadableStream({
    start(controller) {
      const close = () => { closed = true; try { controller.close(); } catch { /* fermé */ } };
      request.signal.addEventListener('abort', close, { once: true });
      const run = async () => {
        let previous = '';
        const startedAt = Date.now();
        let lastPing = Date.now();
        try {
          while (!closed && Date.now() - startedAt < 19000) {
            const game = presentQuiz(await getQuiz(roomCode, viewerId), viewerId);
            const snapshot = { ...game };
            delete snapshot.serverNow;
            const fingerprint = JSON.stringify(snapshot);
            if (fingerprint !== previous) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ game })}\n\n`));
              previous = fingerprint;
              lastPing = Date.now();
            } else if (Date.now() - lastPing > 10000) {
              controller.enqueue(encoder.encode(': keepalive\n\n'));
              lastPing = Date.now();
            }
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        } catch (error) {
          if (!closed) controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Flux interrompu.' })}\n\n`));
        } finally {
          close();
        }
      };
      run();
    },
    cancel() { closed = true; }
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      if (url.searchParams.get('meta') === '1') return response({ meta: await quizMeta() });
      if (url.searchParams.get('stream') === '1') return eventStream(request, url.searchParams.get('code'), url.searchParams.get('playerId') || '');
      const game = await getQuiz(url.searchParams.get('code'), url.searchParams.get('playerId') || '');
      return response({ game: presentQuiz(game, url.searchParams.get('playerId') || '') });
    }
    if (request.method !== 'POST') return response({ error: 'Méthode non prise en charge.' }, 405);
    const input = await request.json();
    if (String(input.action || '').startsWith('admin-')) return response(await adminQuiz(input));
    const game = input.action === 'create' ? await createQuiz(input) : input.action === 'solo' ? await createSolo(input) : await mutateQuiz(input);
    return response({ game: presentQuiz(game, input.playerId || '') });
  } catch (error) {
    const status = error instanceof QuizError || error.status ? error.status || 400 : 500;
    return response({ error: error.message || 'Erreur du salon Quiz Battle.' }, status);
  }
}
