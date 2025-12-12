export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type SpellType = 'none' | 'summon' | 'transform' | 'slip' | 'empower' | 'exchange' | 'portal' | 'sacrifice' | 'cat';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface PlayerSpellInventory {
  summon: number;
  transform: number;
  slip: number;
  empower: number;
  exchange: number;
  portal: number;
  sacrifice: number;
  cat: number;
}

export interface SpellCounts {
  w: PlayerSpellInventory;
  b: PlayerSpellInventory;
}

export interface BoardSquare {
  square: string;
  piece: Piece | null;
}

export interface GameState {
  fen: string;
  turn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  spellCounts: SpellCounts;
  activeSpell: SpellType; 
  winner: PieceColor | 'draw' | null;
  history: string[];
}

// Network & Game Mode Types
export type GameMode = 'menu' | 'local' | 'online';

export type NetworkMessage = 
  | { type: 'MOVE'; from: string; to: string }
  | { type: 'SPELL'; spellType: SpellType; target: string; source?: string }
  | { type: 'RESTART' }
  | { type: 'SYNC'; fen: string; spellCounts: SpellCounts }
  | { type: 'HANDSHAKE_INIT'; address: string } // Joiner sends address
  | { type: 'HANDSHAKE_REPLY'; address: string; wager: number } // Host sends address + wager
  | { type: 'DEPOSIT_CONFIRMED' }; // Sent when a player has successfully deposited to the smart contract