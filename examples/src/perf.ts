export const move: Example = {
  name: 'Perf: piece move',
  run(cont) {
    const cg = window.Chessground(cont, {
      animation: { duration: 500 }
    });
    const el = cont.querySelector('.cg-board') as HTMLElement;
    const delay = 400;
    function run() {
      if (!el.offsetParent) return;
      cg.move('e2', 'd4');
      setTimeout(() => {
        cg.move('d4', 'e2');
        setTimeout(run, delay);
      }, delay);
    }
    setTimeout(run, delay);
    return cg;
  }
};
export const select: Example = {
  name: 'Perf: square select',
  run(cont) {
    const cg = window.Chessground(cont, {
      movable: {
        free: false,
        dests: {
          e2: 'e3 e4 d3 f3'.split(' ') as Key[]
        }
      }
    });
    const el = cont.querySelector('.cg-board') as HTMLElement;
    const delay = 500;
    function run() {
      if (!el.offsetParent) return;
      cg.selectSquare('e2');
      setTimeout(() => {
        cg.selectSquare('d4');
        setTimeout(run, delay);
      }, delay);
    }
    setTimeout(run, delay);
    return cg;
  }
};