import { Panel } from './Panel';

export function Challenge({ done }) {
  return (
    <Panel id="challenge" title="Reto" summary={done ? 'Reto 1: ¡logrado!' : 'Reto 1: pendiente'}>
      <div className="challenge">
        <p>
          <strong>Reto 1:</strong> bombo en los tiempos 1 y 9, caja en 5 y 13, al menos 4 notas de lead y un acorde.
        </p>
        <span className={`badge${done ? ' ok' : ''}`}>{done ? '¡Logrado!' : 'Pendiente'}</span>
      </div>
    </Panel>
  );
}
