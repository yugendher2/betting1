import { Chess, Square } from 'chess.js';
import { SpellCounts, PieceColor, PieceType } from '../types';

export const isValidSpellRank = (square: string): boolean => {
  const rank = square[1];
  return ['3', '4', '5', '6'].includes(rank);
};

interface StunnedPiece {
  square: string;
  releaseTurn: number; // The global move count when the stun releases
}

export class ChessGameEngine {
  private chess: Chess;
  private stunnedPieces: StunnedPiece[] = [];
  private movesCount: number = 0; // Persistent move counter to handle stuns across FEN loads
  
  constructor(fen?: string) {
    this.chess = new Chess(fen);
    // Rough estimate of moves if loading from FEN, though for exact stun logic in mid-game reloads 
    // we'd need this passed in. For new games, 0 is fine.
    this.movesCount = fen ? parseInt(fen.split(' ')[5] || '0') * 2 : 0;
  }

  get fen() {
    return this.chess.fen();
  }

  get turn() {
    return this.chess.turn();
  }
  
  get isDraw() {
    return this.chess.isDraw();
  }

  get isGameOver() {
    const board = this.chess.board();
    let wKing = false;
    let bKing = false;
    
    board.forEach(row => {
        row.forEach(piece => {
            if (piece) {
                if (piece.type === 'k' && piece.color === 'w') wKing = true;
                if (piece.type === 'k' && piece.color === 'b') bKing = true;
            }
        });
    });

    return !wKing || !bKing;
  }

  getStunnedSquares(): string[] {
    // Clean up expired
    this.stunnedPieces = this.stunnedPieces.filter(s => s.releaseTurn > this.movesCount);
    return this.stunnedPieces.map(s => s.square);
  }

  getWinner(): PieceColor | null {
    const board = this.chess.board();
    let wKing = false;
    let bKing = false;
    
    board.forEach(row => {
        row.forEach(piece => {
            if (piece) {
                if (piece.type === 'k' && piece.color === 'w') wKing = true;
                if (piece.type === 'k' && piece.color === 'b') bKing = true;
            }
        });
    });

    if (!wKing && bKing) return 'b';
    if (wKing && !bKing) return 'w';
    return null;
  }

  getHistory() {
    return this.chess.history();
  }

  getBoard() {
    return this.chess.board();
  }

  get(square: string) {
    return this.chess.get(square as Square);
  }
  
  getLegalMoves(square: string, activeSpell: string, spellSource: string | null): string[] {
      if (this.isSquareStunned(square)) {
          return [];
      }

      if (activeSpell === 'empower' && spellSource === square) {
          return this.getPseudoLegalMoves(square, 'q', true);
      }

      if (activeSpell === 'portal' && spellSource === square) {
          return this.getPseudoLegalMovesCylindrical(square);
      }

      if (activeSpell === 'cat' && spellSource === square) {
          return this.getPseudoLegalCatMoves(square);
      }

      return this.getPseudoLegalMoves(square);
  }

  private isSquareStunned(square: string): boolean {
      return this.stunnedPieces.some(s => s.square === square && s.releaseTurn > this.movesCount);
  }

  // ... (Standard move generation code remains unchanged, implied here for brevity if I could, but I must provide full file content or updated function) ...
  // To avoid cutting too much, I will include the helper methods.

  private getPseudoLegalMoves(square: string, overrideType?: string, preventKingCapture: boolean = false): string[] {
    const piece = this.chess.get(square as Square);
    if (!piece) return [];
    
    const type = overrideType || piece.type;
    const color = piece.color;
    const moves: string[] = [];
    
    const fileIdx = 'abcdefgh'.indexOf(square[0]);
    const rankIdx = parseInt(square[1]) - 1;

    const addMove = (f: number, r: number): boolean => {
        if (f < 0 || f > 7 || r < 0 || r > 7) return false;
        
        const targetSq = `${'abcdefgh'[f]}${r + 1}`;
        const targetPiece = this.chess.get(targetSq as Square);

        if (!targetPiece) {
            moves.push(targetSq);
            return true;
        } else {
            if (targetPiece.color !== color) {
                if (preventKingCapture && targetPiece.type === 'k') {
                    // Do not add
                } else {
                    moves.push(targetSq);
                }
            }
            return false;
        }
    };

    const offsets = {
        'n': [[1,2], [2,1], [2,-1], [1,-2], [-1,-2], [-2,-1], [-2,1], [-1,2]],
        'b': [[1,1], [1,-1], [-1,-1], [-1,1]],
        'r': [[1,0], [-1,0], [0,1], [0,-1]],
        'q': [[1,1], [1,-1], [-1,-1], [-1,1], [1,0], [-1,0], [0,1], [0,-1]],
        'k': [[1,1], [1,-1], [-1,-1], [-1,1], [1,0], [-1,0], [0,1], [0,-1]],
    };

    if (type === 'p') {
        const dir = color === 'w' ? 1 : -1;
        const f1 = fileIdx;
        const r1 = rankIdx + dir;
        if (r1 >= 0 && r1 <= 7 && !this.chess.get(`${'abcdefgh'[f1]}${r1 + 1}` as Square)) {
            moves.push(`${'abcdefgh'[f1]}${r1 + 1}`);
            const startRank = color === 'w' ? 1 : 6;
            if (rankIdx === startRank) {
                const r2 = rankIdx + dir * 2;
                 if (!this.chess.get(`${'abcdefgh'[f1]}${r2 + 1}` as Square)) {
                    moves.push(`${'abcdefgh'[f1]}${r2 + 1}`);
                 }
            }
        }
        [[1, dir], [-1, dir]].forEach(([fd, rd]) => {
            const f = fileIdx + fd;
            const r = rankIdx + rd;
            if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
                 const targetSq = `${'abcdefgh'[f]}${r + 1}`;
                 const targetPiece = this.chess.get(targetSq as Square);
                 if (targetPiece && targetPiece.color !== color) {
                     if (!preventKingCapture || targetPiece.type !== 'k') {
                         moves.push(targetSq);
                     }
                 }
            }
        });
    } else if (type === 'n' || type === 'k') {
        // @ts-ignore
        offsets[type].forEach(([df, dr]) => {
            addMove(fileIdx + df, rankIdx + dr);
        });
    } else if (type === 'b' || type === 'r' || type === 'q') {
        // @ts-ignore
        offsets[type].forEach(([df, dr]) => {
            let f = fileIdx + df;
            let r = rankIdx + dr;
            while(addMove(f, r)) {
                f += df;
                r += dr;
            }
        });
    }

    return moves;
  }

  private getPseudoLegalMovesCylindrical(square: string): string[] {
    const piece = this.chess.get(square as Square);
    if (!piece) return [];
    
    const moves: string[] = [];
    const fileIdx = 'abcdefgh'.indexOf(square[0]);
    const rankIdx = parseInt(square[1]) - 1;
    const color = piece.color;
    const type = piece.type;

    const tryAdd = (f: number, r: number): boolean => {
        if (r < 0 || r > 7) return false;
        const wrappedF = (f + 800) % 8;
        if (wrappedF === fileIdx && r === rankIdx) return false;

        const targetSq = `${'abcdefgh'[wrappedF]}${r + 1}`;
        const targetPiece = this.chess.get(targetSq as Square);

        if (!targetPiece) {
            moves.push(targetSq);
            return true; 
        } else {
            if (targetPiece.color !== color) {
                moves.push(targetSq);
            }
            return false;
        }
    };

    const offsets = {
        'n': [[1,2], [2,1], [2,-1], [1,-2], [-1,-2], [-2,-1], [-2,1], [-1,2]],
        'b': [[1,1], [1,-1], [-1,-1], [-1,1]],
        'r': [[1,0], [-1,0], [0,1], [0,-1]],
        'q': [[1,1], [1,-1], [-1,-1], [-1,1], [1,0], [-1,0], [0,1], [0,-1]],
        'k': [[1,1], [1,-1], [-1,-1], [-1,1], [1,0], [-1,0], [0,1], [0,-1]],
    };

    if (type === 'p') {
        const dir = color === 'w' ? 1 : -1;
        const r1 = rankIdx + dir;
        if (r1 >= 0 && r1 <= 7 && !this.chess.get(`${'abcdefgh'[fileIdx]}${r1 + 1}` as Square)) {
            moves.push(`${'abcdefgh'[fileIdx]}${r1 + 1}`);
            const startRank = color === 'w' ? 1 : 6;
            if (rankIdx === startRank) {
                const r2 = rankIdx + dir * 2;
                 if (!this.chess.get(`${'abcdefgh'[fileIdx]}${r2 + 1}` as Square)) {
                    moves.push(`${'abcdefgh'[fileIdx]}${r2 + 1}`);
                 }
            }
        }
        [[1, dir], [-1, dir]].forEach(([fd, rd]) => {
            const f = fileIdx + fd; 
            const r = rankIdx + rd;
            if (r >= 0 && r <= 7) {
                 const wrappedF = (f + 8) % 8;
                 const targetSq = `${'abcdefgh'[wrappedF]}${r + 1}`;
                 const targetPiece = this.chess.get(targetSq as Square);
                 if (targetPiece && targetPiece.color !== color) {
                     moves.push(targetSq);
                 }
            }
        });
    } else if (type === 'n' || type === 'k') {
        // @ts-ignore
        offsets[type].forEach(([df, dr]) => {
            tryAdd(fileIdx + df, rankIdx + dr);
        });
    } else if (type === 'b' || type === 'r' || type === 'q') {
        // @ts-ignore
        offsets[type].forEach(([df, dr]) => {
            let f = fileIdx + df;
            let r = rankIdx + dr;
            let steps = 0;
            while(steps < 8 && tryAdd(f, r)) {
                f += df;
                r += dr;
                steps++;
            }
        });
    }
    
    return moves;
  }

  // --- Cat Spell Helpers ---

  // 1. Get valid move destinations (must allow adjacent stun)
  private getPseudoLegalCatMoves(square: string): string[] {
      const piece = this.chess.get(square as Square);
      if (!piece) return [];
      
      const fileIdx = 'abcdefgh'.indexOf(square[0]);
      const rankIdx = parseInt(square[1]) - 1;
      const validDestinations: string[] = [];
      const offsets = [[1,1], [1,0], [1,-1], [0,1], [0,-1], [-1,1], [-1,0], [-1,-1]];

      offsets.forEach(([df, dr]) => {
          const f = fileIdx + df;
          const r = rankIdx + dr;
          
          if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
              const targetSq = `${'abcdefgh'[f]}${r + 1}`;
              const targetPiece = this.chess.get(targetSq as Square);
              
              // Standard move validation (can't land on self)
              if (targetPiece && targetPiece.color === piece.color) return;

              // Cat Rule: Must be adjacent to at least one enemy from the NEW position
              let isAdjacentToEnemy = false;
              offsets.forEach(([nDf, nDr]) => {
                  const nf = f + nDf;
                  const nr = r + nDr;
                  if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
                      const neighborSq = `${'abcdefgh'[nf]}${nr + 1}`;
                      const neighborPiece = this.chess.get(neighborSq as Square);
                      if (neighborPiece && neighborPiece.color !== piece.color) {
                          isAdjacentToEnemy = true;
                      }
                  }
              });

              if (isAdjacentToEnemy) {
                  validDestinations.push(targetSq);
              }
          }
      });
      return validDestinations;
  }

  // 2. Public helper to get valid stun targets from a hypothetical move destination
  public getCatStunTargets(square: string, color: PieceColor): string[] {
      const fileIdx = 'abcdefgh'.indexOf(square[0]);
      const rankIdx = parseInt(square[1]) - 1;
      const offsets = [[1,1], [1,0], [1,-1], [0,1], [0,-1], [-1,1], [-1,0], [-1,-1]];
      const targets: string[] = [];

      offsets.forEach(([df, dr]) => {
          const f = fileIdx + df;
          const r = rankIdx + dr;
          if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
              const neighborSq = `${'abcdefgh'[f]}${r + 1}`;
              const neighborPiece = this.chess.get(neighborSq as Square);
              if (neighborPiece && neighborPiece.color !== color) {
                  targets.push(neighborSq);
              }
          }
      });
      return targets;
  }

  // --- End Cat Helpers ---

  moves(options: { square: string }) {
      const candidates = this.getPseudoLegalMoves(options.square);
      return candidates.map(to => ({
          to,
          from: options.square,
          color: this.chess.get(options.square as Square).color
      }));
  }

  undo() {
    this.movesCount--;
    return this.chess.undo();
  }

  move(from: string, to: string) {
    if (this.isSquareStunned(from)) return null;

    const piece = this.chess.get(from as Square);
    if (!piece) return null;

    try {
        const standardMove = this.chess.move({ from, to, promotion: 'q' });
        if (standardMove) {
            this.movesCount++;
            this.cleanUpStuns(); 
            return standardMove;
        }
    } catch (e) {}

    const validMoves = this.getPseudoLegalMoves(from);
    if (!validMoves.includes(to)) return null;

    const targetPiece = this.chess.get(to as Square);
    const isKingCapture = targetPiece && targetPiece.type === 'k';

    this.chess.remove(from as Square);
    
    let placedType = piece.type;
    if (piece.type === 'p' && (to[1] === '1' || to[1] === '8')) {
        placedType = 'q';
    }

    this.chess.put({ type: placedType, color: piece.color }, to as Square);
    this.forceTurnSwitch(piece.color);
    
    return {
        from,
        to,
        color: piece.color,
        flags: isKingCapture ? 'c' : (targetPiece ? 'c' : 'n'),
        piece: piece.type,
        san: ''
    };
  }

  reset() {
    this.chess.reset();
    this.stunnedPieces = [];
    this.movesCount = 0;
  }

  private cleanUpStuns() {
      // Release turn means: It is stunned UNTIL this turn number is reached.
      // So if current movesCount >= releaseTurn, it is free.
      this.stunnedPieces = this.stunnedPieces.filter(s => s.releaseTurn > this.movesCount);
  }

  private forceTurnSwitch(color: PieceColor) {
    this.movesCount++;
    if (this.isGameOver) return true;

    const currentFen = this.chess.fen();
    const fenParts = currentFen.split(' ');
    fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
    if (color === 'b') {
        fenParts[5] = (parseInt(fenParts[5]) + 1).toString();
    }
    fenParts[4] = '0'; // Reset halfmove
    const newFen = fenParts.join(' ');
    try {
        this.chess.load(newFen);
        this.cleanUpStuns();
        return true;
    } catch (e) {
        return false;
    }
  }

  // Spells
  castPawnSpell(targetSquare: string, color: PieceColor): boolean {
    const pieceAtTarget = this.chess.get(targetSquare as Square);
    if (pieceAtTarget) return false;
    if (!isValidSpellRank(targetSquare)) return false;
    const success = this.chess.put({ type: 'p', color: color }, targetSquare as Square);
    if (!success) return false;
    return this.forceTurnSwitch(color);
  }

  castTransformSpell(targetSquare: string, color: PieceColor): boolean {
    const piece = this.chess.get(targetSquare as Square);
    if (!piece || piece.color !== color || !['p', 'r', 'b'].includes(piece.type)) return false;
    const success = this.chess.put({ type: 'n', color: color }, targetSquare as Square);
    if (!success) return false;
    return this.forceTurnSwitch(color);
  }

  castSlipSpell(fromSquare: string, toSquare: string, color: PieceColor): boolean {
    const piece = this.chess.get(fromSquare as Square);
    if (!piece || !['p', 'n', 'r'].includes(piece.type) || piece.color !== color) return false;
    const targetPiece = this.chess.get(toSquare as Square);
    if (targetPiece) return false;
    
    const fromFile = fromSquare.charCodeAt(0);
    const fromRank = parseInt(fromSquare[1]);
    const toFile = toSquare.charCodeAt(0);
    const toRank = parseInt(toSquare[1]);
    if (Math.abs(fromFile - toFile) !== 1 || Math.abs(fromRank - toRank) !== 1) return false;

    this.chess.remove(fromSquare as Square);
    this.chess.put(piece, toSquare as Square);
    return this.forceTurnSwitch(color);
  }

  castEmpowerSpell(fromSquare: string, toSquare: string, color: PieceColor): boolean {
    const piece = this.chess.get(fromSquare as Square);
    if (!piece || !['n', 'b', 'r'].includes(piece.type) || piece.color !== color) return false;

    const validMoves = this.getPseudoLegalMoves(fromSquare, 'q', true); 
    if (!validMoves.includes(toSquare)) return false;

    this.chess.remove(fromSquare as Square);
    this.chess.put(piece, toSquare as Square); 
    return this.forceTurnSwitch(color);
  }

  castExchangeSpell(fromSquare: string, toSquare: string, color: PieceColor): boolean {
    const sourcePiece = this.chess.get(fromSquare as Square);
    const targetPiece = this.chess.get(toSquare as Square);

    if (!sourcePiece || !targetPiece) return false;
    if (sourcePiece.color !== color) return false;
    if (targetPiece.color === color) return false;
    const allowedTypes = ['r', 'n', 'b', 'q'];
    if (!allowedTypes.includes(sourcePiece.type)) return false;
    if (sourcePiece.type !== targetPiece.type) return false;

    this.chess.remove(fromSquare as Square);
    this.chess.remove(toSquare as Square);

    this.chess.put(sourcePiece, toSquare as Square);
    this.chess.put(targetPiece, fromSquare as Square);

    return this.forceTurnSwitch(color);
  }

  castPortalSpell(fromSquare: string, toSquare: string, color: PieceColor): boolean {
    const piece = this.chess.get(fromSquare as Square);
    if (!piece || piece.color !== color) return false;

    const validMoves = this.getPseudoLegalMovesCylindrical(fromSquare);
    if (!validMoves.includes(toSquare)) return false;

    this.chess.remove(fromSquare as Square);
    
    let placedType = piece.type;
    if (piece.type === 'p' && (toSquare[1] === '1' || toSquare[1] === '8')) {
        placedType = 'q';
    }

    this.chess.put({ type: placedType, color: piece.color }, toSquare as Square);
    return this.forceTurnSwitch(color);
  }

  castSacrificeSpell(fromSquare: string, toSquare: string, color: PieceColor): boolean {
    const sourcePiece = this.chess.get(fromSquare as Square);
    const targetPiece = this.chess.get(toSquare as Square);

    if (!sourcePiece || !targetPiece) return false;
    if (sourcePiece.color !== color) return false; 
    if (targetPiece.color === color) return false;
    if (sourcePiece.type === 'k' || sourcePiece.type === 'p') return false; 
    if (targetPiece.type === 'k') return false; 

    let allowedTargets: PieceType[] = [];
    switch (sourcePiece.type) {
        case 'q':
            allowedTargets = ['r', 'b', 'n', 'p'];
            break;
        case 'r':
            allowedTargets = ['b', 'n', 'p'];
            break;
        case 'b':
            allowedTargets = ['n', 'p'];
            break;
        case 'n':
            allowedTargets = ['p'];
            break;
        default:
            return false;
    }

    if (!allowedTargets.includes(targetPiece.type)) return false;

    this.chess.remove(fromSquare as Square);
    this.chess.remove(toSquare as Square);

    return this.forceTurnSwitch(color);
  }

  // Cat Spell: Move + Stun adjacent
  castCatSpell(fromSquare: string, toSquareInfo: string, color: PieceColor): boolean {
      const parts = toSquareInfo.split(',');
      if (parts.length !== 2) return false;
      const moveSquare = parts[0];
      const stunSquare = parts[1];

      const piece = this.chess.get(fromSquare as Square);
      if (!piece || piece.color !== color) return false;
      
      // 1. Validate Move
      const validMoves = this.getPseudoLegalCatMoves(fromSquare);
      if (!validMoves.includes(moveSquare)) return false;

      // 2. Validate Stun Target (must be enemy adjacent to moveSquare)
      const validStunTargets = this.getCatStunTargets(moveSquare, color);
      if (!validStunTargets.includes(stunSquare)) return false;

      // 3. Move Piece (Remove old, Put new)
      this.chess.remove(fromSquare as Square);
      
      let placedType = piece.type;
      if (piece.type === 'p' && (moveSquare[1] === '1' || moveSquare[1] === '8')) {
          placedType = 'q';
      }
      this.chess.put({ type: placedType, color: color }, moveSquare as Square);

      // 4. Stun Specific Enemy
      // Logic: Opponent turn (1) -> My turn (2). Released on Opponent's next turn (3).
      // movesCount is currently N. After forceTurnSwitch, it is N+1 (Opponent's turn).
      // We want them stunned during N+1.
      // So releaseTurn should be N+2.
      // e.g. Current=10. End of Func=11 (Opponent). Stun needs to exist during 11. 
      // isSquareStunned check: releaseTurn > movesCount.
      // If release=12: 12 > 11 (True). Stunned.
      // Opponent moves -> movesCount=12 (My turn).
      // My turn -> I move -> movesCount=13.
      // Opponent next turn -> 12 > 13 (False). Released.
      
      const releaseTurn = this.movesCount + 2; 
      this.stunnedPieces.push({ square: stunSquare, releaseTurn });

      return this.forceTurnSwitch(color);
  }
}