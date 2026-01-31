import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// BEE-MAN - Un jeu rétro style Pac-Man
// L'abeille (le peuple) contre les costards (l'oligarchie)
// ═══════════════════════════════════════════════════════════════════════════════

const CELL_SIZE = 20;
const GAME_SPEED = 150;
const POWER_DURATION = 8000;
const ENEMY_SPEED_NORMAL = 200;
const ENEMY_SPEED_VULNERABLE = 400;

// Labyrinthe : 0 = vide, 1 = mur, 2 = pastille, 3 = power-up (miel), 4 = vide sans pastille
const INITIAL_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,1,2,1,2,1,1,1,1,2,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,1,4,1,4,1,1,1,1,2,1,1,1,1],
  [4,4,4,1,2,1,4,4,4,4,4,4,4,4,4,1,2,1,4,4,4],
  [1,1,1,1,2,1,4,1,1,4,4,4,1,1,4,1,2,1,1,1,1],
  [4,4,4,4,2,4,4,1,4,4,4,4,4,1,4,4,2,4,4,4,4],
  [1,1,1,1,2,1,4,1,1,1,1,1,1,1,4,1,2,1,1,1,1],
  [4,4,4,1,2,1,4,4,4,4,4,4,4,4,4,1,2,1,4,4,4],
  [1,1,1,1,2,1,4,1,1,1,1,1,1,1,4,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,1,2,1,2,1,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,4,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZE_HEIGHT = INITIAL_MAZE.length;
const MAZE_WIDTH = INITIAL_MAZE[0].length;

const App = () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS
  // ═══════════════════════════════════════════════════════════════════════════
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('beeman-darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [gameState, setGameState] = useState('menu'); // menu, playing, paused, gameover, win
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('beeman-highScore');
    return saved ? parseInt(saved) : 0;
  });
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  
  const [maze, setMaze] = useState(() => INITIAL_MAZE.map(row => [...row]));
  const [beePos, setBeePos] = useState({ x: 10, y: 15 });
  const [beeDir, setBeeDir] = useState({ x: 0, y: 0 });
  const [nextDir, setNextDir] = useState({ x: 0, y: 0 });
  const [mouthOpen, setMouthOpen] = useState(true);
  
  const [enemies, setEnemies] = useState([
    { id: 0, x: 9, y: 9, dir: { x: 1, y: 0 }, vulnerable: false, eaten: false },
    { id: 1, x: 10, y: 9, dir: { x: -1, y: 0 }, vulnerable: false, eaten: false },
    { id: 2, x: 11, y: 9, dir: { x: 0, y: -1 }, vulnerable: false, eaten: false },
    { id: 3, x: 10, y: 10, dir: { x: 0, y: 1 }, vulnerable: false, eaten: false },
  ]);
  
  const [powerMode, setPowerMode] = useState(false);
  const [powerTimer, setPowerTimer] = useState(null);
  const [pelletsRemaining, setPelletsRemaining] = useState(0);
  
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const enemyLoopRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // COULEURS
  // ═══════════════════════════════════════════════════════════════════════════
  const colors = {
    bg: darkMode ? '#111111' : '#EEC21D',
    primary: darkMode ? '#EEC21D' : '#111111',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFETS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    localStorage.setItem('beeman-darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('beeman-highScore', score.toString());
    }
  }, [score, highScore]);

  // Compter les pastilles au démarrage
  useEffect(() => {
    let count = 0;
    maze.forEach(row => {
      row.forEach(cell => {
        if (cell === 2 || cell === 3) count++;
      });
    });
    setPelletsRemaining(count);
  }, []);

  // Vérifier victoire
  useEffect(() => {
    if (gameState === 'playing' && pelletsRemaining === 0) {
      setGameState('win');
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (enemyLoopRef.current) clearInterval(enemyLoopRef.current);
    }
  }, [pelletsRemaining, gameState]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRÔLES
  // ═══════════════════════════════════════════════════════════════════════════
  const handleKeyDown = useCallback((e) => {
    if (gameState === 'menu') {
      if (e.key === ' ' || e.key === 'Enter') {
        startGame();
      }
      return;
    }
    
    if (gameState === 'gameover' || gameState === 'win') {
      if (e.key === ' ' || e.key === 'Enter') {
        resetGame();
      }
      return;
    }
    
    if (gameState === 'playing') {
      switch (e.key) {
        case 'ArrowUp':
        case 'z':
        case 'Z':
          e.preventDefault();
          setNextDir({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setNextDir({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'q':
        case 'Q':
          e.preventDefault();
          setNextDir({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          setNextDir({ x: 1, y: 0 });
          break;
        case 'p':
        case 'P':
        case 'Escape':
          setGameState('paused');
          break;
        default:
          break;
      }
    } else if (gameState === 'paused') {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape' || e.key === ' ') {
        setGameState('playing');
      }
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIQUE DU JEU
  // ═══════════════════════════════════════════════════════════════════════════
  const canMove = (x, y) => {
    if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) {
      // Tunnel
      if (y === 9 && (x < 0 || x >= MAZE_WIDTH)) return true;
      return false;
    }
    return maze[y][x] !== 1;
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    resetPositions();
    setMaze(INITIAL_MAZE.map(row => [...row]));
    let count = 0;
    INITIAL_MAZE.forEach(row => {
      row.forEach(cell => {
        if (cell === 2 || cell === 3) count++;
      });
    });
    setPelletsRemaining(count);
  };

  const resetGame = () => {
    setGameState('menu');
    setScore(0);
    setLives(3);
    setLevel(1);
    setPowerMode(false);
    if (powerTimer) clearTimeout(powerTimer);
    resetPositions();
    setMaze(INITIAL_MAZE.map(row => [...row]));
  };

  const resetPositions = () => {
    setBeePos({ x: 10, y: 15 });
    setBeeDir({ x: 0, y: 0 });
    setNextDir({ x: 0, y: 0 });
    setEnemies([
      { id: 0, x: 9, y: 9, dir: { x: 1, y: 0 }, vulnerable: false, eaten: false },
      { id: 1, x: 10, y: 9, dir: { x: -1, y: 0 }, vulnerable: false, eaten: false },
      { id: 2, x: 11, y: 9, dir: { x: 0, y: -1 }, vulnerable: false, eaten: false },
      { id: 3, x: 10, y: 10, dir: { x: 0, y: 1 }, vulnerable: false, eaten: false },
    ]);
  };

  const loseLife = () => {
    if (lives > 1) {
      setLives(l => l - 1);
      setPowerMode(false);
      if (powerTimer) clearTimeout(powerTimer);
      resetPositions();
    } else {
      setLives(0);
      setGameState('gameover');
    }
  };

  // Game loop - Abeille
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    gameLoopRef.current = setInterval(() => {
      setMouthOpen(m => !m);
      
      setBeePos(pos => {
        let newDir = beeDir;
        
        // Essayer la nouvelle direction
        if (nextDir.x !== 0 || nextDir.y !== 0) {
          const testX = pos.x + nextDir.x;
          const testY = pos.y + nextDir.y;
          if (canMove(testX, testY)) {
            newDir = nextDir;
            setBeeDir(nextDir);
          }
        }
        
        let newX = pos.x + newDir.x;
        let newY = pos.y + newDir.y;
        
        // Tunnel
        if (newY === 9) {
          if (newX < 0) newX = MAZE_WIDTH - 1;
          if (newX >= MAZE_WIDTH) newX = 0;
        }
        
        if (!canMove(newX, newY)) {
          return pos;
        }
        
        // Manger pastille
        if (maze[newY] && (maze[newY][newX] === 2 || maze[newY][newX] === 3)) {
          const isPower = maze[newY][newX] === 3;
          setMaze(m => {
            const newMaze = m.map(row => [...row]);
            newMaze[newY][newX] = 4;
            return newMaze;
          });
          setScore(s => s + (isPower ? 50 : 10));
          setPelletsRemaining(p => p - 1);
          
          if (isPower) {
            setPowerMode(true);
            setEnemies(e => e.map(enemy => ({ ...enemy, vulnerable: !enemy.eaten })));
            if (powerTimer) clearTimeout(powerTimer);
            const timer = setTimeout(() => {
              setPowerMode(false);
              setEnemies(e => e.map(enemy => ({ ...enemy, vulnerable: false })));
            }, POWER_DURATION);
            setPowerTimer(timer);
          }
        }
        
        return { x: newX, y: newY };
      });
    }, GAME_SPEED);

    return () => clearInterval(gameLoopRef.current);
  }, [gameState, beeDir, nextDir, maze, powerTimer]);

  // Enemy loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (enemyLoopRef.current) clearInterval(enemyLoopRef.current);
      return;
    }

    const speed = powerMode ? ENEMY_SPEED_VULNERABLE : ENEMY_SPEED_NORMAL;
    
    enemyLoopRef.current = setInterval(() => {
      setEnemies(currentEnemies => {
        return currentEnemies.map(enemy => {
          if (enemy.eaten) {
            // Retourner au centre
            if (enemy.x === 10 && enemy.y === 9) {
              return { ...enemy, eaten: false, vulnerable: powerMode };
            }
            const dx = 10 - enemy.x;
            const dy = 9 - enemy.y;
            return {
              ...enemy,
              x: enemy.x + Math.sign(dx),
              y: enemy.y + Math.sign(dy),
            };
          }
          
          // Mouvement IA simple
          const possibleDirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ].filter(d => {
            const newX = enemy.x + d.x;
            const newY = enemy.y + d.y;
            // Ne pas faire demi-tour
            if (d.x === -enemy.dir.x && d.y === -enemy.dir.y) return false;
            return canMove(newX, newY);
          });
          
          if (possibleDirs.length === 0) {
            // Demi-tour forcé
            return {
              ...enemy,
              dir: { x: -enemy.dir.x, y: -enemy.dir.y },
              x: enemy.x - enemy.dir.x,
              y: enemy.y - enemy.dir.y,
            };
          }
          
          // Choisir direction (vers le joueur si pas vulnérable, fuite sinon)
          let bestDir = possibleDirs[0];
          if (!enemy.vulnerable) {
            // Chasser
            let bestDist = Infinity;
            possibleDirs.forEach(d => {
              const newX = enemy.x + d.x;
              const newY = enemy.y + d.y;
              const dist = Math.abs(newX - beePos.x) + Math.abs(newY - beePos.y);
              if (dist < bestDist) {
                bestDist = dist;
                bestDir = d;
              }
            });
          } else {
            // Fuir
            let bestDist = -Infinity;
            possibleDirs.forEach(d => {
              const newX = enemy.x + d.x;
              const newY = enemy.y + d.y;
              const dist = Math.abs(newX - beePos.x) + Math.abs(newY - beePos.y);
              if (dist > bestDist) {
                bestDist = dist;
                bestDir = d;
              }
            });
          }
          
          // Random pour varier
          if (Math.random() < 0.2 && possibleDirs.length > 1) {
            bestDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
          }
          
          let newX = enemy.x + bestDir.x;
          let newY = enemy.y + bestDir.y;
          
          // Tunnel
          if (newY === 9) {
            if (newX < 0) newX = MAZE_WIDTH - 1;
            if (newX >= MAZE_WIDTH) newX = 0;
          }
          
          return {
            ...enemy,
            x: newX,
            y: newY,
            dir: bestDir,
          };
        });
      });
    }, speed);

    return () => clearInterval(enemyLoopRef.current);
  }, [gameState, powerMode, beePos]);

  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    enemies.forEach(enemy => {
      if (enemy.x === beePos.x && enemy.y === beePos.y) {
        if (enemy.vulnerable && !enemy.eaten) {
          // Manger l'ennemi
          setScore(s => s + 200);
          setEnemies(e => e.map(en => 
            en.id === enemy.id ? { ...en, eaten: true, vulnerable: false } : en
          ));
        } else if (!enemy.eaten) {
          // Perdre une vie
          loseLife();
        }
      }
    });
  }, [beePos, enemies, gameState]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU CANVAS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = MAZE_WIDTH * CELL_SIZE;
    const height = MAZE_HEIGHT * CELL_SIZE;
    
    // Clear
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    // Dessiner le labyrinthe
    maze.forEach((row, y) => {
      row.forEach((cell, x) => {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        
        if (cell === 1) {
          // Mur - style pixel art
          ctx.fillStyle = colors.primary;
          ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        } else if (cell === 2) {
          // Pastille (alvéole)
          ctx.fillStyle = colors.primary;
          ctx.beginPath();
          ctx.arc(px + CELL_SIZE/2, py + CELL_SIZE/2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          // Power-up (pot de miel)
          ctx.fillStyle = colors.primary;
          // Pot
          ctx.fillRect(px + 5, py + 8, 10, 8);
          ctx.fillRect(px + 7, py + 5, 6, 3);
          // Miel qui déborde
          ctx.fillRect(px + 6, py + 4, 2, 2);
          ctx.fillRect(px + 12, py + 4, 2, 2);
        }
      });
    });
    
    // Dessiner l'abeille
    const bx = beePos.x * CELL_SIZE + CELL_SIZE / 2;
    const by = beePos.y * CELL_SIZE + CELL_SIZE / 2;
    const beeSize = CELL_SIZE - 4;
    
    ctx.fillStyle = colors.primary;
    
    // Corps de l'abeille (ellipse pixelisée)
    ctx.beginPath();
    if (mouthOpen) {
      // Bouche ouverte - forme pac-man
      const startAngle = beeDir.x === 1 ? 0.25 : beeDir.x === -1 ? 1.25 : beeDir.y === 1 ? 0.75 : 1.75;
      ctx.arc(bx, by, beeSize/2, (startAngle + 0.15) * Math.PI, (startAngle + 1.85) * Math.PI);
      ctx.lineTo(bx, by);
    } else {
      ctx.arc(bx, by, beeSize/2, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // Rayures de l'abeille
    ctx.fillStyle = colors.bg;
    ctx.fillRect(bx - 2, by - beeSize/2 + 3, 4, 2);
    ctx.fillRect(bx - 3, by - 1, 6, 2);
    ctx.fillRect(bx - 2, by + beeSize/2 - 5, 4, 2);
    
    // Antennes
    ctx.fillStyle = colors.primary;
    ctx.fillRect(bx - 4, by - beeSize/2 - 3, 2, 4);
    ctx.fillRect(bx + 2, by - beeSize/2 - 3, 2, 4);
    
    // Dessiner les ennemis (costards)
    enemies.forEach((enemy, i) => {
      const ex = enemy.x * CELL_SIZE + CELL_SIZE / 2;
      const ey = enemy.y * CELL_SIZE + CELL_SIZE / 2;
      const size = CELL_SIZE - 4;
      
      if (enemy.eaten) {
        // Juste les yeux qui retournent
        ctx.fillStyle = colors.primary;
        ctx.fillRect(ex - 4, ey - 2, 3, 3);
        ctx.fillRect(ex + 1, ey - 2, 3, 3);
        return;
      }
      
      ctx.fillStyle = colors.primary;
      
      if (enemy.vulnerable) {
        // Mode vulnérable - costume froissé/tremblant
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      }
      
      // Corps (veste)
      ctx.fillRect(ex - size/2, ey - size/2 + 4, size, size - 4);
      
      // Tête
      ctx.fillRect(ex - 4, ey - size/2 - 2, 8, 6);
      
      // Cravate
      ctx.fillStyle = colors.bg;
      ctx.fillRect(ex - 1, ey - size/2 + 4, 2, size - 6);
      
      // Col de chemise
      ctx.fillRect(ex - 3, ey - size/2 + 3, 2, 3);
      ctx.fillRect(ex + 1, ey - size/2 + 3, 2, 3);
      
      // Yeux
      ctx.fillStyle = colors.bg;
      ctx.fillRect(ex - 3, ey - size/2, 2, 2);
      ctx.fillRect(ex + 1, ey - size/2, 2, 2);
      
      ctx.globalAlpha = 1;
    });
    
  }, [maze, beePos, beeDir, mouthOpen, enemies, colors, powerMode]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRÔLES TACTILES
  // ═══════════════════════════════════════════════════════════════════════════
  const handleTouch = (direction) => {
    if (gameState === 'menu') {
      startGame();
      return;
    }
    if (gameState === 'gameover' || gameState === 'win') {
      resetGame();
      return;
    }
    if (gameState === 'playing') {
      setNextDir(direction);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════════════════
  const pixelFont = "'Press Start 2P', 'Courier New', monospace";
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: pixelFont,
    }}>
      {/* Toggle Dark/Light */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          width: '40px',
          height: '40px',
          borderRadius: '4px',
          background: 'transparent',
          border: `2px solid ${colors.primary}`,
          color: colors.primary,
          cursor: 'pointer',
          fontFamily: pixelFont,
          fontSize: '16px',
          zIndex: 100,
        }}
        title={darkMode ? 'Mode clair' : 'Mode sombre'}
      >
        {darkMode ? '☀' : '☾'}
      </button>

      {/* Titre */}
      <h1 style={{
        fontFamily: pixelFont,
        fontSize: 'clamp(24px, 6vw, 48px)',
        color: colors.primary,
        marginBottom: '10px',
        textAlign: 'center',
        letterSpacing: '4px',
        textShadow: darkMode ? '4px 4px 0px #000' : '4px 4px 0px #cca000',
      }}>
        BEE-MAN
      </h1>
      
      {/* Sous-titre */}
      <p style={{
        fontFamily: pixelFont,
        fontSize: '10px',
        color: colors.primary,
        marginBottom: '20px',
        textAlign: 'center',
        opacity: 0.8,
      }}>
        L'ABEILLE vs LES COSTARDS
      </p>

      {/* Score */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: `${MAZE_WIDTH * CELL_SIZE}px`,
        maxWidth: '100%',
        marginBottom: '10px',
        fontFamily: pixelFont,
        fontSize: '12px',
        color: colors.primary,
      }}>
        <span>SCORE: {score.toString().padStart(6, '0')}</span>
        <span>HIGH: {highScore.toString().padStart(6, '0')}</span>
      </div>

      {/* Vies */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: `${MAZE_WIDTH * CELL_SIZE}px`,
        maxWidth: '100%',
        marginBottom: '10px',
        fontFamily: pixelFont,
        fontSize: '12px',
        color: colors.primary,
      }}>
        <span>VIES: {'🐝'.repeat(lives)}</span>
        <span>NIVEAU: {level}</span>
      </div>

      {/* Canvas du jeu */}
      <div style={{
        position: 'relative',
        border: `4px solid ${colors.primary}`,
        boxShadow: darkMode ? '0 0 20px rgba(238, 194, 29, 0.3)' : '0 0 20px rgba(17, 17, 17, 0.3)',
      }}>
        <canvas
          ref={canvasRef}
          width={MAZE_WIDTH * CELL_SIZE}
          height={MAZE_HEIGHT * CELL_SIZE}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
        
        {/* Overlay Menu */}
        {gameState === 'menu' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: darkMode ? 'rgba(17, 17, 17, 0.9)' : 'rgba(238, 194, 29, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🐝</div>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '14px',
              color: colors.primary,
              textAlign: 'center',
              marginBottom: '30px',
              lineHeight: 2,
            }}>
              MANGEZ LES ALVEOLES<br/>
              EVITEZ LES COSTARDS<br/>
              LE MIEL DONNE DU POUVOIR!
            </p>
            <button
              onClick={startGame}
              style={{
                fontFamily: pixelFont,
                fontSize: '14px',
                padding: '15px 30px',
                background: 'transparent',
                border: `3px solid ${colors.primary}`,
                color: colors.primary,
                cursor: 'pointer',
                animation: 'blink 1s infinite',
              }}
            >
              APPUYEZ POUR JOUER
            </button>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '8px',
              color: colors.primary,
              marginTop: '20px',
              opacity: 0.6,
            }}>
              FLECHES OU ZQSD
            </p>
          </div>
        )}

        {/* Overlay Pause */}
        {gameState === 'paused' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: darkMode ? 'rgba(17, 17, 17, 0.9)' : 'rgba(238, 194, 29, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '20px',
              color: colors.primary,
              marginBottom: '20px',
            }}>
              PAUSE
            </p>
            <button
              onClick={() => setGameState('playing')}
              style={{
                fontFamily: pixelFont,
                fontSize: '12px',
                padding: '10px 20px',
                background: 'transparent',
                border: `2px solid ${colors.primary}`,
                color: colors.primary,
                cursor: 'pointer',
              }}
            >
              CONTINUER
            </button>
          </div>
        )}

        {/* Overlay Game Over */}
        {gameState === 'gameover' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: darkMode ? 'rgba(17, 17, 17, 0.9)' : 'rgba(238, 194, 29, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '24px',
              color: colors.primary,
              marginBottom: '10px',
            }}>
              GAME OVER
            </p>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '12px',
              color: colors.primary,
              marginBottom: '20px',
            }}>
              SCORE: {score}
            </p>
            <button
              onClick={resetGame}
              style={{
                fontFamily: pixelFont,
                fontSize: '12px',
                padding: '10px 20px',
                background: 'transparent',
                border: `2px solid ${colors.primary}`,
                color: colors.primary,
                cursor: 'pointer',
              }}
            >
              REJOUER
            </button>
          </div>
        )}

        {/* Overlay Victoire */}
        {gameState === 'win' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: darkMode ? 'rgba(17, 17, 17, 0.9)' : 'rgba(238, 194, 29, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏆</div>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '20px',
              color: colors.primary,
              marginBottom: '10px',
            }}>
              VICTOIRE!
            </p>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '10px',
              color: colors.primary,
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              L'ABEILLE A VAINCU<br/>L'OLIGARCHIE!
            </p>
            <p style={{
              fontFamily: pixelFont,
              fontSize: '12px',
              color: colors.primary,
              marginBottom: '20px',
            }}>
              SCORE: {score}
            </p>
            <button
              onClick={resetGame}
              style={{
                fontFamily: pixelFont,
                fontSize: '12px',
                padding: '10px 20px',
                background: 'transparent',
                border: `2px solid ${colors.primary}`,
                color: colors.primary,
                cursor: 'pointer',
              }}
            >
              REJOUER
            </button>
          </div>
        )}
      </div>

      {/* Contrôles tactiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 50px)',
        gridTemplateRows: 'repeat(3, 50px)',
        gap: '5px',
        marginTop: '20px',
      }}>
        <div />
        <button
          onClick={() => handleTouch({ x: 0, y: -1 })}
          style={{
            background: 'transparent',
            border: `2px solid ${colors.primary}`,
            color: colors.primary,
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => handleTouch({ x: -1, y: 0 })}
          style={{
            background: 'transparent',
            border: `2px solid ${colors.primary}`,
            color: colors.primary,
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ◀
        </button>
        <div />
        <button
          onClick={() => handleTouch({ x: 1, y: 0 })}
          style={{
            background: 'transparent',
            border: `2px solid ${colors.primary}`,
            color: colors.primary,
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ▶
        </button>
        <div />
        <button
          onClick={() => handleTouch({ x: 0, y: 1 })}
          style={{
            background: 'transparent',
            border: `2px solid ${colors.primary}`,
            color: colors.primary,
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ▼
        </button>
        <div />
      </div>

      {/* Footer */}
      <p style={{
        fontFamily: pixelFont,
        fontSize: '8px',
        color: colors.primary,
        marginTop: '20px',
        opacity: 0.5,
        textAlign: 'center',
      }}>
        © 2026 RUCHE 75 - BUTINER NOTRE FUTUR
      </p>

      {/* CSS pour animation */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        button:hover {
          transform: scale(1.05);
        }
        
        button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default App;
