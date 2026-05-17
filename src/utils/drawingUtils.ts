// 绘图工具算法集合

export type DrawingTool = 'brush' | 'eyedropper' | 'line' | 'rect' | 'rect-fill' | 'circle' | 'circle-fill' | 'select';

export interface GridCell {
  row: number;
  col: number;
}

/** 选区矩形（行列坐标，未排序） */
export interface SelectionRect {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

/** 对称方向 */
export type SymmetryType = 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top';

/** 限制在网格范围内 */
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/** Bresenham 直线算法 */
export function getLineCells(r1: number, c1: number, r2: number, c2: number): GridCell[] {
  const cells: GridCell[] = [];
  let dr = Math.abs(r2 - r1);
  let dc = Math.abs(c2 - c1);
  const sr = r1 < r2 ? 1 : -1;
  const sc = c1 < c2 ? 1 : -1;
  let err = dc - dr;
  let r = r1, c = c1;

  while (true) {
    cells.push({ row: r, col: c });
    if (r === r2 && c === c2) break;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc)  { err += dc; r += sr; }
  }
  return cells;
}

/** 矩形边框 */
export function getRectOutlineCells(r1: number, c1: number, r2: number, c2: number): GridCell[] {
  const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
  const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
  const cells: GridCell[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r === minR || r === maxR || c === minC || c === maxC) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/** 矩形填充 */
export function getRectFillCells(r1: number, c1: number, r2: number, c2: number): GridCell[] {
  const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
  const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
  const cells: GridCell[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/** 椭圆/圆形 Midpoint 算法（边框） */
export function getEllipseOutlineCells(r1: number, c1: number, r2: number, c2: number): GridCell[] {
  const cx = (c1 + c2) / 2;
  const cy = (r1 + r2) / 2;
  const rx = Math.abs(c2 - c1) / 2;
  const ry = Math.abs(r2 - r1) / 2;
  const cellSet = new Set<string>();
  const add = (r: number, c: number) => {
    const key = `${Math.round(r)},${Math.round(c)}`;
    cellSet.add(key);
  };

  // 用参数方程采样足够密的点
  const steps = Math.ceil(Math.max(rx, ry) * Math.PI * 4) + 8;
  for (let k = 0; k < steps; k++) {
    const angle = (2 * Math.PI * k) / steps;
    const r = cy + ry * Math.sin(angle);
    const c = cx + rx * Math.cos(angle);
    add(r, c);
  }
  return Array.from(cellSet).map(k => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  });
}

/** 椭圆/圆形填充 */
export function getEllipseFillCells(r1: number, c1: number, r2: number, c2: number): GridCell[] {
  const cx = (c1 + c2) / 2;
  const cy = (r1 + r2) / 2;
  const rx = Math.abs(c2 - c1) / 2;
  const ry = Math.abs(r2 - r1) / 2;
  const cells: GridCell[] = [];
  const minR = Math.floor(cy - ry), maxR = Math.ceil(cy + ry);
  const minC = Math.floor(cx - rx), maxC = Math.ceil(cx + rx);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (rx === 0 && ry === 0) {
        cells.push({ row: r, col: c });
        continue;
      }
      const dr = (r + 0.5 - cy) / (ry + 0.5);
      const dc = (c + 0.5 - cx) / (rx + 0.5);
      if (dr * dr + dc * dc <= 1) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/** 画笔（圆形区域，按 size 扩展） */
export function getBrushCells(row: number, col: number, size: number): GridCell[] {
  if (size <= 1) return [{ row, col }];
  const cells: GridCell[] = [];
  const radius = Math.floor(size / 2);
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (Math.sqrt(dr * dr + dc * dc) <= radius) {
        cells.push({ row: row + dr, col: col + dc });
      }
    }
  }
  return cells;
}

/** 根据工具和起止点计算预览格子 */
export function getPreviewCells(
  tool: DrawingTool,
  startRow: number, startCol: number,
  endRow: number, endCol: number,
  brushSize = 1
): GridCell[] {
  switch (tool) {
    case 'brush':
      return getBrushCells(endRow, endCol, brushSize);
    case 'line':
      return getLineCells(startRow, startCol, endRow, endCol);
    case 'rect':
      return getRectOutlineCells(startRow, startCol, endRow, endCol);
    case 'rect-fill':
      return getRectFillCells(startRow, startCol, endRow, endCol);
    case 'circle':
      return getEllipseOutlineCells(startRow, startCol, endRow, endCol);
    case 'circle-fill':
      return getEllipseFillCells(startRow, startCol, endRow, endCol);
    case 'select':
    case 'eyedropper':
      return [];
    default:
      return [{ row: endRow, col: endCol }];
  }
}

/** 过滤超出网格边界的格子 */
export function filterCells(cells: GridCell[], N: number, M: number): GridCell[] {
  return cells.filter(({ row, col }) => row >= 0 && row < M && col >= 0 && col < N);
}
