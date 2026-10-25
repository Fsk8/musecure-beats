// Función de Vercel: el crítico cierra las Remix Battles que ya terminaron.
//
// - Cron diario de Vercel (GET con "Authorization: Bearer $CRON_SECRET") o a mano (POST con el mismo encabezado).
// - POST { battleId, dryRun: true }: califica sin tocar la blockchain ni subir nada (para probar).
// - Para cada batalla vencida y sin cerrar: califica, sube las reseñas a IPFS y llama a settle_battle.
//
// Variables de entorno (servidor):
//   CRON_SECRET          secreto compartido con el cron de Vercel (y para el disparo manual)
//   CRITIC_ACCOUNT_ID    ej. critic.musecure-beats-v2.testnet
//   CRITIC_PRIVATE_KEY   llave function-call restringida a settle_battle (no puede mover fondos)
//   NEARAI_API_KEY       NEAR AI Cloud (opcional: sin ella califica el crítico de prueba)
//   NEARAI_MODEL         opcional, por defecto Qwen/Qwen3.6-35B-A3B-FP8
//   LIGHTHOUSE_API_KEY   para subir las reseñas

import { Account } from '@near-js/accounts';
import { KeyPairSigner } from '@near-js/signers';
import { BEATS_CONTRACT, nearProvider, readJson } from './_lib/musecure.js';
import { getBattles, judgeBattle, uploadJson } from './_lib/critic.js';

export const config = { maxDuration: 300 };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
}

async function settle(battle) {
  const report = await judgeBattle(battle);
  const reviewCid = await uploadJson(report, `critic_battle_${battle.id}.json`);
  const critic = new Account(
    process.env.CRITIC_ACCOUNT_ID,
    nearProvider(),
    KeyPairSigner.fromSecretKey(process.env.CRITIC_PRIVATE_KEY),
  );
  const outcome = await critic.callFunctionRaw({
    contractId: BEATS_CONTRACT,
    methodName: 'settle_battle',
    args: {
      battle_id: battle.id,
      scores: report.reviews.map((r) => ({ token_id: r.token_id, score: r.score })),
      review_cid: reviewCid,
    },
    gas: 300000000000000n,
    deposit: 0n,
  });
  const failure = outcome?.status?.Failure;
  if (failure) throw new Error(`settle_battle failed: ${JSON.stringify(failure).slice(0, 300)}`);
  return { battleId: battle.id, reviewCid, txHash: outcome?.transaction?.hash, mode: report.critic.mode, entries: report.reviews.length };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET or POST' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    const battles = await getBattles();

    if (body.dryRun) {
      const battle = battles.find((b) => b.id === Number(body.battleId));
      if (!battle) return res.status(404).json({ error: 'Battle not found' });
      return res.status(200).json(await judgeBattle(battle));
    }

    const missing = ['CRITIC_ACCOUNT_ID', 'CRITIC_PRIVATE_KEY', 'LIGHTHOUSE_API_KEY'].filter((k) => !process.env[k]);
    if (missing.length) return res.status(500).json({ error: `Missing server variables: ${missing.join(', ')}` });

    const now = Date.now();
    const due = battles.filter((b) => !b.settled && Number(b.ends_ms) <= now
      && (body.battleId === undefined || b.id === Number(body.battleId)));
    const results = [];
    for (const battle of due) {
      try {
        results.push(await settle(battle));
      } catch (e) {
        results.push({ battleId: battle.id, error: e.message });
      }
    }
    return res.status(200).json({ settled: results });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Critic failed' });
  }
}
