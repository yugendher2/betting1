import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChessGameEngine } from './utils/chessEngine';
import { SoundEngine } from './utils/soundEngine';
import { NetworkManager } from './utils/network';
import { WalletManager } from './utils/wallet';
import ChessBoard from './components/ChessBoard';
import GameControls from './components/GameControls';
import GameMenu from './components/GameMenu';
import { CheckToken } from './components/Icons';
import { SpellCounts, PieceColor, SpellType, GameMode, NetworkMessage } from './types';
import { Coins } from 'lucide-react';

const INITIAL_SPELLS: SpellCounts = {
  w: { summon: 3, transform: 3, slip: 5, empower: 1, exchange: 3, portal: 3, sacrifice: 5, cat: 3 },
  b: { summon: 3, transform: 3, slip: 5, empower: 1, exchange: 3, portal: 3, sacrifice: 5, cat: 3 }
};

function App() {
  const [engine] = useState(() => new ChessGameEngine());
  const [fen, setFen] = useState(engine.fen);
  const [spellCounts, setSpellCounts] = useState<SpellCounts>(INITIAL_SPELLS);
  const [activeSpell, setActiveSpell] = useState<SpellType>('none');
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);
  const [animatingSquare, setAnimatingSquare] = useState<{ square: string, type: SpellType } | null>(null);
  
  // Networking State
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [myColor, setMyColor] = useState<PieceColor | 'spectator'>('w');
  const [network, setNetwork] = useState<NetworkManager | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Betting & Handshake State
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [potSize, setPotSize] = useState<number>(0);
  const [pendingBetAmount, setPendingBetAmount] = useState<number | null>(null); 
  const [opponentAddress, setOpponentAddress] = useState<string | null>(null);
  
  // State for Escrow Deposits
  const [myDepositComplete, setMyDepositComplete] = useState(false);
  const [opponentDepositComplete, setOpponentDepositComplete] = useState(false);
  const hasPaidOut = useRef(false);

  // Auth State
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [checkBalance, setCheckBalance] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Refs
  const engineRef = useRef(engine);
  const userAddressRef = useRef(userAddress);
  const opponentAddressRef = useRef(opponentAddress);
  const wagerAmountRef = useRef(wagerAmount);
  const myDepositCompleteRef = useRef(myDepositComplete);

  useEffect(() => {
    engineRef.current = engine;
    userAddressRef.current = userAddress;
    opponentAddressRef.current = opponentAddress;
    wagerAmountRef.current = wagerAmount;
    myDepositCompleteRef.current = myDepositComplete;
  }, [engine, userAddress, opponentAddress, wagerAmount, myDepositComplete]);

  // Update visual state when game progresses
  const updateGameState = useCallback(() => {
    setFen(engine.fen);
    
    // Check win condition
    const kingSlayWinner = engine.getWinner();
    if (kingSlayWinner) {
        setWinner(kingSlayWinner);
        
        // --- REAL PAYOUT LOGIC (Smart Contract) ---
        // Winner triggers the payout function on the contract
        if (gameMode === 'online' && potSize > 0 && !hasPaidOut.current) {
           hasPaidOut.current = true; 
           
           if (kingSlayWinner === myColor) {
               if (userAddress) {
                   console.log("Claiming total pot from Smart Contract...");
                   WalletManager.payoutWinner(userAddress, potSize)
                    .then(() => {
                        SoundEngine.play('capture'); 
                        WalletManager.getCheckBalance(userAddress).then(setCheckBalance);
                    })
                    .catch(err => console.error("Payout error:", err));
               }
           }
        }
    } else if (engine.isDraw) {
        setWinner('draw');
    } else {
        setWinner(null);
    }
  }, [engine, gameMode, myColor, potSize, userAddress]);

  // Network Handlers
  const handleNetworkMessage = useCallback((msg: NetworkMessage) => {
     if (msg.type === 'MOVE') {
        const result = engineRef.current.move(msg.from, msg.to);
        if (result) {
            const isCapture = result.flags.includes('c');
            SoundEngine.play(isCapture ? 'capture' : 'move');
            updateGameState();
        }
     } else if (msg.type === 'SPELL') {
        const turn = engineRef.current.turn;
        let success = false;
        if (msg.spellType === 'summon') success = engineRef.current.castPawnSpell(msg.target, turn);
        else if (msg.spellType === 'transform') success = engineRef.current.castTransformSpell(msg.target, turn);
        else if (msg.spellType === 'slip' && msg.source) success = engineRef.current.castSlipSpell(msg.source, msg.target, turn);
        else if (msg.spellType === 'empower' && msg.source) success = engineRef.current.castEmpowerSpell(msg.source, msg.target, turn);
        else if (msg.spellType === 'exchange' && msg.source) success = engineRef.current.castExchangeSpell(msg.source, msg.target, turn);
        else if (msg.spellType === 'portal' && msg.source) success = engineRef.current.castPortalSpell(msg.source, msg.target, turn);
        else if (msg.spellType === 'sacrifice' && msg.source) success = engineRef.current.castSacrificeSpell(msg.source, msg.target, turn);
        else if (msg.spellType === 'cat' && msg.source) success = engineRef.current.castCatSpell(msg.source, msg.target, turn);
        
        if (success && msg.spellType !== 'none') {
             const snd = msg.spellType;
             SoundEngine.play(snd);
             setSpellCounts(prev => ({...prev, [turn]: { ...prev[turn], [msg.spellType]: prev[turn][msg.spellType as Exclude<SpellType, 'none'>] - 1 }}));
             updateGameState();
        }
     } else if (msg.type === 'RESTART') {
         handleReset(true);
     } 
     // --- HANDSHAKE LOGIC ---
     else if (msg.type === 'HANDSHAKE_INIT') {
         // Host receives Joiner address
         setOpponentAddress(msg.address);
         // Host replies with their address + wager
         // NOTE: Host replies even if they haven't finished depositing? 
         // Ideally Host has deposited by now.
         if (network && userAddressRef.current) {
             network.send({ 
                 type: 'HANDSHAKE_REPLY', 
                 address: userAddressRef.current,
                 wager: wagerAmountRef.current
             });
             // Also tell joiner if I am already ready
             if (myDepositCompleteRef.current) {
                 network.send({ type: 'DEPOSIT_CONFIRMED' });
             }
         }
     } else if (msg.type === 'HANDSHAKE_REPLY') {
         // Joiner receives Host address + wager
         setOpponentAddress(msg.address);
         setWagerAmount(msg.wager);
         // Show Deposit UI for Joiner
         if (msg.wager > 0) {
             setPendingBetAmount(msg.wager);
         } else {
             setMyDepositComplete(true);
             if (network) network.send({ type: 'DEPOSIT_CONFIRMED' });
         }
     } else if (msg.type === 'DEPOSIT_CONFIRMED') {
         setOpponentDepositComplete(true);
     }
  }, [updateGameState, network]);

  // Check if both deposited to start game
  useEffect(() => {
      if (myDepositComplete && opponentDepositComplete && gameMode !== 'online') {
          setPotSize(wagerAmount * 2);
          setGameMode('online');
          setPendingBetAmount(null);
          // Play a sound to indicate game start
          SoundEngine.play('empower'); 
      }
  }, [myDepositComplete, opponentDepositComplete, gameMode, wagerAmount]);

  // Auth
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const address = await WalletManager.connect();
      setUserAddress(address);
      if (address) WalletManager.getCheckBalance(address).then(setCheckBalance);
    } catch (e: any) {
      setLoginError(e.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await WalletManager.disconnect();
    setUserAddress(null);
    setCheckBalance(null);
  };

  // Reset
  const handleReset = (silent: boolean = false) => {
    engine.reset();
    setSpellCounts(INITIAL_SPELLS);
    setActiveSpell('none');
    setWinner(null);
    setAnimatingSquare(null);
    setPotSize(0);
    hasPaidOut.current = false;
    updateGameState();
    if (!silent && gameMode === 'online' && network) network.send({ type: 'RESTART' });
  };

  const onError = (err: string) => {
      setIsConnecting(false);
      setConnectionError(err);
  };

  const onConnect = () => { /* Handled in handshake */ };
  const onDisconnect = () => {
      setGameMode('menu');
      setConnectionError('Opponent disconnected');
      handleReset(true);
      setOpponentAddress(null);
      setMyDepositComplete(false);
      setOpponentDepositComplete(false);
      setPendingBetAmount(null);
      setHostId(null);
      setIsConnecting(false);
  };

  // Menu Actions
  const handleLocalPlay = () => {
    setGameMode('local');
    setMyColor('w'); 
    setPotSize(0);
    handleReset(true);
  };

  // HOST: 1. Init Net 2. Set Pending 3. Wait for Deposit
  const handleHostGame = async (wager: number): Promise<string> => {
    setWagerAmount(wager);
    setIsConnecting(true);
    setConnectionError(null);
    
    const net = new NetworkManager(handleNetworkMessage, onConnect, onDisconnect, onError);
    try {
      const id = await net.init();
      setNetwork(net);
      setHostId(id);
      setMyColor('w');
      setMyDepositComplete(false);
      setOpponentDepositComplete(false);
      
      // Prompt Deposit Immediately if > 0
      if (wager > 0) {
        setPendingBetAmount(wager);
      } else {
        setMyDepositComplete(true);
      }
      
      setIsConnecting(false);
      return id;
    } catch (e) {
      setIsConnecting(false);
      setConnectionError("Hosting failed");
      return "";
    }
  };

  const handleJoinGame = async (hostId: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    const net = new NetworkManager(handleNetworkMessage, () => {
        // On Connect: Send my address to init handshake
        if (userAddressRef.current) {
            net.send({ type: 'HANDSHAKE_INIT', address: userAddressRef.current });
        }
    }, onDisconnect, onError);
    try {
      await net.init();
      net.connect(hostId);
      setNetwork(net);
      setMyColor('b');
      setMyDepositComplete(false);
      setOpponentDepositComplete(false);
    } catch (e) {
      setIsConnecting(false);
      setConnectionError("Joining failed");
    }
  };

  // Called when user clicks "Deposit X CHECK" in Menu
  const handleDepositBet = async () => {
      if (pendingBetAmount === null || !userAddress) return;
      setIsConnecting(true); // Show spinner

      try {
          // Deposit wager into Smart Contract (Handles Approve + Deposit)
          await WalletManager.depositWager(userAddress, pendingBetAmount);
          
          setMyDepositComplete(true);
          setPendingBetAmount(null);

          // If I am joiner (or host who is already connected), tell peer
          if (network) network.send({ type: 'DEPOSIT_CONFIRMED' });
          
          // Re-fetch balance
          WalletManager.getCheckBalance(userAddress).then(setCheckBalance);
          setIsConnecting(false);
      } catch (e: any) {
          setConnectionError(e.message || "Deposit failed");
          setIsConnecting(false);
      }
  };

  const handleMove = (from: string, to: string) => {
      if (winner) return;
      if (gameMode === 'online' && engine.turn !== myColor) return;
      const result = engine.move(from, to);
      if (result) {
          SoundEngine.play(result.flags.includes('c') ? 'capture' : 'move');
          updateGameState();
          if (gameMode === 'online' && network) network.send({ type: 'MOVE', from, to });
      }
  };

  const handleSpellCast = (targetSquare: string, sourceSquare?: string) => {
     if (winner || activeSpell === 'none') return;
     if (gameMode === 'online' && engine.turn !== myColor) return;
     if (spellCounts[engine.turn][activeSpell] <= 0) { setActiveSpell('none'); return; }

     let success = false;
     if (activeSpell === 'summon') success = engine.castPawnSpell(targetSquare, engine.turn);
     else if (activeSpell === 'transform') success = engine.castTransformSpell(targetSquare, engine.turn);
     else if (activeSpell === 'slip' && sourceSquare) success = engine.castSlipSpell(sourceSquare, targetSquare, engine.turn);
     else if (activeSpell === 'empower' && sourceSquare) success = engine.castEmpowerSpell(sourceSquare, targetSquare, engine.turn);
     else if (activeSpell === 'exchange' && sourceSquare) success = engine.castExchangeSpell(sourceSquare, targetSquare, engine.turn);
     else if (activeSpell === 'portal' && sourceSquare) success = engine.castPortalSpell(sourceSquare, targetSquare, engine.turn);
     else if (activeSpell === 'sacrifice' && sourceSquare) success = engine.castSacrificeSpell(sourceSquare, targetSquare, engine.turn);
     else if (activeSpell === 'cat' && sourceSquare) success = engine.castCatSpell(sourceSquare, targetSquare, engine.turn);

     if (success) {
         SoundEngine.play(activeSpell);
         setSpellCounts(prev => ({...prev, [engine.turn]: { ...prev[engine.turn], [activeSpell]: prev[engine.turn][activeSpell] - 1 }}));
         setActiveSpell('none');
         updateGameState();
         if (gameMode === 'online' && network) {
             network.send({ type: 'SPELL', spellType: activeSpell, target: targetSquare, source: sourceSquare });
         }
     }
  };

  const handleActivateSpell = (type: SpellType) => {
      if (winner || (gameMode === 'online' && engine.turn !== myColor)) return;
      setActiveSpell(type);
  }

  // Render
  if (gameMode === 'menu') {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <GameMenu 
                onLocalPlay={handleLocalPlay}
                onHostGame={handleHostGame}
                onJoinGame={handleJoinGame}
                onAcceptBet={handleDepositBet}
                isConnecting={isConnecting}
                connectionError={connectionError || loginError}
                pendingBetAmount={pendingBetAmount} 
                userAddress={userAddress}
                checkBalance={checkBalance}
                onLogin={handleLogin}
                onLogout={handleLogout}
                isLoggingIn={isLoggingIn}
                myColor={myColor}
                myDepositComplete={myDepositComplete}
                opponentDepositComplete={opponentDepositComplete}
                hostId={hostId}
              />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row items-center justify-center p-4 lg:p-12 gap-8 relative">
       {/* Check Balance */}
       {checkBalance && (
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm rounded-full border border-yellow-500/30 shadow-lg shadow-yellow-500/10 z-50">
            <div className="p-1 bg-yellow-500/20 rounded-full">
                <CheckToken className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <span className="text-xs font-bold text-yellow-100 font-mono tracking-wide">{checkBalance} <span className="text-yellow-500 ml-0.5">CHECK</span></span>
        </div>
      )}
      
      {/* Board & Controls */}
      <div className="flex-1 w-full max-w-[600px] flex flex-col items-center">
        <h1 className="hidden lg:block text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-8 self-start">
            Sorcerer's Chess
            {gameMode === 'online' && (
                <span className="ml-4 text-sm font-medium text-slate-500 bg-slate-800 px-3 py-1 rounded-full align-middle border border-slate-700">
                    Playing as {myColor === 'w' ? 'White' : 'Black'}
                </span>
            )}
        </h1>
        
        {winner && potSize > 0 && (
            <div className="mb-4 bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 flex items-center gap-2 animate-bounce">
                <Coins className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-100 font-bold">
                    {winner === myColor 
                        ? `VICTORY! Smart Contract Transferring ${potSize} CHECK...` 
                        : `${winner === 'w' ? 'White' : 'Black'} won.`}
                </span>
            </div>
        )}

        <ChessBoard 
          engine={engine}
          fen={fen} 
          activeSpell={activeSpell}
          onMove={handleMove}
          onSpellCast={handleSpellCast}
          turn={engine.turn}
          animatingSquare={animatingSquare}
          orientation={myColor === 'b' ? 'b' : 'w'}
          invisiblePiece={null}
        />
      </div>

      <div className="w-full lg:w-auto flex justify-center lg:block">
        <GameControls 
          turn={engine.turn}
          spellCounts={spellCounts}
          activeSpell={activeSpell}
          onActivateSpell={handleActivateSpell}
          onReset={() => handleReset(false)}
          winner={winner}
          history={engine.getHistory()}
          checkBalance={checkBalance}
          potSize={potSize}
        />
      </div>
    </div>
  );
}

export default App;