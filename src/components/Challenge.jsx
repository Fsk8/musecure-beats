import { Panel } from './Panel';

export function Challenge({ done }) {
  return (
    <Panel id="challenge" title="Challenge" summary={done ? 'Challenge 1: done!' : 'Challenge 1: pending'}>
      <div className="challenge">
        <p>
          <strong>Challenge 1:</strong> kick on steps 1 and 9, snare on 5 and 13, at least 4 lead notes and one chord.
        </p>
        <span className={`badge${done ? ' ok' : ''}`}>{done ? 'Done!' : 'Pending'}</span>
      </div>
    </Panel>
  );
}
