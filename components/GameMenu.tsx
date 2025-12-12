import React, { useState } from 'react';
import { Users, Globe, Play, ChevronRight, Loader2, Copy, Wallet, LogOut, Coins, ShieldCheck, Lock, Check } from 'lucide-react';
import { WalletManager } from '../utils/wallet';
import { CheckToken } from './Icons';
import { PieceColor } from '../types';

interface GameMenuProps {
  onLocalPlay: () => void;
  onHostGame: (wager: number) => Promise<string>;
  onJoinGame: (hostId: string) => void;
  onAcceptBet: () => void;
  isConnecting: boolean;
  connectionError: string | null;
  pendingBetAmount: number | null;
  userAddress: string | null;
  checkBalance: string | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  myColor?: PieceColor | 'spectator';
  myDepositComplete: boolean;
  opponentDepositComplete: boolean;
  hostId: string | null;
}

const GameMenu: React.FC<GameMenuProps> = ({ 
  onLocalPlay, 
  onHostGame, 
  onJoinGame,
  onAcceptBet,
  isConnecting,
  connectionError,
  pendingBetAmount,
  userAddress,
  checkBalance,
  onLogin,
  onLogout,
  isLoggingIn,
  myColor,
  myDepositComplete,
  opponentDepositComplete,
  hostId
}) => {
  const [view, setView] = useState<'login' | 'main' | 'host' | 'join'>('login');
  const [joinInput, setJoinInput] = useState('');
  const [wagerInput, setWagerInput] = useState('0');

  React.useEffect(() => {
    if (userAddress && view === 'login') {
      setView('main');
    }
  }, [userAddress, view]);

  const handleGuestPlay = () => {
    setView('main');
  };

  const handleHost = async () => {
    const wager = parseFloat(wagerInput);
    if (isNaN(wager) || wager < 0) return;
    setView('host'); // Switch to host view immediately
    await onHostGame(wager);
  };

  const handleCopy = () => {
    if (hostId) navigator.clipboard.writeText(hostId);
  };

  // Login Screen
  if (view === 'login') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Sorcerer's Chess
          </h1>
          <p className="text-slate-400">Enter the arena</p>
        </div>
        <div className="w-full space-y-4">
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="w-full group relative flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
          >
            {isLoggingIn ? (
               <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
               <div className="p-1 bg-white rounded-full">
                  <Wallet className="w-4 h-4 text-blue-600" />
               </div>
            )}
            <span className="font-bold text-white text-lg">
              {isLoggingIn ? 'Connecting...' : 'Login with Coinbase'}
            </span>
          </button>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">Or</span></div>
          </div>
          <button onClick={handleGuestPlay} className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium hover:underline">Play as Guest</button>
        </div>
      </div>
    );
  }

  // --- Betting / Deposit Interstitial ---
  // Show this if I haven't deposited yet but I have a pending bet
  if (pendingBetAmount !== null && !myDepositComplete) {
      const isHost = myColor === 'w';
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-yellow-500/30 animate-in fade-in zoom-in duration-300">
             <div className="p-4 bg-yellow-500/10 rounded-full mb-6 ring-1 ring-yellow-500/50">
                 <ShieldCheck className="w-12 h-12 text-yellow-400" />
             </div>
             
             <h2 className="text-2xl font-bold text-white mb-2">
                 {isHost ? "Step 1: Secure Funds" : "Match Opponent's Bet"}
             </h2>
             <p className="text-slate-400 text-center mb-8">
                 {isHost 
                    ? <span>You must deposit <span className="text-yellow-400 font-bold">{pendingBetAmount} CHECK</span><br/>to generate a Game Code.</span>
                    : <span>The host has wagered <span className="text-yellow-400 font-bold">{pendingBetAmount} CHECK</span>.<br/>Deposit to match and join.</span>
                 }
             </p>

             <div className="w-full space-y-3">
                 <button
                    onClick={onAcceptBet}
                    disabled={isConnecting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                 >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Approve & Deposit
                 </button>
                 {connectionError && <p className="text-red-400 text-sm text-center">{connectionError}</p>}
                 <div className="text-center text-xs text-slate-500">
                    Funds are held securely in the Game Escrow.
                 </div>
             </div>
          </div>
      )
  }

  // --- Waiting Room (Host) ---
  // If I am Host, I have deposited, but opponent hasn't
  if (myDepositComplete && !opponentDepositComplete && myColor === 'w') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300">
           <div className="mb-6 text-center">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4">
                 <Check className="w-4 h-4 text-emerald-400" />
                 <span className="text-sm font-bold text-emerald-400">Funds Secured</span>
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Invite Opponent</h3>
             <p className="text-sm text-slate-400">Share this code to start the match.</p>
           </div>

           {hostId ? (
            <div className="w-full flex items-center gap-2 p-4 bg-slate-900 rounded-lg border border-slate-600 mb-6">
               <code className="flex-1 text-3xl font-mono text-center tracking-widest text-purple-300">
                 {hostId}
               </code>
               <button onClick={handleCopy} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white">
                 <Copy className="w-6 h-6" />
               </button>
            </div>
           ) : (
             <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-6" />
           )}

           <div className="flex items-center gap-2 text-sm text-slate-500 animate-pulse">
             <Loader2 className="w-4 h-4 animate-spin" />
             Waiting for opponent to join and deposit...
           </div>
        </div>
      );
  }
  
  // --- Waiting for Start (Joiner) ---
  // Joiner has deposited, just waiting for signal
  if (myDepositComplete && !opponentDepositComplete && myColor === 'b') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white">Starting Game...</h3>
            <p className="text-slate-400">Synchronizing with host.</p>
        </div>
      )
  }

  // --- Main Menu ---
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-300 relative">
      
      {userAddress && checkBalance && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm rounded-full border border-yellow-500/30 shadow-lg shadow-yellow-500/10 hover:bg-slate-900 transition-colors">
            <div className="p-1 bg-yellow-500/20 rounded-full">
                <CheckToken className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <span className="text-xs font-bold text-yellow-100 font-mono tracking-wide">{checkBalance} <span className="text-yellow-500 ml-0.5">CHECK</span></span>
        </div>
      )}

      <div className="absolute top-4 right-4 flex items-center gap-2">
         {userAddress && (
           <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-full border border-slate-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-slate-300">{WalletManager.formatAddress(userAddress)}</span>
              <button onClick={() => { onLogout(); setView('login'); }} className="ml-2 text-slate-500 hover:text-red-400"><LogOut className="w-3 h-3" /></button>
           </div>
         )}
         {!userAddress && <button onClick={() => setView('login')} className="text-xs text-slate-500 hover:text-blue-400">Login</button>}
      </div>

      <div className="mb-8 text-center mt-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">Sorcerer's Chess</h1>
        <p className="text-slate-400">Choose your battlefield</p>
      </div>

      {view === 'main' && (
        <div className="w-full space-y-4">
          <button onClick={onLocalPlay} className="w-full group relative flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all border border-slate-600 hover:border-purple-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors"><Users className="w-6 h-6" /></div>
              <div className="text-left"><h3 className="font-bold text-white">Local Multiplayer</h3><p className="text-xs text-slate-400">Pass and play</p></div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white" />
          </button>

          <div className="w-full p-4 bg-slate-700 rounded-xl border border-slate-600">
             <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-400" /><span className="text-sm font-bold text-white">Wager Amount</span></div>
                 <span className="text-xs text-slate-400">CHECK Tokens</span>
             </div>
             <div className="flex gap-2 mb-4">
                 <input type="number" min="0" step="1" value={wagerInput} onChange={(e) => setWagerInput(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono focus:border-yellow-500 outline-none" />
                 <button onClick={() => setWagerInput('5')} className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs font-bold">5</button>
                 <button onClick={() => setWagerInput('10')} className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-xs font-bold">10</button>
             </div>
             <button onClick={handleHost} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">Host with Wager</button>
          </div>

          <button onClick={() => setView('join')} className="w-full group relative flex items-center justify-between p-4 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all border border-slate-600 hover:border-cyan-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors"><Globe className="w-6 h-6" /></div>
              <div className="text-left"><h3 className="font-bold text-white">Join Online Game</h3><p className="text-xs text-slate-400">Enter code to match bet</p></div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white" />
          </button>
        </div>
      )}

      {view === 'join' && (
        <div className="w-full text-center space-y-6">
          <div className="space-y-2"><h3 className="text-lg font-bold text-white">Join Game</h3><p className="text-sm text-slate-400">Enter the host's 4-character code</p></div>
          <div className="space-y-4">
             <input type="text" maxLength={4} value={joinInput} onChange={(e) => setJoinInput(e.target.value.toUpperCase())} placeholder="ABCD" className="w-full p-4 text-center text-3xl font-mono tracking-[0.5em] bg-slate-900 border-2 border-slate-600 rounded-lg focus:border-purple-500 focus:outline-none text-white placeholder-slate-700 uppercase" />
             {connectionError && <p className="text-red-400 text-sm">{connectionError}</p>}
             <button onClick={() => onJoinGame(joinInput)} disabled={joinInput.length < 4 || isConnecting} className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">{isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}Find Game</button>
          </div>
          <button onClick={() => setView('main')} className="text-sm text-slate-500 hover:text-white">Back to Menu</button>
        </div>
      )}
    </div>
  );
};

export default GameMenu;