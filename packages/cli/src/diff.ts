/** Line diff (Myers, O(ND)) rendered as a unified diff with context. */
export type Op = { kind: ' ' | '-' | '+'; line: string };

export function diffLines(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];
  outer: for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1));
      let x = down ? (v.get(k + 1) ?? 0) : (v.get(k - 1) ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v.set(k, x);
      if (x >= n && y >= m) break outer;
    }
  }
  // Backtrack.
  const ops: Op[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const vd = trace[d]!;
    const k = x - y;
    const down = k === -d || (k !== d && (vd.get(k - 1) ?? -1) < (vd.get(k + 1) ?? -1));
    const prevK = down ? k + 1 : k - 1;
    const prevX = vd.get(prevK) ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      x--;
      y--;
      ops.push({ kind: ' ', line: a[x]! });
    }
    if (d > 0) {
      if (down) ops.push({ kind: '+', line: b[--y]! });
      else ops.push({ kind: '-', line: a[--x]! });
    }
  }
  return ops.reverse();
}

export function unifiedDiff(oldText: string, newText: string, context = 3): string[] {
  const ops = diffLines(
    oldText.replace(/\r\n/g, '\n').split('\n'),
    newText.replace(/\r\n/g, '\n').split('\n'),
  );
  if (ops.every((o) => o.kind === ' ')) return [];
  const out: string[] = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i]!.kind === ' ') {
      i++;
      continue;
    }
    const start = Math.max(0, i - context);
    let end = i;
    while (end < ops.length) {
      if (ops[end]!.kind !== ' ') {
        end++;
        continue;
      }
      let run = 0;
      while (end + run < ops.length && ops[end + run]!.kind === ' ') run++;
      if (run > context * 2 || end + run >= ops.length) {
        end = Math.min(ops.length, end + context);
        break;
      }
      end += run;
    }
    out.push('@@');
    for (let j = start; j < end; j++) out.push(`${ops[j]!.kind}${ops[j]!.line}`);
    i = end;
  }
  return out;
}
