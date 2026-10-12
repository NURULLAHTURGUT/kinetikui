'use client';

import { useEffect, useRef } from 'react';

import { useSiteTheme } from './theme';

/**
 * The landing backdrop. Particles sweep in from the left on curved paths and
 * spring into the Kinetik mark: a thin ring, a bold ring and a solid disc,
 * each overlapping the next. While the mark arrives, the dust orbiting around
 * it bends out of the way. At rest the particles keep flowing around their
 * circles and the pointer pushes them aside. Everything is computed in the
 * vertex shader from per-particle seeds: one draw call per frame.
 *
 * The mark is placed over `.hero-mark` (its size and position come from that
 * element), so the layout stays in CSS. Without WebGL 2 the hero gets
 * `data-field="none"` and shows the static SVG mark instead.
 */

const VERTEX = `#version 300 es
precision highp float;
in vec4 aSeed;
uniform float uTime;
uniform float uIntro;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uUnit;
uniform vec2 uPointer;
uniform float uPush;
uniform float uScroll;
uniform float uDpr;
uniform vec2 uTextC;
uniform vec2 uTextR;
out float vAlpha;
out float vTone;

const float TAU = 6.2831853;
const float R = 0.875;

float springOut(float t) {
  return 1.0 - exp(-6.0 * t) * cos(8.5 * t);
}

void main() {
  bool logo = aSeed.w < 0.7;
  vec2 pos;
  float alpha;
  float size;

  if (logo) {
    float c = aSeed.x < 0.2 ? 0.0 : (aSeed.x < 0.45 ? 1.0 : 2.0);
    vec2 centre = vec2(c - 1.0, 0.0);
    float breathe = 1.0 + 0.012 * sin(uTime * 1.3 + c * 1.7);
    float angle;
    float radius;
    if (c < 1.5) {
      // Rings: the left one thin, the middle one bold.
      float width = c < 0.5 ? 0.018 : 0.034;
      radius = (R + (aSeed.z - 0.5) * width) * breathe;
      angle = aSeed.y * TAU + uTime * (c < 0.5 ? 0.11 : -0.08);
    } else {
      // The solid disc turns like a slow vortex, faster near the centre.
      radius = R * sqrt(aSeed.z) * breathe;
      angle = aSeed.y * TAU + uTime * 0.05 / (0.35 + aSeed.z);
    }
    vec2 home = centre + vec2(cos(angle), sin(angle)) * radius;

    // Each circle is drawn over the one to its left: hide what it covers.
    float cover = 1.0;
    if (c < 0.5) cover = smoothstep(R * 0.97, R * 1.03, distance(home, vec2(0.0)));
    if (c > 0.5 && c < 1.5) cover = smoothstep(R * 0.97, R * 1.03, distance(home, vec2(1.0, 0.0)));

    // Intro: from off-screen left along a bent path, the solid disc first.
    float delay = (2.0 - c) * 0.12 + aSeed.w * 0.5;
    float t = clamp(uIntro * 1.7 - delay, 0.0, 1.0);
    float e = springOut(t);
    vec2 start = home + vec2(-6.5 - aSeed.z * 3.0, (aSeed.y - 0.5) * 3.2);
    pos = mix(start, home, e);
    pos.y += sin(3.14159 * clamp(e, 0.0, 1.0)) * (aSeed.z - 0.5) * 2.4;

    pos *= 1.0 + uScroll * 0.25;
    alpha = (c > 1.5 ? 0.6 : 0.85) * cover * smoothstep(0.0, 0.2, t);
    size = c > 1.5 ? mix(1.6, 2.7, aSeed.z) : mix(1.7, 2.9, fract(aSeed.y * 7.0));
    vTone = 0.0;
  } else {
    // Dust: a loose elliptical orbit band around the mark plus sparse motes.
    float k = (aSeed.w - 0.7) / 0.3;
    if (k < 0.65) {
      float dir = aSeed.x < 0.5 ? 1.0 : -1.0;
      float angle = aSeed.y * TAU + uTime * (0.025 + aSeed.z * 0.02) * dir;
      float radius = mix(2.3, 6.0, aSeed.z * aSeed.z);
      pos = vec2(cos(angle) * radius, sin(angle) * radius * 0.42);
      pos = mat2(cos(0.18), sin(0.18), -sin(0.18), cos(0.18)) * pos;
    } else {
      vec2 span = uRes / uUnit;
      pos = (vec2(aSeed.x, fract(aSeed.y + uTime * 0.004 * (0.5 + aSeed.z))) - 0.5) * span - uCenter / uUnit;
    }
    // The mark's arrival pushes the dust aside like a wake.
    float front = mix(-7.0, 1.5, 1.0 - pow(1.0 - clamp(uIntro, 0.0, 1.0), 3.0));
    vec2 d = pos - vec2(front, 0.0);
    float wake = exp(-dot(d, d) / 2.2) * (1.0 - smoothstep(0.6, 1.0, uIntro));
    pos.y += sign(d.y + 1e-4) * wake * 1.6;
    alpha = mix(0.3, 0.75, aSeed.z) * smoothstep(0.0, 0.5, uIntro);
    size = mix(1.5, 3.0, aSeed.z);
    vTone = 1.0;
  }

  vec2 px = uCenter + pos * uUnit;

  // Pointer: push away within a soft radius, in pixels.
  vec2 dp = px - uPointer;
  float near = exp(-dot(dp, dp) / (130.0 * 130.0)) * uPush;
  px += normalize(dp + 1e-4) * near * 26.0;

  // Thin the field behind the headline and buttons so they stay readable.
  // A rounded box (superellipse) around the copy block, so its corners are covered too.
  vec2 q = abs((px - uTextC) / uTextR);
  float box = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
  float clear = mix(0.1, 1.0, smoothstep(0.9, 1.4, box));

  gl_Position = vec4(px / (uRes * 0.5), 0.0, 1.0);
  gl_PointSize = size * uDpr * (1.0 + near * 0.8);
  vAlpha = alpha * clear * (1.0 - uScroll * 0.8);
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in float vAlpha;
in float vTone;
uniform vec3 uInk;
uniform vec3 uMuted;
uniform float uLight;
out vec4 outColor;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.25, r) * vAlpha;
  if (a < 0.003) discard;
  // Dark: additive light (premultiplied); dust is a dimmer grey.
  // Light: everything is ink over the page, dust boosted to stay visible.
  if (uLight > 0.5) {
    outColor = vec4(uInk, min(1.0, a * mix(1.8, 1.6, vTone)));
  } else {
    vec3 color = mix(uInk, uMuted, vTone);
    outColor = vec4(color * a, a);
  }
}`;

const UNIFORMS = [
  'uTime',
  'uIntro',
  'uRes',
  'uCenter',
  'uUnit',
  'uPointer',
  'uPush',
  'uScroll',
  'uDpr',
  'uTextC',
  'uTextR',
  'uInk',
  'uMuted',
  'uLight',
] as const;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function cssColor(name: string): [number, number, number] {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ['255', '255', '255'];
  probe.remove();
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
}

export function KineticField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const scheme = useSiteTheme();

  useEffect(() => {
    const canvas = ref.current;
    const hero = canvas?.closest<HTMLElement>('.hero');
    const slot = hero?.querySelector<HTMLElement>('.hero-mark');
    const copy = hero?.querySelector<HTMLElement>('.hero-content');
    const gl = canvas?.getContext('webgl2', { antialias: false, premultipliedAlpha: true });
    if (!canvas || !hero || !slot || !copy) return;
    if (!gl) {
      // No WebGL 2: show the static mark instead.
      hero.setAttribute('data-field', 'none');
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const u = Object.fromEntries(
      UNIFORMS.map((n) => [n, gl.getUniformLocation(program, n)]),
    ) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

    const light = scheme === 'light';
    gl.uniform3fv(u.uInk, cssColor('--k-text'));
    gl.uniform3fv(u.uMuted, cssColor('--k-text-muted'));
    gl.uniform1f(u.uLight, light ? 1 : 0);
    gl.enable(gl.BLEND);
    if (light) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.ONE, gl.ONE);

    // Particle budget scales with the mark's size (logo) and the hero's area (dust).
    const first = canvas.getBoundingClientRect();
    const unit0 = (slot.getBoundingClientRect().width * 48) / 200;
    const logoCount = Math.round(Math.min(26000, Math.max(6000, unit0 * 80)));
    const dustCount = Math.round(
      Math.min(7000, Math.max(2000, (first.width * first.height) / 200)),
    );
    const count = logoCount + dustCount;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random();
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = i < logoCount ? Math.random() * 0.7 : 0.7 + Math.random() * 0.3;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aSeed');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rect = first;

    // Canvas size and the mark's centre/unit in pixels from the canvas centre (y up).
    function layout() {
      rect = canvas!.getBoundingClientRect();
      const s = slot!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(u.uRes, rect.width, rect.height);
      gl!.uniform2f(
        u.uCenter,
        s.left + s.width / 2 - (rect.left + rect.width / 2),
        rect.top + rect.height / 2 - (s.top + s.height / 2),
      );
      gl!.uniform1f(u.uUnit, (s.width * 48) / 200);
      const t = copy!.getBoundingClientRect();
      gl!.uniform2f(
        u.uTextC,
        t.left + t.width / 2 - (rect.left + rect.width / 2),
        rect.top + rect.height / 2 - (t.top + t.height / 2),
      );
      gl!.uniform2f(u.uTextR, Math.max(1, t.width * 0.5), Math.max(1, t.height * 0.5));
      gl!.uniform1f(u.uDpr, dpr);
    }

    // Pointer target and a critically damped spring that follows it.
    const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, tx: -1e4, ty: -1e4, push: 0, target: 0 };
    function onMove(e: PointerEvent) {
      pointer.tx = e.clientX - (rect.left + rect.width / 2);
      pointer.ty = rect.top + rect.height / 2 - e.clientY;
      if (pointer.x < -9e3) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
      pointer.target = 1;
    }
    function onLeave() {
      pointer.target = 0;
    }

    let scroll = 0;
    function onScroll() {
      rect = canvas!.getBoundingClientRect();
      scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    }

    function draw(time: number, intro: number) {
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform1f(u.uTime, time);
      gl!.uniform1f(u.uIntro, intro);
      gl!.uniform2f(u.uPointer, pointer.x, pointer.y);
      gl!.uniform1f(u.uPush, pointer.push);
      gl!.uniform1f(u.uScroll, scroll);
      gl!.drawArrays(gl!.POINTS, 0, count);
    }

    layout();
    onScroll();

    if (reduced) {
      draw(8, 1);
      const onResize = () => {
        layout();
        draw(8, 1);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let frame = 0;
    let visible = true;
    let last = performance.now();
    let elapsed = 0;
    let intro = 0;
    const start = last;

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      intro = Math.min(1, (now - start) / 2800);
      const k = 80;
      const c = 2 * Math.sqrt(k);
      pointer.vx += (k * (pointer.tx - pointer.x) - c * pointer.vx) * dt;
      pointer.vy += (k * (pointer.ty - pointer.y) - c * pointer.vy) * dt;
      pointer.x += pointer.vx * dt;
      pointer.y += pointer.vy * dt;
      pointer.push += (pointer.target - pointer.push) * Math.min(1, dt * 4);
      draw(elapsed, intro);
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    }

    function resume() {
      if (!frame && visible && !document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      resume();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);
    ro.observe(slot);
    ro.observe(copy);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', resume);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', resume);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [scheme]);

  return <canvas ref={ref} className="field-canvas" aria-hidden />;
}
