// Keyboard + mouse input, edge-triggered actions.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    addEventListener('keydown', (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.pressed.add('Mouse'); });
    addEventListener('mouseup', () => { this.mouse.down = false; });
  }
  axis() {
    let dx = 0, dy = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    const n = Math.hypot(dx, dy) || 1;
    return { dx: dx / n, dy: dy / n };
  }
  // fire is held (space or mouse); consume() is edge-trigger for menus.
  fireHeld() { return this.keys.has('Space') || this.mouse.down; }
  consume(code) { const had = this.pressed.has(code); this.pressed.delete(code); return had; }
  endFrame() { this.pressed.clear(); }
}
