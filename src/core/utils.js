export function lerp(a,b,t){ return a + (b-a) * t; }
export function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
export function rand(min,max){ return Math.random()*(max-min)+min; }
export function roundVal(v, decimals = 2){ const m = Math.pow(10, decimals); return Math.round((v || 0) * m) / m; }

// draw a rounded rectangle path on the provided context (polyfill for ctx.roundRect)
export function pathRoundRect(ctx, x, y, w, h, r){
  const rad = Math.max(0, Math.min(r, Math.min(w/2, h/2)));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x, y + h, x, y + h - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}

export function squareCircleHit(squareX, squareY, halfSize, circleX, circleY, circleRadius){
  const closestX = Math.max(squareX - halfSize, Math.min(circleX, squareX + halfSize));
  const closestY = Math.max(squareY - halfSize, Math.min(circleY, squareY + halfSize));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  return dx * dx + dy * dy <= circleRadius * circleRadius;
}
