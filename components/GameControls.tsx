import React from 'react';
import { Wand2, RotateCcw, Scroll, Sparkles, Wind, Crown, Shuffle, DoorOpen, Skull, Cat, Lock, Coins } from 'lucide-react';
import { PieceColor, SpellCounts, SpellType } from '../types';

interface GameControlsProps {
  turn: PieceColor;
  spellCounts: SpellCounts;
  activeSpell: SpellType;
  onActivateSpell: (type: SpellType) => void;
  onReset: () => void;
  winner: PieceColor | 'draw' | null;
  history: string[];
  checkBalance: string | null;
  potSize?: number; 
}

const SpellCounter = ({ count, max = 3, colorClass = "bg-purple-400" }: { count: number, max?: number, colorClass?: string }) => (
  <div className="flex gap-1">
    {[...Array(max)].map((_, i) => (
      <div 
        key={i} 
        className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full transition-colors duration-300 
          ${i < count 
            ? `${colorClass} shadow-[0_0_8px_currentColor]` 
            : 'bg-slate-700'
          }`} 
      />
    ))}
  </div>
);

const GameControls: React.FC<GameControlsProps> = ({ 
  turn, 
  spellCounts, 
  activeSpell, 
  onActivateSpell, 
  onReset,
  winner,
  history,
  checkBalance,
  potSize = 0
}) => {
  const canSummon = spellCounts[turn].summon > 0;
  const canTransform = spellCounts[turn].transform > 0;
  const canSlip = spellCounts[turn].slip > 0;
  const canEmpower = spellCounts[turn].empower > 0;
  const canExchange = spellCounts[turn].exchange > 0;
  const canPortal = spellCounts[turn].portal > 0;
  const canSacrifice = spellCounts[turn].sacrifice > 0;
  const canCat = spellCounts[turn].cat > 0;

  const toggleSummon = () => {
    if (activeSpell === 'summon') onActivateSpell('none');
    else onActivateSpell('summon');
  };

  const toggleTransform = () => {
    if (activeSpell === 'transform') onActivateSpell('none');
    else onActivateSpell('transform');
  };

  const toggleSlip = () => {
    if (activeSpell === 'slip') onActivateSpell('none');
    else onActivateSpell('slip');
  };

  const toggleEmpower = () => {
    if (activeSpell === 'empower') onActivateSpell('none');
    else onActivateSpell('empower');
  };

  const toggleExchange = () => {
    if (activeSpell === 'exchange') onActivateSpell('none');
    else onActivateSpell('exchange');
  };

  const togglePortal = () => {
    if (activeSpell === 'portal') onActivateSpell('none');
    else onActivateSpell('portal');
  };

  const toggleSacrifice = () => {
    if (activeSpell === 'sacrifice') onActivateSpell('none');
    else onActivateSpell('sacrifice');
  };

  const toggleCat = () => {
    if (activeSpell === 'cat') onActivateSpell('none');
    else onActivateSpell('cat');
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6 w-full max-w-md p-4 lg:p-6 bg-slate-800 rounded-xl shadow-xl border border-slate-700">
      
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-bold text-white mb-1">Game Status</h2>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${winner ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          {winner 
            ? (winner === 'draw' ? 'Draw!' : `${winner === 'w' ? 'White' : 'Black'} Wins!`) 
            : `${turn === 'w' ? "White" : "Black"}'s Turn`
          }
        </div>
        
        {potSize > 0 && (
            <div className="flex items-center justify-center gap-2 text-yellow-400 bg-yellow-400/10 py-1 px-4 rounded-full border border-yellow-400/30">
                <Coins className="w-4 h-4" />
                <span className="font-bold font-mono">POT: {potSize} CHECK</span>
            </div>
        )}
      </div>

      <div className="space-y-3 lg:space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Grimoire</h3>
        <div className="grid grid-cols-2 gap-2 lg:gap-3">
          
          {/* Summon Spell: Pawn ranks 3-6 (3 times) */}
          <div className="col-span-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700 relative overflow-hidden">
             <div className="flex justify-between mb-2 text-[10px]">
                <SpellCounter count={spellCounts.w.summon} />
                <SpellCounter count={spellCounts.b.summon} />
             </div>
             <button
                onClick={toggleSummon}
                disabled={!canSummon || !!winner}
                title="Summon a pawn (Ranks 3-6)"
                className={`w-full flex flex-col items-center justify-center p-2 rounded-md font-bold text-xs transition-all duration-200
                  ${activeSpell === 'summon'
                    ? 'bg-purple-600 text-white' 
                    : canSummon && !winner
                      ? 'bg-slate-700 hover:bg-slate-600 text-purple-300'
                      : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center gap-1 mb-1">
                    <Wand2 className={`w-4 h-4 ${activeSpell === 'summon' ? 'animate-pulse' : ''}`} />
                </div>
                <span>Summon</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Ranks 3-6</span>
              </button>
          </div>

          <div className="col-span-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
             <div className="flex justify-between mb-2 text-[10px]">
                <SpellCounter count={spellCounts.w.transform} colorClass="bg-emerald-400" />
                <SpellCounter count={spellCounts.b.transform} colorClass="bg-emerald-400" />
             </div>
             <button
                onClick={toggleTransform}
                disabled={!canTransform || !!winner}
                className={`w-full flex flex-col items-center justify-center p-2 rounded-md font-bold text-xs transition-all duration-200
                  ${activeSpell === 'transform'
                    ? 'bg-emerald-600 text-white' 
                    : canTransform && !winner
                      ? 'bg-slate-700 hover:bg-slate-600 text-emerald-300'
                      : 'bg-slate-800 text-slate-600'
                  }
                `}
              >
                <Sparkles className={`w-4 h-4 mb-1 ${activeSpell === 'transform' ? 'animate-pulse' : ''}`} />
                Morph
              </button>
          </div>

          <div className="col-span-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
             <div className="flex justify-between mb-2 text-[10px]">
                <SpellCounter count={spellCounts.w.slip} max={5} colorClass="bg-cyan-400" />
                <SpellCounter count={spellCounts.b.slip} max={5} colorClass="bg-cyan-400" />
             </div>
             <button
                onClick={toggleSlip}
                disabled={!canSlip || !!winner}
                className={`w-full flex flex-col items-center justify-center p-2 rounded-md font-bold text-xs transition-all duration-200
                  ${activeSpell === 'slip'
                    ? 'bg-cyan-600 text-white' 
                    : canSlip && !winner
                      ? 'bg-slate-700 hover:bg-slate-600 text-cyan-300'
                      : 'bg-slate-800 text-slate-600'
                  }
                `}
              >
                <Wind className={`w-4 h-4 mb-1 ${activeSpell === 'slip' ? 'animate-pulse' : ''}`} />
                Mist Step
              </button>
          </div>

          <div className="col-span-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
             <div className="flex justify-between mb-2 text-[10px]">
                <SpellCounter count={spellCounts.w.empower} max={1} colorClass="bg-amber-400" />
                <SpellCounter count={spellCounts.b.empower} max={1} colorClass="bg-amber-400" />
             </div>
             <button
                onClick={toggleEmpower}
                disabled={!canEmpower || !!winner}
                className={`w-full flex flex-col items-center justify-center p-2 rounded-md font-bold text-xs transition-all duration-200
                  ${activeSpell === 'empower'
                    ? 'bg-amber-600 text-white' 
                    : canEmpower && !winner
                      ? 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                      : 'bg-slate-800 text-slate-600'
                  }
                `}
              >
                <Crown className={`w-4 h-4 mb-1 ${activeSpell === 'empower' ? 'animate-pulse' : ''}`} />
                Queen's Grace
              </button>
          </div>

        </div>
      </div>

      <div className="flex-1 min-h-[120px] bg-slate-900 rounded-lg p-3 border border-slate-700 flex flex-col">
         <div className="flex items-center gap-2 mb-2 text-slate-400 pb-2 border-b border-slate-800">
            <Scroll className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Move Log</span>
         </div>
         <div className="flex-1 overflow-y-auto pr-2 max-h-[120px] text-sm text-slate-300 font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {history.reduce((result: any[], move, index) => {
                  if (index % 2 === 0) {
                    result.push(
                        <div key={index} className="flex gap-2">
                             <span className="text-slate-500 w-4">{Math.floor(index / 2) + 1}.</span>
                             <span>{move}</span>
                        </div>
                    );
                  } else {
                     const last = result[result.length - 1];
                     result[result.length - 1] = (
                         <React.Fragment key={index}>
                            {last}
                            <span>{move}</span>
                         </React.Fragment>
                     )
                  }
                  return result;
                }, [])}
            </div>
         </div>
      </div>

      <button 
        onClick={onReset}
        className="flex items-center justify-center gap-2 w-full py-2 text-sm text-slate-400 hover:text-white transition-colors border-t border-slate-700 pt-4"
      >
        <RotateCcw className="w-4 h-4" />
        Reset Game
      </button>

    </div>
  );
};

export default GameControls;
