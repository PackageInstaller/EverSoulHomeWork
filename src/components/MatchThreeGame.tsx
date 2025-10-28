'use client';

import { useState, useEffect, useRef } from 'react';

interface MatchThreeGameProps {
  onClose: () => void;
}

// 方块类型
type TileColor = 'Blue' | 'Green' | 'Purple' | 'Red' | 'Yellow';
type SpecialType = 'none' | 'horizontal' | 'vertical' | 'bomb' | 'rainbow';

interface Tile {
  id: number;
  color: TileColor;
  special: SpecialType;
  row: number;
  col: number;
}

const COLORS: TileColor[] = ['Blue', 'Green', 'Purple', 'Red', 'Yellow'];
const GRID_SIZE = 8;
const TILE_SIZE = 130;
const NO_ACTION_TIMEOUT = 5000; // 5秒无操作提示

export default function MatchThreeGame({ onClose }: MatchThreeGameProps) {
  const [grid, setGrid] = useState<(Tile | null)[][]>([]);
  const [selectedTile, setSelectedTile] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hint, setHint] = useState<{ row: number; col: number }[]>([]); // 改为数组，显示所有可消除的方块
  const [showNoMoves, setShowNoMoves] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // 标记游戏是否已经初始化完成
  const [crushingTiles, setCrushingTiles] = useState<Set<string>>(new Set()); // 正在粉碎的方块
  const [fallingTiles, setFallingTiles] = useState<Map<string, number>>(new Map()); // 正在下落的方块及其起始位置
  const [appearingSpecials, setAppearingSpecials] = useState<Set<string>>(new Set()); // 正在出现的特殊方块
  const [appearedSpecials, setAppearedSpecials] = useState<Set<string>>(new Set()); // 已经出现过的特殊方块
  const [swappingTiles, setSwappingTiles] = useState<{ from: { row: number; col: number }, to: { row: number; col: number } } | null>(null); // 正在交换的方块

  // 拖动相关状态
  const [draggingTile, setDraggingTile] = useState<{ row: number; col: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const lastActionRef = useRef<number>(Date.now());
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tileIdCounter = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // 初始化网格
  useEffect(() => {
    initializeGrid();
  }, []);

  // 提示系统 - 5秒无操作时显示提示
  useEffect(() => {
    const checkForHint = () => {
      const timeSinceLastAction = Date.now() - lastActionRef.current;
      if (timeSinceLastAction >= NO_ACTION_TIMEOUT && hint.length === 0 && !isAnimating && isInitialized) {
        findAndShowHint();
      }
    };

    hintTimerRef.current = setInterval(checkForHint, 1000);

    return () => {
      if (hintTimerRef.current) {
        clearInterval(hintTimerRef.current);
      }
    };
  }, [hint, isAnimating, isInitialized]);

  // 拖动事件监听
  useEffect(() => {
    if (draggingTile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingTile, dragPosition]);

  // 重置提示计时器
  const resetHintTimer = () => {
    lastActionRef.current = Date.now();
    setHint([]);
  };

  // 生成随机颜色
  const getRandomColor = (): TileColor => {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  };

  // 创建方块
  const createTile = (row: number, col: number, color?: TileColor): Tile => {
    return {
      id: tileIdCounter.current++,
      color: color || getRandomColor(),
      special: 'none',
      row,
      col
    };
  };

  // 初始化网格（确保没有初始匹配）
  const initializeGrid = () => {
    const newGrid: (Tile | null)[][] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        let tile: Tile;
        let attempts = 0;

        // 尝试生成不会形成初始匹配的方块
        do {
          tile = createTile(row, col);
          attempts++;
        } while (attempts < 10 && wouldCreateMatch(newGrid, row, col, tile.color));

        newGrid[row][col] = tile;
      }
    }

    setGrid(newGrid);
    setIsInitialized(true); // 标记初始化完成

    // 重置提示计时器，从现在开始计时
    lastActionRef.current = Date.now();

    // 检查是否有可行的移动
    setTimeout(() => {
      if (!hasValidMoves(newGrid)) {
        shuffleGrid();
      }
    }, 100);
  };

  // 检查放置某个颜色是否会形成初始匹配
  const wouldCreateMatch = (grid: (Tile | null)[][], row: number, col: number, color: TileColor): boolean => {
    // 检查水平方向
    let horizontalCount = 1;
    // 向左检查
    for (let c = col - 1; c >= 0 && grid[row] && grid[row][c]?.color === color; c--) {
      horizontalCount++;
    }
    // 向右检查
    for (let c = col + 1; c < GRID_SIZE && grid[row] && grid[row][c]?.color === color; c++) {
      horizontalCount++;
    }
    if (horizontalCount >= 3) return true;

    // 检查垂直方向
    let verticalCount = 1;
    // 向上检查
    for (let r = row - 1; r >= 0 && grid[r] && grid[r][col]?.color === color; r--) {
      verticalCount++;
    }
    // 向下检查
    for (let r = row + 1; r < GRID_SIZE && grid[r] && grid[r][col]?.color === color; r++) {
      verticalCount++;
    }
    if (verticalCount >= 3) return true;

    return false;
  };

  // 拖动开始
  const handleTileMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (isAnimating) return;
    e.preventDefault();
    e.stopPropagation();
    resetHintTimer();

    const tile = grid[row]?.[col];
    if (!tile) return;

    setDraggingTile({ row, col });
    setSelectedTile({ row, col });
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleTileTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    if (isAnimating) return;
    e.preventDefault();
    e.stopPropagation();
    resetHintTimer();

    const tile = grid[row]?.[col];
    if (!tile) return;

    const touch = e.touches[0];
    setDraggingTile({ row, col });
    setSelectedTile({ row, col });
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  // 拖动中
  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingTile || !dragPosition) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!draggingTile || !dragPosition) return;
    const touch = e.touches[0];
    setDragPosition({ x: touch.clientX, y: touch.clientY });
  };

  // 拖动结束
  const handleMouseUp = (e: MouseEvent) => {
    if (!draggingTile || !gridRef.current) {
      setDraggingTile(null);
      setDragPosition(null);
      return;
    }

    // 获取鼠标位置对应的格子
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileSize = 68; // 64px + 4px margin
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);

    // 检查是否在有效范围内且相邻
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const rowDiff = Math.abs(draggingTile.row - row);
      const colDiff = Math.abs(draggingTile.col - col);

      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        swapTiles(draggingTile.row, draggingTile.col, row, col);
      }
    }

    setDraggingTile(null);
    setDragPosition(null);
    setSelectedTile(null);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!draggingTile || !gridRef.current) {
      setDraggingTile(null);
      setDragPosition(null);
      return;
    }

    const touch = e.changedTouches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const tileSize = 68;
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const rowDiff = Math.abs(draggingTile.row - row);
      const colDiff = Math.abs(draggingTile.col - col);

      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        swapTiles(draggingTile.row, draggingTile.col, row, col);
      }
    }

    setDraggingTile(null);
    setDragPosition(null);
    setSelectedTile(null);
  };

  // 点击方块（仅用于重置提示计时器）
  const handleTileClick = (row: number, col: number) => {
    if (isAnimating || draggingTile) return;
    resetHintTimer();
  };

  // 交换两个方块
  const swapTiles = async (row1: number, col1: number, row2: number, col2: number) => {
    setIsAnimating(true);

    // 设置交换动画状态
    setSwappingTiles({ from: { row: row1, col: col1 }, to: { row: row2, col: col2 } });

    // 等待动画开始
    await new Promise(resolve => setTimeout(resolve, 50));

    const newGrid = grid.map(row => [...row]);
    [newGrid[row1][col1], newGrid[row2][col2]] = [newGrid[row2][col2], newGrid[row1][col1]];

    // 更新方块的位置信息
    if (newGrid[row1][col1]) newGrid[row1][col1]!.row = row1;
    if (newGrid[row1][col1]) newGrid[row1][col1]!.col = col1;
    if (newGrid[row2][col2]) newGrid[row2][col2]!.row = row2;
    if (newGrid[row2][col2]) newGrid[row2][col2]!.col = col2;

    setGrid(newGrid);

    // 等待交换动画完成
    await new Promise(resolve => setTimeout(resolve, 250));

    // 清除交换动画状态
    setSwappingTiles(null);

    // 检查是否有特殊方块被移动
    const tile1 = newGrid[row1][col1];
    const tile2 = newGrid[row2][col2];
    const hasSpecialTile = (tile1 && tile1.special !== 'none') || (tile2 && tile2.special !== 'none');

    // 检查是否有普通匹配
    const matches = findMatches(newGrid);

    if (hasSpecialTile && matches.length > 0) {
      // 同时有特殊方块和三消，合并处理
      await processSpecialTileSwapWithMatches(newGrid, row1, col1, row2, col2, matches);
      lastActionRef.current = Date.now();
      setIsAnimating(false);
      return;
    }

    if (hasSpecialTile) {
      // 只有特殊方块，触发特殊效果
      await processSpecialTileSwap(newGrid, row1, col1, row2, col2);
      setIsAnimating(false);
      return;
    }

    if (matches.length === 0) {
      // 没有匹配，交换回去
      [newGrid[row1][col1], newGrid[row2][col2]] = [newGrid[row2][col2], newGrid[row1][col1]];
      if (newGrid[row1][col1]) newGrid[row1][col1]!.row = row1;
      if (newGrid[row1][col1]) newGrid[row1][col1]!.col = col1;
      if (newGrid[row2][col2]) newGrid[row2][col2]!.row = row2;
      if (newGrid[row2][col2]) newGrid[row2][col2]!.col = col2;
      setGrid(newGrid);
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsAnimating(false);
    } else {
      // 有匹配，开始连锁消除
      await processMatches(newGrid);
      // 重置提示计时器
      lastActionRef.current = Date.now();
      setIsAnimating(false);
    }
  };

  // 处理特殊方块交换（同时有三消）
  const processSpecialTileSwapWithMatches = async (
    currentGrid: (Tile | null)[][],
    row1: number,
    col1: number,
    row2: number,
    col2: number,
    matches: { row: number; col: number }[]
  ) => {
    let grid = currentGrid.map(row => [...row]);
    let totalScore = 0;

    // 检查两个交换的方块
    const tile1 = grid[row1]?.[col1];
    const tile2 = grid[row2]?.[col2];

    // 特殊情况：两个彩虹方块交换 = 全屏清除！
    if (tile1?.special === 'rainbow' && tile2?.special === 'rainbow') {
      const tilesToRemove: { row: number; col: number }[] = [];

      // 收集所有方块
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r]?.[c]) {
            tilesToRemove.push({ row: r, col: c });
          }
        }
      }

      // 计算得分（全屏清除给予超高分）
      totalScore = tilesToRemove.length * 50; // 超级奖励！

      // 显示粉碎动画
      const crushingSet = new Set(tilesToRemove.map(t => `${t.row},${t.col}`));
      setCrushingTiles(crushingSet);
      await new Promise(resolve => setTimeout(resolve, 400));

      // 清空整个屏幕
      const newGrid = grid.map(row => row.map(() => null));

      setCrushingTiles(new Set());
      setGrid(newGrid);
      setScore(prev => prev + totalScore);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 下落和填充（实际上是填充整个屏幕）
      grid = applyGravity(newGrid);
      setGrid(grid);
      await new Promise(resolve => setTimeout(resolve, 400));

      grid = fillGrid(grid);
      setGrid(grid);
      await new Promise(resolve => setTimeout(resolve, 300));

      // 检查是否有新的匹配（连锁反应）
      await processMatches(grid);

      // 重置提示计时器
      lastActionRef.current = Date.now();

      // 检查是否还有可行的移动
      if (!hasValidMoves(grid)) {
        setShowNoMoves(true);
        setTimeout(() => {
          setShowNoMoves(false);
          shuffleGrid();
        }, 2000);
      }

      return;
    }

    // 收集所有需要触发的特殊方块（连锁触发）
    const specialTilesToTrigger: { row: number; col: number; tile: Tile }[] = [];
    if (tile1 && tile1.special !== 'none') {
      specialTilesToTrigger.push({ row: row1, col: col1, tile: tile1 });
    }
    if (tile2 && tile2.special !== 'none') {
      specialTilesToTrigger.push({ row: row2, col: col2, tile: tile2 });
    }

    // 收集需要消除的方块（包括特殊效果和三消）
    const tilesToRemove: { row: number; col: number }[] = [...matches];
    const processedSpecials = new Set<string>();

    // 循环处理所有特殊方块（包括连锁触发的）
    while (specialTilesToTrigger.length > 0) {
      const { row, col, tile } = specialTilesToTrigger.shift()!;
      const key = `${row},${col}`;

      // 避免重复处理同一个特殊方块
      if (processedSpecials.has(key)) continue;
      processedSpecials.add(key);

      // 收集该特殊方块影响的方块
      let affected: { row: number; col: number }[] = [];

      if (tile.special === 'rainbow') {
        const otherTile = (row === row1 && col === col1) ? tile2 : tile1;
        if (otherTile) {
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (grid[r]?.[c]?.color === otherTile.color) {
                affected.push({ row: r, col: c });
              }
            }
          }
        }
      } else {
        affected = getSpecialEffectTiles(grid, row, col, tile);
      }

      // 检查受影响的方块中是否还有特殊方块
      affected.forEach(({ row: r, col: c }) => {
        const affectedTile = grid[r]?.[c];
        if (affectedTile && affectedTile.special !== 'none' && !processedSpecials.has(`${r},${c}`)) {
          specialTilesToTrigger.push({ row: r, col: c, tile: affectedTile });
        }
      });

      tilesToRemove.push(...affected);
      tilesToRemove.push({ row, col });
    }

    // 去重
    const uniqueTiles = Array.from(new Set(tilesToRemove.map(t => `${t.row},${t.col}`)))
      .map(pos => {
        const [row, col] = pos.split(',').map(Number);
        return { row, col };
      });

    // 计算得分（特殊+三消混合得分）
    totalScore = uniqueTiles.length * 12;

    // 显示粉碎动画
    const crushingSet = new Set(uniqueTiles.map(t => `${t.row},${t.col}`));
    setCrushingTiles(crushingSet);
    await new Promise(resolve => setTimeout(resolve, 400));

    // 消除方块
    const newGrid = grid.map(row => [...row]);
    uniqueTiles.forEach(({ row, col }) => {
      newGrid[row][col] = null;
    });

    setCrushingTiles(new Set());
    setGrid(newGrid);
    setScore(prev => prev + totalScore);

    await new Promise(resolve => setTimeout(resolve, 100));

    // 下落和填充
    grid = applyGravity(newGrid);
    setGrid(grid);
    await new Promise(resolve => setTimeout(resolve, 400));

    grid = fillGrid(grid);
    setGrid(grid);
    await new Promise(resolve => setTimeout(resolve, 300));

    // 检查是否有新的匹配（连锁反应）
    await processMatches(grid);

    // 重置提示计时器
    lastActionRef.current = Date.now();

    // 检查是否还有可行的移动
    if (!hasValidMoves(grid)) {
      setShowNoMoves(true);
      setTimeout(() => {
        setShowNoMoves(false);
        shuffleGrid();
      }, 2000);
    }
  };

  // 处理特殊方块交换
  const processSpecialTileSwap = async (currentGrid: (Tile | null)[][], row1: number, col1: number, row2: number, col2: number) => {
    let grid = currentGrid.map(row => [...row]);
    let totalScore = 0;

    // 检查两个交换的方块
    const tile1 = grid[row1]?.[col1];
    const tile2 = grid[row2]?.[col2];

    // 特殊情况：两个彩虹方块交换 = 全屏清除！
    if (tile1?.special === 'rainbow' && tile2?.special === 'rainbow') {
      const tilesToRemove: { row: number; col: number }[] = [];

      // 收集所有方块
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[r]?.[c]) {
            tilesToRemove.push({ row: r, col: c });
          }
        }
      }

      // 计算得分（全屏清除给予超高分）
      totalScore = tilesToRemove.length * 50; // 超级奖励！

      // 显示粉碎动画
      const crushingSet = new Set(tilesToRemove.map(t => `${t.row},${t.col}`));
      setCrushingTiles(crushingSet);
      await new Promise(resolve => setTimeout(resolve, 400));

      // 清空整个屏幕
      const newGrid = grid.map(row => row.map(() => null));

      setCrushingTiles(new Set());
      setGrid(newGrid);
      setScore(prev => prev + totalScore);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 下落和填充（实际上是填充整个屏幕）
      grid = applyGravity(newGrid);
      setGrid(grid);
      await new Promise(resolve => setTimeout(resolve, 400));

      grid = fillGrid(grid);
      setGrid(grid);
      await new Promise(resolve => setTimeout(resolve, 300));

      // 检查是否有新的匹配（连锁反应）
      await processMatches(grid);

      // 重置提示计时器
      lastActionRef.current = Date.now();

      // 检查是否还有可行的移动
      if (!hasValidMoves(grid)) {
        setShowNoMoves(true);
        setTimeout(() => {
          setShowNoMoves(false);
          shuffleGrid();
        }, 2000);
      }

      return;
    }

    // 收集所有需要触发的特殊方块（连锁触发）
    const specialTilesToTrigger: { row: number; col: number; tile: Tile }[] = [];
    if (tile1 && tile1.special !== 'none') {
      specialTilesToTrigger.push({ row: row1, col: col1, tile: tile1 });
    }
    if (tile2 && tile2.special !== 'none') {
      specialTilesToTrigger.push({ row: row2, col: col2, tile: tile2 });
    }

    // 收集需要消除的方块
    const tilesToRemove: { row: number; col: number }[] = [];
    const processedSpecials = new Set<string>();

    // 循环处理所有特殊方块（包括连锁触发的）
    while (specialTilesToTrigger.length > 0) {
      const { row, col, tile } = specialTilesToTrigger.shift()!;
      const key = `${row},${col}`;

      // 避免重复处理同一个特殊方块
      if (processedSpecials.has(key)) continue;
      processedSpecials.add(key);

      // 收集该特殊方块影响的方块
      let affected: { row: number; col: number }[] = [];

      if (tile.special === 'rainbow') {
        // 彩虹方块：消除与交换的另一个方块相同颜色的所有方块
        const otherTile = (row === row1 && col === col1) ? tile2 : tile1;
        if (otherTile) {
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (grid[r]?.[c]?.color === otherTile.color) {
                affected.push({ row: r, col: c });
              }
            }
          }
        }
      } else {
        affected = getSpecialEffectTiles(grid, row, col, tile);
      }

      // 检查受影响的方块中是否还有特殊方块，如果有，加入触发列表
      affected.forEach(({ row: r, col: c }) => {
        const affectedTile = grid[r]?.[c];
        if (affectedTile && affectedTile.special !== 'none' && !processedSpecials.has(`${r},${c}`)) {
          specialTilesToTrigger.push({ row: r, col: c, tile: affectedTile });
        }
      });

      tilesToRemove.push(...affected);
      tilesToRemove.push({ row, col }); // 特殊方块自己也要消除
    }

    // 去重
    const uniqueTiles = Array.from(new Set(tilesToRemove.map(t => `${t.row},${t.col}`)))
      .map(pos => {
        const [row, col] = pos.split(',').map(Number);
        return { row, col };
      });

    // 计算得分
    totalScore = uniqueTiles.length * 15; // 特殊方块消除给更多分

    // 显示粉碎动画
    const crushingSet = new Set(uniqueTiles.map(t => `${t.row},${t.col}`));
    setCrushingTiles(crushingSet);
    await new Promise(resolve => setTimeout(resolve, 400));

    // 消除方块
    const newGrid = grid.map(row => [...row]);
    uniqueTiles.forEach(({ row, col }) => {
      newGrid[row][col] = null;
    });

    setCrushingTiles(new Set());
    setGrid(newGrid);
    setScore(prev => prev + totalScore);

    await new Promise(resolve => setTimeout(resolve, 100));

    // 下落和填充
    grid = applyGravity(newGrid);
    setGrid(grid);
    await new Promise(resolve => setTimeout(resolve, 400));

    grid = fillGrid(grid);
    setGrid(grid);
    await new Promise(resolve => setTimeout(resolve, 300));

    // 检查是否有新的匹配（连锁反应）
    await processMatches(grid);

    // 重置提示计时器
    lastActionRef.current = Date.now();

    // 检查是否还有可行的移动
    if (!hasValidMoves(grid)) {
      setShowNoMoves(true);
      setTimeout(() => {
        setShowNoMoves(false);
        shuffleGrid();
      }, 2000);
    }
  };

  // 查找所有匹配
  const findMatches = (grid: (Tile | null)[][]): { row: number; col: number }[] => {
    const matches = new Set<string>();

    // 检查水平匹配
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const tile = grid[row][col];
        if (!tile) continue;

        let matchLength = 1;
        for (let c = col + 1; c < GRID_SIZE && grid[row][c]?.color === tile.color; c++) {
          matchLength++;
        }

        if (matchLength >= 3) {
          for (let c = col; c < col + matchLength; c++) {
            matches.add(`${row},${c}`);
          }
        }
      }
    }

    // 检查垂直匹配
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const tile = grid[row][col];
        if (!tile) continue;

        let matchLength = 1;
        for (let r = row + 1; r < GRID_SIZE && grid[r][col]?.color === tile.color; r++) {
          matchLength++;
        }

        if (matchLength >= 3) {
          for (let r = row; r < row + matchLength; r++) {
            matches.add(`${r},${col}`);
          }
        }
      }
    }

    return Array.from(matches).map(pos => {
      const [row, col] = pos.split(',').map(Number);
      return { row, col };
    });
  };

  // 处理匹配和连锁反应
  const processMatches = async (currentGrid: (Tile | null)[][]) => {
    let grid = currentGrid;
    let totalNewScore = 0;

    while (true) {
      let matches = findMatches(grid);

      // 收集需要触发的特殊方块（连锁触发）
      const specialTilesToTrigger: { row: number; col: number; tile: Tile }[] = [];
      matches.forEach(({ row, col }) => {
        const tile = grid[row][col];
        if (tile && tile.special !== 'none') {
          specialTilesToTrigger.push({ row, col, tile });
        }
      });

      // 收集特殊方块影响的所有方块（包括连锁触发）
      const specialEffects: { row: number; col: number }[] = [];
      const processedSpecials = new Set<string>();

      while (specialTilesToTrigger.length > 0) {
        const { row, col, tile } = specialTilesToTrigger.shift()!;
        const key = `${row},${col}`;

        // 避免重复处理同一个特殊方块
        if (processedSpecials.has(key)) continue;
        processedSpecials.add(key);

        // 收集该特殊方块影响的方块
        const affected = getSpecialEffectTiles(grid, row, col, tile);

        // 检查受影响的方块中是否还有特殊方块，如果有，加入触发列表
        affected.forEach(({ row: r, col: c }) => {
          const affectedTile = grid[r]?.[c];
          if (affectedTile && affectedTile.special !== 'none' && !processedSpecials.has(`${r},${c}`)) {
            specialTilesToTrigger.push({ row: r, col: c, tile: affectedTile });
          }
        });

        specialEffects.push(...affected);
      }

      // 合并普通匹配和特殊效果
      const allTilesToRemove = [...matches, ...specialEffects];
      const uniqueTiles = Array.from(new Set(allTilesToRemove.map(t => `${t.row},${t.col}`)))
        .map(pos => {
          const [row, col] = pos.split(',').map(Number);
          return { row, col };
        });

      if (uniqueTiles.length === 0) break;

      // 计算得分（特殊效果额外加分）
      totalNewScore += uniqueTiles.length * 10;
      if (specialEffects.length > 0) {
        totalNewScore += specialEffects.length * 5; // 特殊效果额外加分
      }

      // 检查是否生成特殊方块，并获取特殊方块的位置
      const specialTilePositions = new Set<string>();
      const gridWithSpecial = generateSpecialTiles(grid, matches, specialTilePositions);

      // 从要消除的方块中排除特殊方块位置
      const tilesToRemove = uniqueTiles.filter(t =>
        !specialTilePositions.has(`${t.row},${t.col}`)
      );

      // 清理将要被消除的方块的出现记录（通过ID）
      const tilesToClear = uniqueTiles
        .map(t => grid[t.row]?.[t.col]?.id?.toString())
        .filter((id): id is string => !!id);
      setAppearedSpecials(prev => {
        const newSet = new Set(prev);
        tilesToClear.forEach(id => newSet.delete(id));
        return newSet;
      });

      // 显示粉碎动画（不包括特殊方块）
      const crushingSet = new Set(tilesToRemove.map(t => `${t.row},${t.col}`));
      setCrushingTiles(crushingSet);
      await new Promise(resolve => setTimeout(resolve, 400)); // 粉碎动画时长

      // 消除方块（不包括特殊方块）
      const newGrid = gridWithSpecial.map(row => [...row]);
      tilesToRemove.forEach(({ row, col }) => {
        newGrid[row][col] = null;
      });

      setCrushingTiles(new Set());
      
      // 先更新grid，但特殊方块会因为CSS初始状态而不可见
      setGrid(newGrid);
      grid = newGrid;

      // 等待一帧后设置动画状态，触发动画
      if (specialTilePositions.size > 0) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        setAppearingSpecials(specialTilePositions);
      }

      // 等待特殊方块出现动画完成
      if (specialTilePositions.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 400)); // 特殊方块出现动画时长
        setAppearingSpecials(new Set());
        // 标记这些特殊方块已经出现过（通过ID）
        const specialTileIds = Array.from(specialTilePositions)
          .map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return grid[row]?.[col]?.id?.toString();
          })
          .filter((id): id is string => !!id);
        setAppearedSpecials(prev => new Set([...Array.from(prev), ...specialTileIds]));
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // 下落
      grid = applyGravity(grid);
      setGrid(grid);
      await new Promise(resolve => setTimeout(resolve, 400)); // 等待下落动画完成

      // 填充新方块
      grid = fillGrid(grid);
      setGrid(grid);
      await new Promise(resolve => setTimeout(resolve, 300)); // 等待填充动画完成
    }

    setScore(prev => prev + totalNewScore);

    // 检查是否还有可行的移动
    if (!hasValidMoves(grid)) {
      setShowNoMoves(true);
      setTimeout(() => {
        setShowNoMoves(false);
        shuffleGrid();
      }, 2000);
    }
  };

  // 获取特殊方块效果影响的所有方块
  const getSpecialEffectTiles = (grid: (Tile | null)[][], row: number, col: number, tile: Tile): { row: number; col: number }[] => {
    const affected: { row: number; col: number }[] = [];

    switch (tile.special) {
      case 'horizontal':
        // 消除整行
        for (let c = 0; c < GRID_SIZE; c++) {
          if (grid[row]?.[c]) {
            affected.push({ row, col: c });
          }
        }
        break;

      case 'vertical':
        // 消除整列
        for (let r = 0; r < GRID_SIZE; r++) {
          if (grid[r]?.[col]) {
            affected.push({ row: r, col });
          }
        }
        break;

      case 'bomb':
        // 消除周围3x3区域
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID_SIZE - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(GRID_SIZE - 1, col + 1); c++) {
            if (grid[r]?.[c]) {
              affected.push({ row: r, col: c });
            }
          }
        }
        break;

      case 'rainbow':
        // 消除所有相同颜色的方块
        const targetColor = tile.color;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r]?.[c]?.color === targetColor) {
              affected.push({ row: r, col: c });
            }
          }
        }
        break;
    }

    return affected;
  };

  // 生成特殊方块
  const generateSpecialTiles = (
    grid: (Tile | null)[][],
    matches: { row: number; col: number }[],
    specialPositions?: Set<string>
  ): (Tile | null)[][] => {
    const newGrid = grid.map(row => [...row]);

    // 检查是否有4连或5连
    const matchGroups = groupMatches(matches);

    matchGroups.forEach(group => {
      if (group.length >= 5) {
        // 5连生成彩虹方块（消除所有同色）
        // 如果是纵向，使用最下面的位置；否则使用中间位置
        const isVertical = group.every(tile => tile.col === group[0].col);
        const targetTile = isVertical
          ? group.reduce((max, tile) => tile.row > max.row ? tile : max, group[0])
          : group[Math.floor(group.length / 2)];

        if (newGrid[targetTile.row]?.[targetTile.col]) {
          newGrid[targetTile.row][targetTile.col]!.special = 'rainbow';
          // 记录特殊方块位置
          if (specialPositions) {
            specialPositions.add(`${targetTile.row},${targetTile.col}`);
          }
        }
      } else if (group.length === 4) {
        // 4连生成横向或纵向消除
        const isHorizontal = group.every(tile => tile.row === group[0].row);
        const isVertical = group.every(tile => tile.col === group[0].col);

        // 如果是纵向，使用最下面的位置；否则使用中间位置
        const targetTile = isVertical
          ? group.reduce((max, tile) => tile.row > max.row ? tile : max, group[0])
          : group[Math.floor(group.length / 2)];

        if (newGrid[targetTile.row]?.[targetTile.col]) {
          if (isHorizontal) {
            newGrid[targetTile.row][targetTile.col]!.special = 'horizontal';
            // 记录特殊方块位置
            if (specialPositions) {
              specialPositions.add(`${targetTile.row},${targetTile.col}`);
            }
          } else if (isVertical) {
            newGrid[targetTile.row][targetTile.col]!.special = 'vertical';
            // 记录特殊方块位置
            if (specialPositions) {
              specialPositions.add(`${targetTile.row},${targetTile.col}`);
            }
          } else {
            // L形或T形，生成炸弹
            newGrid[targetTile.row][targetTile.col]!.special = 'bomb';
            // 记录特殊方块位置
            if (specialPositions) {
              specialPositions.add(`${targetTile.row},${targetTile.col}`);
            }
          }
        }
      } else if (group.length >= 3) {
        // 检查是否是L形或T形（生成炸弹）
        const rows = new Set(group.map(t => t.row));
        const cols = new Set(group.map(t => t.col));

        if (rows.size > 1 && cols.size > 1) {
          // L形或T形
          const centerTile = group[Math.floor(group.length / 2)];
          if (newGrid[centerTile.row]?.[centerTile.col]) {
            newGrid[centerTile.row][centerTile.col]!.special = 'bomb';
            // 记录特殊方块位置
            if (specialPositions) {
              specialPositions.add(`${centerTile.row},${centerTile.col}`);
            }
          }
        }
      }
    });

    return newGrid;
  };

  // 将匹配分组
  const groupMatches = (matches: { row: number; col: number }[]): { row: number; col: number }[][] => {
    const groups: { row: number; col: number }[][] = [];

    // 按行分组
    const rowGroups = new Map<number, { row: number; col: number }[]>();
    matches.forEach(m => {
      if (!rowGroups.has(m.row)) {
        rowGroups.set(m.row, []);
      }
      rowGroups.get(m.row)!.push(m);
    });

    // 检查每一行的连续方块
    rowGroups.forEach((tiles, row) => {
      tiles.sort((a, b) => a.col - b.col);
      let group: { row: number; col: number }[] = [];

      tiles.forEach((tile, index) => {
        if (group.length === 0 || tile.col === tiles[index - 1].col + 1) {
          group.push(tile);
        } else {
          if (group.length >= 3) {
            groups.push([...group]);
          }
          group = [tile];
        }
      });

      if (group.length >= 3) {
        groups.push([...group]);
      }
    });

    // 按列分组（不跳过任何方块）
    const colGroups = new Map<number, { row: number; col: number }[]>();
    matches.forEach(m => {
      if (!colGroups.has(m.col)) {
        colGroups.set(m.col, []);
      }
      colGroups.get(m.col)!.push(m);
    });

    // 检查每一列的连续方块
    colGroups.forEach((tiles, col) => {
      tiles.sort((a, b) => a.row - b.row);
      let group: { row: number; col: number }[] = [];

      tiles.forEach((tile, index) => {
        if (group.length === 0 || tile.row === tiles[index - 1].row + 1) {
          group.push(tile);
        } else {
          if (group.length >= 3) {
            groups.push([...group]);
          }
          group = [tile];
        }
      });

      if (group.length >= 3) {
        groups.push([...group]);
      }
    });

    return groups;
  };

  // 应用重力（方块下落）
  const applyGravity = (grid: (Tile | null)[][]): (Tile | null)[][] => {
    const newGrid = grid.map(row => [...row]);
    const fallingMap = new Map<string, number>();

    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1;

      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (newGrid[row][col] !== null) {
          if (row !== emptyRow) {
            newGrid[emptyRow][col] = newGrid[row][col];
            if (newGrid[emptyRow][col]) {
              newGrid[emptyRow][col]!.row = emptyRow;
              // 标记下落的方块（下落距离 = emptyRow - row）
              const distance = emptyRow - row;
              fallingMap.set(`${emptyRow},${col}`, Math.min(distance, 4));
            }
            newGrid[row][col] = null;
          }
          emptyRow--;
        }
      }
    }

    // 设置下落动画
    setFallingTiles(fallingMap);
    // 根据最长动画时间清除标记
    setTimeout(() => {
      setFallingTiles(new Map());
    }, 400);

    return newGrid;
  };

  // 填充空格
  const fillGrid = (grid: (Tile | null)[][]): (Tile | null)[][] => {
    const newGrid = grid.map(row => [...row]);
    const newFallingTiles = new Map<string, number>();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (newGrid[row][col] === null) {
          newGrid[row][col] = createTile(row, col);
          // 标记为新填充的方块（distance = 0 表示新生成）
          newFallingTiles.set(`${row},${col}`, 0);
        }
      }
    }

    // 设置下落动画
    setFallingTiles(newFallingTiles);
    // 清除动画标记（与动画时长一致）
    setTimeout(() => {
      setFallingTiles(new Map());
    }, 300);

    return newGrid;
  };

  // 检查是否有可行的移动
  const hasValidMoves = (grid: (Tile | null)[][]): boolean => {
    // 尝试所有可能的相邻交换
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // 尝试向右交换
        if (col < GRID_SIZE - 1) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[row][col], testGrid[row][col + 1]] = [testGrid[row][col + 1], testGrid[row][col]];
          if (findMatches(testGrid).length > 0) return true;
        }

        // 尝试向下交换
        if (row < GRID_SIZE - 1) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[row][col], testGrid[row + 1][col]] = [testGrid[row + 1][col], testGrid[row][col]];
          if (findMatches(testGrid).length > 0) return true;
        }
      }
    }

    return false;
  };

  // 查找并显示提示
  const findAndShowHint = () => {
    // 找到第一个可行的移动，显示需要移动的两个方块
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // 尝试向右交换
        if (col < GRID_SIZE - 1 && grid[row] && grid[row][col] && grid[row][col + 1]) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[row][col], testGrid[row][col + 1]] = [testGrid[row][col + 1], testGrid[row][col]];
          const matches = findMatches(testGrid);
          if (matches.length > 0) {
            // 显示需要交换的两个方块
            setHint([
              { row, col },
              { row, col: col + 1 }
            ]);
            return;
          }
        }

        // 尝试向下交换
        if (row < GRID_SIZE - 1 && grid[row] && grid[row][col] && grid[row + 1] && grid[row + 1][col]) {
          const testGrid = grid.map(r => [...r]);
          [testGrid[row][col], testGrid[row + 1][col]] = [testGrid[row + 1][col], testGrid[row][col]];
          const matches = findMatches(testGrid);
          if (matches.length > 0) {
            // 显示需要交换的两个方块
            setHint([
              { row, col },
              { row: row + 1, col }
            ]);
            return;
          }
        }
      }
    }
  };

  // 洗牌（重新生成网格）
  const shuffleGrid = () => {
    setIsAnimating(true);
    setTimeout(() => {
      initializeGrid();
      setIsAnimating(false);
    }, 500);
  };

  // 获取方块图片路径
  const getTileImage = (tile: Tile): string => {
    if (tile.special === 'rainbow') {
      return '/match/Icon_Evermatch_Special_Tile_16.png';
    } else if (tile.special === 'horizontal') {
      return `/match/Icon_Evermatch_Special_${tile.color}_01.png`;
    } else if (tile.special === 'vertical') {
      return `/match/Icon_Evermatch_Special_${tile.color}_02.png`;
    } else if (tile.special === 'bomb') {
      return `/match/Icon_Evermatch_Special_${tile.color}_03.png`;
    } else {
      return `/match/Icon_Evermatch_Tile_${tile.color}.png`;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes crush {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: brightness(1);
          }
          25% {
            transform: scale(1.15) rotate(5deg);
            opacity: 0.9;
            filter: brightness(1.3);
          }
          50% {
            transform: scale(1.25) rotate(-8deg);
            opacity: 0.7;
            filter: brightness(1.6);
          }
          75% {
            transform: scale(0.6) rotate(20deg);
            opacity: 0.4;
            filter: brightness(1.3);
          }
          100% {
            transform: scale(0) rotate(45deg);
            opacity: 0;
            filter: brightness(0);
          }
        }
        
        @keyframes jelly {
          0%, 100% {
            transform: scale(1, 1);
          }
          25% {
            transform: scale(1.15, 0.85);
          }
          50% {
            transform: scale(0.85, 1.15);
          }
          75% {
            transform: scale(1.1, 0.9);
          }
        }
        
        @keyframes special-appear {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
            filter: brightness(3) blur(3px);
          }
          30% {
            transform: scale(0.6) rotate(120deg);
            opacity: 0.6;
            filter: brightness(2.5) blur(2px);
          }
          60% {
            transform: scale(1.3) rotate(270deg);
            opacity: 1;
            filter: brightness(2) blur(1px);
          }
          80% {
            transform: scale(0.95) rotate(360deg);
            filter: brightness(1.2) blur(0px);
          }
          100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
            filter: brightness(1);
          }
        }
        
        @keyframes swap-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-68px);
          }
        }
        
        @keyframes swap-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(68px);
          }
        }
        
        @keyframes swap-up {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-68px);
          }
        }
        
        @keyframes swap-down {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(68px);
          }
        }
        
        @keyframes fall-1 {
          0% {
            transform: translateY(-68px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fall-2 {
          0% {
            transform: translateY(-136px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fall-3 {
          0% {
            transform: translateY(-204px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fall-4 {
          0% {
            transform: translateY(-272px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fall-new {
          0% {
            transform: translateY(-100px) scale(0.8);
            opacity: 0;
          }
          70% {
            transform: translateY(5px) scale(1.05);
            opacity: 1;
          }
          85% {
            transform: translateY(-2px) scale(0.98);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        .animate-crush {
          animation: crush 0.4s cubic-bezier(0.4, 0.0, 0.6, 1) forwards !important;
        }
        
        .animate-jelly {
          animation: jelly 2s ease-in-out infinite !important;
        }
        
        .animate-special-appear {
          animation: special-appear 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards !important;
        }
        
        .animate-swap-left {
          animation: swap-left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards !important;
        }
        
        .animate-swap-right {
          animation: swap-right 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards !important;
        }
        
        .animate-swap-up {
          animation: swap-up 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards !important;
        }
        
        .animate-swap-down {
          animation: swap-down 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) forwards !important;
        }
        
        .animate-fall-1 {
          animation: fall-1 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .animate-fall-2 {
          animation: fall-2 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .animate-fall-3 {
          animation: fall-3 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .animate-fall-4 {
          animation: fall-4 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        
        .animate-fall-new {
          animation: fall-new 0.25s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards !important;
        }
      `}} />

      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-6 max-w-4xl w-full">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-2 sm:mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">永恒爆爆乐</h2>
              <div className="bg-yellow-500/20 px-2 sm:px-4 py-1 sm:py-2 rounded-full border-2 border-yellow-400">
                <span className="text-yellow-300 font-bold text-sm sm:text-lg md:text-xl">分数: {score}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 sm:p-3 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-colors"
              title="关闭"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 游戏区域 */}
          <div
            ref={gridRef}
            className="relative bg-black/30 rounded-xl sm:rounded-2xl p-2 sm:p-4 backdrop-blur-sm mx-auto overflow-x-auto select-none"
            style={{
              width: 'min(100%, ' + (GRID_SIZE * 70) + 'px)',
              height: 'min(calc(100vh - 120px), ' + (GRID_SIZE * 70) + 'px)',
              maxWidth: GRID_SIZE * 70 + 'px',
              maxHeight: GRID_SIZE * 70 + 'px',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
            onDragStart={(e) => e.preventDefault()}
          >
            {!isInitialized ? (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-xl font-bold">初始化中...</p>
                </div>
              </div>
            ) : (
              grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((tile, colIndex) => {
                    const isDragging = draggingTile?.row === rowIndex && draggingTile?.col === colIndex;
                    const isCrushing = crushingTiles.has(`${rowIndex},${colIndex}`);
                    const isHinted = hint.some(h => h.row === rowIndex && h.col === colIndex);
                    const fallDistance = fallingTiles.get(`${rowIndex},${colIndex}`);
                    const isFalling = fallDistance !== undefined;
                    const isAppearing = appearingSpecials.has(`${rowIndex},${colIndex}`);

                    // 检查是否在交换动画中
                    let swapClass = '';
                    if (swappingTiles) {
                      const isFromTile = swappingTiles.from.row === rowIndex && swappingTiles.from.col === colIndex;
                      const isToTile = swappingTiles.to.row === rowIndex && swappingTiles.to.col === colIndex;

                      if (isFromTile) {
                        // 从当前位置移动到目标位置
                        if (swappingTiles.to.row < rowIndex) swapClass = 'animate-swap-up';
                        else if (swappingTiles.to.row > rowIndex) swapClass = 'animate-swap-down';
                        else if (swappingTiles.to.col < colIndex) swapClass = 'animate-swap-left';
                        else if (swappingTiles.to.col > colIndex) swapClass = 'animate-swap-right';
                      } else if (isToTile) {
                        // 从目标位置移动到当前位置（相反方向）
                        if (swappingTiles.from.row < rowIndex) swapClass = 'animate-swap-up';
                        else if (swappingTiles.from.row > rowIndex) swapClass = 'animate-swap-down';
                        else if (swappingTiles.from.col < colIndex) swapClass = 'animate-swap-left';
                        else if (swappingTiles.from.col > colIndex) swapClass = 'animate-swap-right';
                      }
                    }

                    // 根据下落距离决定动画类
                    let fallClass = '';
                    if (isFalling) {
                      if (fallDistance === 0) {
                        fallClass = 'animate-fall-new'; // 新生成的方块
                      } else if (fallDistance === 1) {
                        fallClass = 'animate-fall-1';
                      } else if (fallDistance === 2) {
                        fallClass = 'animate-fall-2';
                      } else if (fallDistance === 3) {
                        fallClass = 'animate-fall-3';
                      } else {
                        fallClass = 'animate-fall-4';
                      }
                    }

                    // 检查是否是特殊方块且尚未出现过（特殊方块默认不可见）
                    const tileId = tile?.id?.toString() || '';
                    const isSpecialAndNew = tile?.special !== 'none' && tileId && !appearedSpecials.has(tileId);

                    // 确定方块的内联样式 - 避免样式突变导致的过渡效果
                    let inlineStyle: React.CSSProperties | undefined = undefined;
                    if (isAppearing) {
                      inlineStyle = {
                        animation: 'special-appear 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards'
                      };
                    } else if (isSpecialAndNew) {
                      inlineStyle = {
                        transform: 'scale(0) rotate(0deg)',
                        opacity: 0,
                        transition: 'none' // 禁用过渡，防止从scale(0)到scale(1)的过渡
                      };
                    }

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleTileClick(rowIndex, colIndex)}
                        onMouseDown={(e) => handleTileMouseDown(e, rowIndex, colIndex)}
                        onTouchStart={(e) => handleTileTouchStart(e, rowIndex, colIndex)}
                        onDragStart={(e) => e.preventDefault()}
                        className={`
                      relative w-16 h-16 m-0.5 cursor-pointer select-none
                      ${!isAppearing && !isCrushing && !isFalling && !swapClass && !isSpecialAndNew ? 'transition-all duration-300' : ''}
                      ${selectedTile?.row === rowIndex && selectedTile?.col === colIndex ? 'ring-4 ring-yellow-400 scale-110' : ''}
                      ${isHinted ? 'animate-jelly' : ''}
                      ${isAnimating ? 'pointer-events-none' : 'hover:scale-105'}
                      ${isDragging ? 'opacity-50 scale-90' : ''}
                      ${isCrushing ? 'animate-crush' : ''}
                      ${swapClass}
                      ${fallClass}
                    `}
                        style={inlineStyle}
                      >
                        {tile && (
                          <img
                            src={getTileImage(tile)}
                            alt={tile.color}
                            className="w-full h-full object-contain pointer-events-none select-none"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            style={{
                              WebkitUserDrag: 'none',
                              userSelect: 'none',
                              WebkitTouchCallout: 'none'
                            } as React.CSSProperties}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {/* 无解提示 */}
            {isInitialized && showNoMoves && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-2xl">
                <div className="text-center text-white">
                  <p className="text-2xl font-bold mb-2">没有可行的移动了！</p>
                  <p className="text-lg">正在重新洗牌...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

