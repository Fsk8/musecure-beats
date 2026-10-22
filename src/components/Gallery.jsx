import { useCallback, useEffect, useState } from 'react';
import { Panel } from './Panel';
import { useNear } from '../near/NearProvider';
import { getBeats } from '../near/contract';
import { CONTRACT_ID, explorerAccountUrl, shortAccount } from '../near/config';

/** Beats registrados en el contrato, del más nuevo al más antiguo. Lectura gratis, sin sesión. */
export function Gallery() {
  const { provider } = useNear();
  const [beats, setBeats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setBeats(await getBeats(provider, 12));
    } catch (e) {
      setError(`No se pudo leer el contrato: ${e?.message || e}`);
    }
  }, [provider]);

  useEffect(() => { load(); }, [load]);

  // Se recarga cuando se registra un beat nuevo desde la app.
  useEffect(() => {
    window.addEventListener('msb:beats-changed', load);
    return () => window.removeEventListener('msb:beats-changed', load);
  }, [load]);

  const summary = beats ? `${beats.length} ${beats.length === 1 ? 'beat' : 'beats'} en NEAR testnet` : 'Cargando…';

  return (
    <Panel id="gallery" title="Beats en NEAR" summary={summary}>
      <div className="bar spread">
        <a className="hint" href={explorerAccountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer">
          Contrato: {CONTRACT_ID}
        </a>
        <button onClick={load}>Actualizar</button>
      </div>
      {error && <p className="hint">{error}</p>}
      {beats && beats.length === 0 && <p className="hint">Todavía no hay beats registrados.</p>}
      {beats && beats.length > 0 && (
        <ul className="beat-list">
          {beats.map((b) => (
            <li key={b.token_id} className="beat-card">
              <div className="beat-top">
                <strong>{b.title}</strong>
                <span className="num">#{b.token_id}</span>
              </div>
              <div className="beat-meta">
                <span title={b.creator}>Autor: {shortAccount(b.creator)}</span>
                {b.owner_id !== b.creator && <span title={b.owner_id}>Dueño: {shortAccount(b.owner_id)}</span>}
                {b.parent_id && <span>Remix de #{b.parent_id}</span>}
                {b.remix_count > 0 && <span>{b.remix_count} remix{b.remix_count > 1 ? 'es' : ''}</span>}
                <span>{new Date(Number(b.created_at_ms)).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
