import { Panel } from './Panel';
import { Bubble, Monk } from './Monk';

// "How it works": la guía completa del producto, de hacer un beat a cobrar regalías y ganar batallas.
// Cada sección tiene un botón que abre el panel donde se hace.

const open = (id) => window.dispatchEvent(new CustomEvent('msb:open-panel', { detail: id }));

const SECTIONS = [
  {
    id: 'make', icon: '🎛', title: '1. Make a beat (no account needed)',
    steps: [
      'Press ▶ Play. The app opens with an example beat so you hear something right away.',
      'Pick a track (Drums, Bass, Lead, Chords) and click the cells to add notes. "Click edits" switches between notes, soft notes and probability.',
      'Change Root and Scale in Sound: every melodic track follows the key, so nothing sounds wrong.',
      'Try "Surprise me" for a random pattern per track, for all tracks, or only for the sounds. Drag bars to reorder them.',
      'Mixer: volume, reverb, delay, mute/solo and octave for each track. Length goes from 16 to 64 steps.',
      'Slow computer? Turn on Lite mode. The exported WAV is always rendered offline at full quality.',
    ],
  },
  {
    id: 'save', icon: '💾', title: '2. Save, export WAV and MIDI', action: ['save', 'Open Save & export'],
    steps: [
      'Save project: a small file with notes, sounds and mix that you can reopen later.',
      'Export WAV: choose how many loops; rendered offline with a tail for reverb and delay.',
      'Export MIDI: one track per instrument (drums on channel 10, General MIDI). Drag it into Ableton, Logic, FL Studio or Reaper.',
    ],
  },
  {
    id: 'register', icon: '⛓', title: '3. Register it on NEAR (it becomes an NFT)', action: ['register', 'Open Register on NEAR'],
    steps: [
      'Sign in with your email. You get a NEAR account automatically, activated for free. No wallet, no seed phrase.',
      'Give it a name. Optionally credit collaborators by email or NEAR account, for the whole beat or per track.',
      'Open (remixable) publishes the project so others can remix it. Sealed encrypts it to the NFT itself: only the current owner can open it.',
      'Set prices: remix license and non-exclusive license (0 = free / not for sale). Choose the audio length.',
      'Press Register beat. The WAV and project go to IPFS, their SHA-256 hashes and the MuSecure audio fingerprint go on chain.',
    ],
  },
  {
    id: 'gallery', icon: '🖼', title: '4. The Gallery: listen, verify, license, buy', action: ['gallery', 'Open the Gallery'],
    steps: [
      'Each NFT has a cover generated on chain from its notes, with a level (1–10) and badges that change as it lives.',
      'Verify audio downloads the WAV from IPFS and checks it against the hash stored on NEAR.',
      'Buy a non-exclusive license to use the beat (one per account). You get stems (WAV), MIDI and a license certificate. Anyone can check your license on chain.',
      'Remix opens the beat in the sequencer. Keep at least 30 % of the original and it registers as a remix that pays the original.',
      'Owners can list the NFT for sale, change prices, and register the beat on MuSecure (Monad) from the NFT\'s own account.',
    ],
  },
  {
    id: 'money', icon: '💸', title: '5. How the money flows', action: ['earnings', 'Open My earnings'],
    steps: [
      'Two rights, like in the music industry: authors (creator + credits, never change) and owner (whoever holds the NFT).',
      'Every license, remix license or support: 50 % to the owner (withdraw it in My earnings), 50 % stays inside the NFT for its authors.',
      '"Distribute" sends the money inside an NFT to its authors. Anyone can press it, and the money always goes to the authors.',
      'A remix sends 20 % of its authors\' share up to its original, in cascade through the whole tree.',
      'Selling the NFT: 90 % to the seller, 10 % to the authors. The buyer gets future owner earnings, the NFT\'s Monad account and the sealed project.',
    ],
  },
  {
    id: 'tree', icon: '🌳', title: '6. The royalty tree', action: ['tree', 'Open the Royalty tree'],
    steps: [
      'Pick a seed and see all its remixes, and the remixes of those remixes, as a living tree.',
      'Coins flow up the branches where money moves. Click any beat to see what it earned and what it sent to its original.',
    ],
  },
  {
    id: 'battles', icon: '⚔️', title: '7. Remix Battles and The Monk', action: ['battles', 'Open Battles'],
    steps: [
      'Every week there is a seed beat and a rule (for example "keep the bassline, change the drums"). Anyone can add NEAR to the prize.',
      'Press Remix the seed, make it yours, give it a name and register it as Open before the deadline. It enters automatically.',
      'When the battle closes, The Monk — an AI critic running on NEAR AI Cloud — judges every remix against the rule and writes a review and a mantra.',
      'The contract pays 50 / 30 / 20 % of the prize to the top three NFTs. The winner gets the "Battle winner" badge and two levels.',
      'Press Hear the verdict: The Monk listens to each remix, speaks his review and crowns the winner. Then share the verdict card.',
    ],
  },
  {
    id: 'trust', icon: '🔍', title: '8. Why you can trust it',
    steps: [
      'Every beat, license, sale, prize and royalty lives in the NEAR contract and can be checked on NearBlocks.',
      'The Monk\'s reviews are signed inside a secure enclave (TEE) by NEAR AI. The reviews, the exact request and the signature are published on IPFS.',
      'The Monk\'s key can only call settle_battle: he decides the ranking, but he cannot move the money anywhere else.',
      'Each NFT has its own address on other chains via NEAR Chain Signatures; only the current owner can make it sign.',
    ],
  },
  {
    id: 'path', icon: '🧘', title: '9. Learn by doing: The Monk\'s Path',
    steps: [
      'Below the sequencer, The Monk\'s Path walks you from your first groove to your first battle.',
      'Studio drills (four on the floor, call and response, leave space…) are checked live on the beat you have open.',
    ],
  },
];

export function Guide() {
  return (
    <Panel plain id="guide" title="How it works">
      <div className="monk-host">
        <Monk mood="calm" fader={0.5} size={90} />
        <Bubble>
          Welcome. Here you make a beat, and the beat becomes an account: it owns money, pays its creators and its seed,
          and can win battles. Read slowly. Or just press play.
        </Bubble>
      </div>
      <div className="tour">
        <span className="label">The 1-minute tour</span>
        <ol>
          <li><strong>Play.</strong> Press ▶ Play and click a few cells. Everything stays in key. <em>No account needed.</em></li>
          <li><strong>Own it.</strong> Sign in with your email and press <em>Register on NEAR</em>: your beat becomes an NFT that collects licenses and remix fees for you.</li>
          <li><strong>Play the game.</strong> Open <em>Battles</em>, remix this week's beat, and let The Monk judge it. Winners get paid by the contract.</li>
        </ol>
        <div className="bar">
          <button className="mini" onClick={() => open('battles')}>Open Battles →</button>
          <button className="mini" onClick={() => open('tree')}>See the royalty tree →</button>
        </div>
      </div>
      <span className="label">Details</span>
      <div className="guide">
        {SECTIONS.map((s) => (
          <details key={s.id} className="guide-section">
            <summary><span aria-hidden="true">{s.icon}</span> {s.title}</summary>
            <ol>
              {s.steps.map((t) => <li key={t}>{t}</li>)}
            </ol>
            {s.action && <button className="mini" onClick={() => open(s.action[0])}>{s.action[1]} →</button>}
          </details>
        ))}
      </div>
      <p className="hint">Everything runs on NEAR testnet: test NEAR has no real value. Not audited.</p>
    </Panel>
  );
}
