import React, { useState, useEffect } from 'react';
import { ChessGameEngine, isValidSpellRank } from '../utils/chessEngine';
import * as Icons from './Icons';
import { PieceColor, PieceType, SpellType } from '../types';
import { Zap } from 'lucide-react';

interface ChessBoardProps {
  engine: ChessGameEngine;
  fen: string; 
  activeSpell: SpellType;
  onMove: (from: string, to: string) => void;
  onSpellCast: (target: string, source?: string) => void;
  turn: PieceColor;
  animatingSquare: { square: string, type: SpellType } | null;
  orientation?: 'w' | 'b';
  invisiblePiece: string | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Helper to get piece icon
const getPieceIcon = (type: PieceType, color: PieceColor) => {
  if (color === 'w') {
    switch (type) {
      case 'p': return Icons.PawnWhite;
      case 'r': return Icons.RookWhite;
      case 'n': return Icons.KnightWhite;
      case 'b': return Icons.BishopWhite;
      case 'q': return Icons.QueenWhite;
      case 'k': return Icons.KingWhite;
    }
  } else {
    switch (type) {
      case 'p': return Icons.PawnBlack;
      case 'r': return Icons.RookBlack;
      case 'n': return Icons.KnightBlack;
      case 'b': return Icons.BishopBlack;
      case 'q': return Icons.QueenBlack;
      case 'k': return Icons.KingBlack;
    }
  }
  return () => null;
};

const ChessBoard: React.FC<ChessBoardProps> = ({ 
  engine,
  fen,
  activeSpell, 
  onMove, 
  onSpellCast, 
  turn, 
  animatingSquare, 
  orientation = 'w',
  invisiblePiece
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [spellSourceSquare, setSpellSourceSquare] = useState<string | null>(null);
  const [validSpellTargets, setValidSpellTargets] = useState<string[]>([]);
  const [stunnedSquares, setStunnedSquares] = useState<string[]>([]);
  
  // Cat Spell State: Intermediate move selection
  const [catMoveSquare, setCatMoveSquare] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSquare(null);
    setValidMoves([]);
    setSpellSourceSquare(null);
    setValidSpellTargets([]);
    setCatMoveSquare(null);
    setStunnedSquares(engine.getStunnedSquares());
  }, [fen, activeSpell, engine]);

  const handleSquareClick = (square: string) => {
    // 0. Prevent selection of stunned pieces if they belong to current turn
    if (stunnedSquares.includes(square) && activeSpell !== 'cat') {
        const piece = engine.get(square);
        if (piece && piece.color === turn) return; 
    }

    // 1. Summon Pawn Spell
    if (activeSpell === 'summon') {
      if (isValidSpellRank(square)) {
        onSpellCast(square);
      }
      return;
    }

    // 2. Transform Spell
    if (activeSpell === 'transform') {
      const piece = engine.get(square);
      if (piece && piece.color === turn && ['p', 'r', 'b'].includes(piece.type)) {
        onSpellCast(square);
      }
      return;
    }

    // 3. Slip Spell
    if (activeSpell === 'slip') {
      if (spellSourceSquare) {
        if (validSpellTargets.includes(square)) {
          onSpellCast(square, spellSourceSquare);
          return;
        }
        if (square === spellSourceSquare) {
          setSpellSourceSquare(null);
          setValidSpellTargets([]);
          return;
        }
        const piece = engine.get(square);
        if (piece && piece.color === turn && ['p', 'n', 'r'].includes(piece.type)) {
          setSpellSourceSquare(square);
          const possibleTargets = getSlipTargets(square);
          setValidSpellTargets(possibleTargets);
          return;
        }
        setSpellSourceSquare(null);
        setValidSpellTargets([]);
        return;
      } else {
        const piece = engine.get(square);
        if (piece && piece.color === turn && ['p', 'n', 'r'].includes(piece.type)) {
            setSpellSourceSquare(square);
            const possibleTargets = getSlipTargets(square);
            setValidSpellTargets(possibleTargets);
        }
        return;
      }
    }

    // 4. Empower Spell
    if (activeSpell === 'empower') {
        if (spellSourceSquare) {
            if (validSpellTargets.includes(square)) {
                onSpellCast(square, spellSourceSquare);
                return;
            }
            if (square === spellSourceSquare) {
                setSpellSourceSquare(null);
                setValidSpellTargets([]);
                return;
            }
            const piece = engine.get(square);
            if (piece && piece.color === turn && ['n', 'b', 'r'].includes(piece.type)) {
                setSpellSourceSquare(square);
                const targets = engine.getLegalMoves(square, 'empower', square);
                setValidSpellTargets(targets);
                return;
            }
            setSpellSourceSquare(null);
            setValidSpellTargets([]);
            return;
        } else {
            const piece = engine.get(square);
            if (piece && piece.color === turn && ['n', 'b', 'r'].includes(piece.type)) {
                setSpellSourceSquare(square);
                const targets = engine.getLegalMoves(square, 'empower', square);
                setValidSpellTargets(targets);
            }
            return;
        }
    }

    // 5. Exchange Spell
    if (activeSpell === 'exchange') {
      if (spellSourceSquare) {
        if (validSpellTargets.includes(square)) {
          onSpellCast(square, spellSourceSquare);
          return;
        }
        if (square === spellSourceSquare) {
          setSpellSourceSquare(null);
          setValidSpellTargets([]);
          return;
        }
        const piece = engine.get(square);
        if (piece && piece.color === turn && ['n', 'b', 'r', 'q'].includes(piece.type)) {
          setSpellSourceSquare(square);
          const targets = getExchangeTargets(square, piece.type);
          setValidSpellTargets(targets);
          return;
        }
        setSpellSourceSquare(null);
        setValidSpellTargets([]);
        return;
      } else {
        const piece = engine.get(square);
        if (piece && piece.color === turn && ['n', 'b', 'r', 'q'].includes(piece.type)) {
          setSpellSourceSquare(square);
          const targets = getExchangeTargets(square, piece.type);
          setValidSpellTargets(targets);
        }
        return;
      }
    }

    // 6. Portal Spell
    if (activeSpell === 'portal') {
      if (spellSourceSquare) {
        if (validSpellTargets.includes(square)) {
          onSpellCast(square, spellSourceSquare);
          return;
        }
        if (square === spellSourceSquare) {
          setSpellSourceSquare(null);
          setValidSpellTargets([]);
          return;
        }
        const piece = engine.get(square);
        if (piece && piece.color === turn) {
           setSpellSourceSquare(square);
           const targets = engine.getLegalMoves(square, 'portal', square);
           setValidSpellTargets(targets);
           return;
        }
        setSpellSourceSquare(null);
        setValidSpellTargets([]);
        return;
      } else {
        const piece = engine.get(square);
        if (piece && piece.color === turn) {
           setSpellSourceSquare(square);
           const targets = engine.getLegalMoves(square, 'portal', square);
           setValidSpellTargets(targets);
        }
        return;
      }
    }

    // 7. Sacrifice Spell
    if (activeSpell === 'sacrifice') {
        if (spellSourceSquare) {
            if (validSpellTargets.includes(square)) {
                onSpellCast(square, spellSourceSquare);
                return;
            }
            if (square === spellSourceSquare) {
                setSpellSourceSquare(null);
                setValidSpellTargets([]);
                return;
            }
            const piece = engine.get(square);
            if (piece && piece.color === turn && ['q', 'r', 'b', 'n'].includes(piece.type)) {
                setSpellSourceSquare(square);
                const targets = getSacrificeTargets(square, piece.type);
                setValidSpellTargets(targets);
                return;
            }
            setSpellSourceSquare(null);
            setValidSpellTargets([]);
            return;
        } else {
            const piece = engine.get(square);
            if (piece && piece.color === turn && ['q', 'r', 'b', 'n'].includes(piece.type)) {
                setSpellSourceSquare(square);
                const targets = getSacrificeTargets(square, piece.type);
                setValidSpellTargets(targets);
            }
            return;
        }
    }

    // 8. Cat Spell
    if (activeSpell === 'cat') {
      // Step 3: Select Stun Target (if move is already selected)
      if (spellSourceSquare && catMoveSquare) {
          if (validSpellTargets.includes(square)) {
              // Execute Spell: Target = "moveSquare,stunSquare"
              onSpellCast(`${catMoveSquare},${square}`, spellSourceSquare);
              return;
          }
          // Click pending move square to cancel move selection
          if (square === catMoveSquare) {
              setCatMoveSquare(null);
              // Recalculate move targets from source
              const targets = engine.getLegalMoves(spellSourceSquare, 'cat', spellSourceSquare);
              setValidSpellTargets(targets);
              return;
          }
          // Click source to reset all
          if (square === spellSourceSquare) {
             setSpellSourceSquare(null);
             setCatMoveSquare(null);
             setValidSpellTargets([]);
             return;
          }
          return;
      }

      // Step 2: Select Move Target (if source is selected but move is not)
      if (spellSourceSquare && !catMoveSquare) {
        if (validSpellTargets.includes(square)) {
          setCatMoveSquare(square);
          // Update valid targets to be STUN targets from this new square
          const stunTargets = engine.getCatStunTargets(square, turn);
          setValidSpellTargets(stunTargets);
          return;
        }
        if (square === spellSourceSquare) {
          setSpellSourceSquare(null);
          setValidSpellTargets([]);
          return;
        }
        // Change selection
        const piece = engine.get(square);
        if (piece && piece.color === turn) {
           setSpellSourceSquare(square);
           const targets = engine.getLegalMoves(square, 'cat', square);
           setValidSpellTargets(targets);
           return;
        }
        setSpellSourceSquare(null);
        setValidSpellTargets([]);
        return;
      } 
      
      // Step 1: Select Source
      else {
        const piece = engine.get(square);
        if (piece && piece.color === turn) {
           setSpellSourceSquare(square);
           const targets = engine.getLegalMoves(square, 'cat', square);
           setValidSpellTargets(targets);
        }
        return;
      }
    }

    // 9. Normal Move Handling
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
      
      if (validMoves.includes(square)) {
        onMove(selectedSquare, square);
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    // 10. Selection
    const piece = engine.get(square);
    if (piece && piece.color === turn) {
      setSelectedSquare(square);
      // Use ENGINE permissive moves
      const moves = engine.getLegalMoves(square, 'none', null);
      setValidMoves(moves);
    } else {
        setSelectedSquare(null);
        setValidMoves([]);
    }
  };

  const getSlipTargets = (square: string) => {
    const possibleTargets = [];
    const files = [-1, 1];
    const ranks = [-1, 1];
    const fileCode = square.charCodeAt(0);
    const rankNum = parseInt(square[1]);
    
    for (const f of files) {
      for (const r of ranks) {
        const targetFile = String.fromCharCode(fileCode + f);
        const targetRank = rankNum + r;
        const targetSq = `${targetFile}${targetRank}`;
        if (targetFile >= 'a' && targetFile <= 'h' && targetRank >= 1 && targetRank <= 8) {
          const targetPiece = engine.get(targetSq);
          if (!targetPiece) {
            possibleTargets.push(targetSq);
          }
        }
      }
    }
    return possibleTargets;
  };

  const getExchangeTargets = (sourceSquare: string, type: PieceType) => {
    const targets: string[] = [];
    const board = engine.getBoard();
    board.forEach(row => {
      row.forEach(piece => {
        if (piece && piece.color !== turn && piece.type === type) {
          targets.push(piece.square);
        }
      });
    });
    return targets;
  };

  const getSacrificeTargets = (sourceSquare: string, type: PieceType) => {
      const targets: string[] = [];
      const board = engine.getBoard();
      
      let allowedTypes: PieceType[] = [];
      if (type === 'q') allowedTypes = ['r', 'b', 'n', 'p'];
      else if (type === 'r') allowedTypes = ['b', 'n', 'p'];
      else if (type === 'b') allowedTypes = ['n', 'p'];
      else if (type === 'n') allowedTypes = ['p'];

      board.forEach(row => {
          row.forEach(piece => {
              if (piece && piece.color !== turn && allowedTypes.includes(piece.type)) {
                  targets.push(piece.square);
              }
          })
      });
      return targets;
  }

  const getSquareColor = (fileIndex: number, rankIndex: number) => {
    const isDark = (fileIndex + rankIndex) % 2 !== 0;
    return isDark ? 'bg-slate-600' : 'bg-slate-300';
  };

  // Inline styles for animations
  const animationStyles = `
    @keyframes summon-pop {
      0% { transform: scale(0); opacity: 0; filter: brightness(2); }
      60% { transform: scale(1.2); opacity: 1; filter: brightness(1.5); }
      100% { transform: scale(1); opacity: 1; filter: brightness(1); }
    }
    @keyframes transform-spin {
      0% { transform: scale(1) rotate(0deg); filter: hue-rotate(0deg); }
      50% { transform: scale(1.1) rotate(180deg); filter: hue-rotate(180deg) brightness(1.5); }
      100% { transform: scale(1) rotate(360deg); filter: hue-rotate(0deg); }
    }
    @keyframes slip-slide {
      0% { transform: translate(0, -20%) scale(0.9); opacity: 0.5; filter: blur(2px); }
      100% { transform: translate(0, 0) scale(1); opacity: 1; filter: blur(0); }
    }
    @keyframes empower-glow {
      0% { filter: brightness(1) drop-shadow(0 0 0px #fbbf24); transform: scale(1); }
      50% { filter: brightness(1.5) drop-shadow(0 0 10px #fbbf24); transform: scale(1.2); }
      100% { filter: brightness(1) drop-shadow(0 0 0px #fbbf24); transform: scale(1); }
    }
    @keyframes exchange-pulse {
      0% { opacity: 0.5; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); filter: invert(1); }
      100% { opacity: 1; transform: scale(1); filter: invert(0); }
    }
    @keyframes portal-teleport {
      0% { transform: scale(1); filter: hue-rotate(0deg); opacity: 1; }
      40% { transform: scale(0.1); filter: hue-rotate(180deg); opacity: 0; }
      60% { transform: scale(0.1); filter: hue-rotate(180deg); opacity: 0; }
      100% { transform: scale(1); filter: hue-rotate(0deg); opacity: 1; }
    }
    @keyframes sacrifice-crumble {
      0% { transform: scale(1); filter: grayscale(0); }
      25% { transform: scale(1.1) rotate(5deg); filter: grayscale(1) brightness(0.5); }
      50% { transform: scale(0.8) rotate(-5deg); opacity: 0.8; }
      100% { transform: scale(0); opacity: 0; }
    }
    @keyframes cat-hiss {
      0% { transform: scale(1); filter: sepia(0); }
      50% { transform: scale(1.1) translateX(2px); filter: sepia(1) hue-rotate(300deg); }
      75% { transform: scale(1.1) translateX(-2px); }
      100% { transform: scale(1); filter: sepia(0); }
    }
    .animate-summon { animation: summon-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .animate-transform { animation: transform-spin 0.6s ease-in-out forwards; }
    .animate-slip { animation: slip-slide 0.4s ease-out forwards; }
    .animate-empower { animation: empower-glow 0.8s ease-in-out forwards; }
    .animate-exchange { animation: exchange-pulse 0.5s ease-in-out forwards; }
    .animate-portal { animation: portal-teleport 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-sacrifice { animation: sacrifice-crumble 0.8s ease-in forwards; }
    .animate-cat { animation: cat-hiss 0.5s ease-in-out forwards; }
  `;

  // Determine display order based on orientation
  const displayRanks = orientation === 'w' ? RANKS : [...RANKS].reverse();
  const displayFiles = orientation === 'w' ? FILES : [...FILES].reverse();

  return (
    <div className="relative">
      <style>{animationStyles}</style>
      <div className="grid grid-cols-8 border-4 border-slate-800 shadow-2xl rounded-sm overflow-hidden select-none w-full max-w-[600px] aspect-square">
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const standardFileIdx = FILES.indexOf(file);
            const standardRankIdx = RANKS.indexOf(rank);
            const square = `${file}${rank}`;
            const piece = engine.get(square);
            
            const isSelected = ['slip', 'empower', 'exchange', 'portal', 'sacrifice', 'cat'].includes(activeSpell)
                ? spellSourceSquare === square 
                : selectedSquare === square;
                
            const isValidMoveTarget = validMoves.includes(square);
            const isStunned = stunnedSquares.includes(square);
            const isCatPending = square === catMoveSquare;
            
            let isSpellTarget = false;
            // ... (Other spell checks omitted for brevity, logic follows same pattern)
            if (activeSpell === 'summon') isSpellTarget = isValidSpellRank(square) && !piece;
            else if (activeSpell === 'transform') isSpellTarget = !!piece && piece.color === turn && ['p', 'r', 'b'].includes(piece.type);
            else if (activeSpell === 'slip') {
              if (!spellSourceSquare) isSpellTarget = !!piece && piece.color === turn && ['p', 'n', 'r'].includes(piece.type);
              else isSpellTarget = validSpellTargets.includes(square);
            }
            else if (activeSpell === 'empower') {
              if (!spellSourceSquare) isSpellTarget = !!piece && piece.color === turn && ['n', 'b', 'r'].includes(piece.type);
              else isSpellTarget = validSpellTargets.includes(square);
            }
            else if (activeSpell === 'exchange') {
              if (!spellSourceSquare) isSpellTarget = !!piece && piece.color === turn && ['n', 'b', 'r', 'q'].includes(piece.type);
              else isSpellTarget = validSpellTargets.includes(square);
            }
            else if (activeSpell === 'portal') {
              if (!spellSourceSquare) isSpellTarget = !!piece && piece.color === turn;
              else isSpellTarget = validSpellTargets.includes(square);
            }
            else if (activeSpell === 'sacrifice') {
              if (!spellSourceSquare) isSpellTarget = !!piece && piece.color === turn && ['q', 'r', 'b', 'n'].includes(piece.type);
              else isSpellTarget = validSpellTargets.includes(square);
            }
            else if (activeSpell === 'cat') {
               if (!spellSourceSquare) {
                  // Phase 0: Select Source
                  isSpellTarget = !!piece && piece.color === turn;
               } else if (!catMoveSquare) {
                  // Phase 1: Select Move Target
                  isSpellTarget = validSpellTargets.includes(square);
               } else {
                  // Phase 2: Select Stun Target
                  isSpellTarget = validSpellTargets.includes(square);
               }
            }
            
            const isAnimating = animatingSquare?.square === square;
            const animationClass = isAnimating 
                ? `animate-${animatingSquare.type}` 
                : '';

            const Icon = piece ? getPieceIcon(piece.type, piece.color) : null;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  aspect-square
                  relative flex items-center justify-center
                  ${getSquareColor(standardFileIdx, standardRankIdx)}
                  ${isSelected ? 'ring-inset ring-4 ring-yellow-400' : ''}
                  ${isCatPending ? 'ring-inset ring-4 ring-orange-400' : ''}
                  ${isValidMoveTarget && !piece ? 'cursor-pointer' : ''}
                  ${isSpellTarget ? 'cursor-crosshair' : ''}
                  transition-all duration-150
                `}
              >
                {/* Labels */}
                {fIdx === 0 && (
                  <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${getSquareColor(standardFileIdx, standardRankIdx) === 'bg-slate-600' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {rank}
                  </span>
                )}
                {rIdx === 7 && (
                  <span className={`absolute bottom-0 right-1 text-[10px] font-bold ${getSquareColor(standardFileIdx, standardRankIdx) === 'bg-slate-600' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {file}
                  </span>
                )}

                {/* Indicators */}
                {isValidMoveTarget && !piece && (
                  <div className="w-3 h-3 rounded-full bg-black/20" />
                )}
                {isValidMoveTarget && piece && (
                  <div className="absolute inset-0 ring-inset ring-4 ring-red-500/50 rounded-none" />
                )}

                {/* Spell Highlights */}
                {isSpellTarget && (
                  <div className={`absolute inset-0 
                    ${activeSpell === 'summon' ? 'bg-purple-500/30' : ''}
                    ${activeSpell === 'transform' ? 'ring-4 ring-inset ring-emerald-400 opacity-50' : ''}
                    ${activeSpell === 'slip' ? 'bg-cyan-500/30' : ''}
                    ${activeSpell === 'empower' ? 'bg-amber-500/30' : ''}
                    ${activeSpell === 'exchange' ? 'bg-indigo-500/30' : ''}
                    ${activeSpell === 'portal' ? 'bg-rose-500/30' : ''}
                    ${activeSpell === 'sacrifice' ? 'bg-red-900/40' : ''}
                    ${activeSpell === 'cat' ? (catMoveSquare ? 'bg-red-500/40' : 'bg-orange-500/30') : ''}
                    animate-pulse flex items-center justify-center`}>
                      {activeSpell === 'summon' && <div className="w-2 h-2 bg-purple-400 rounded-full" />}
                      {activeSpell === 'slip' && spellSourceSquare && <div className="w-3 h-3 bg-cyan-400 rounded-full" />}
                      {activeSpell === 'empower' && spellSourceSquare && <div className="w-3 h-3 bg-amber-400 rounded-full" />}
                      {activeSpell === 'exchange' && spellSourceSquare && <div className="w-3 h-3 bg-indigo-400 rounded-full" />}
                      {activeSpell === 'portal' && spellSourceSquare && <div className="w-3 h-3 bg-rose-400 rounded-full" />}
                      {activeSpell === 'sacrifice' && spellSourceSquare && <div className="w-3 h-3 bg-red-500 rounded-full" />}
                      {activeSpell === 'cat' && spellSourceSquare && <div className={`w-3 h-3 rounded-full ${catMoveSquare ? 'bg-red-500' : 'bg-orange-500'}`} />}
                  </div>
                )}

                {/* Stun Indicator */}
                {isStunned && (
                   <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <Zap className="w-6 h-6 text-yellow-400 animate-pulse fill-yellow-400 stroke-black drop-shadow-md" />
                      <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
                   </div>
                )}

                {/* Animation Overlays */}
                {isAnimating && animatingSquare.type === 'cat' && (
                    <div className="absolute inset-0 bg-orange-400/40 mix-blend-overlay animate-pulse pointer-events-none" />
                )}

                {/* Piece Icon */}
                {Icon && (
                  <div 
                    className={`w-[85%] h-[85%] z-10 hover:scale-105 transition-all duration-200 ${animationClass} ${isStunned ? 'opacity-75 grayscale-[0.5]' : ''}`}
                  >
                    <Icon className="w-full h-full drop-shadow-lg" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChessBoard;