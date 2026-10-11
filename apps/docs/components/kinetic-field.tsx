'use client';

import { useEffect, useRef } from 'react';

import { useSiteTheme } from './theme';

/**
 * The landing backdrop: a few thousand particles on three counter-rotating,
 * tilted orbits. On load they spring out of the centre (with overshoot), a
 * travelling wave keeps the orbits breathing, and the pointer pushes particles
 * aside before they settle back. Every position is computed in the vertex
 * shader from a per-particle seed, so a frame costs one draw call.
 */

const VERTEX = `#version 300 es
precision highp float;
in vec4 aSeed;
uniform float uTime;
uniform float uIntro;
uniform vec2 uPointer;
uniform float uPush;
uniform float uAspect;
uniform float uScroll;
uniform float uDpr;
uniform vec3 uColorA;
uniform vec3 uColorB;
out vec3 vColor;
out float vAlpha;

const float TAU = 6.2831853;

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }

void main() {
  float dust = step(0.84, aSeed.w);
  float lane = floor(aSeed.x * 3.0);
  float dir = mod(lane, 2.0) < 0.5 ? 1.0 : -1.0;
  float angle = aSeed.y * TAU + uTime * (0.07 + lane * 0.025) * dir;

  // Orbit radius with a gaussian-ish thickness and a travelling spring wave.
  float thickness = (aSeed.z - 0.5) * (0.05 + lane * 0.025);
  float radius = 0.62 + lane * 0.19 + thickness;
  radius *= 1.0 + 0.055 * sin(3.0 * angle + uTime * 0.9 + lane * 2.1);
  vec3 p = vec3(cos(angle) * radius, sin(angle) * radius, 0.16 * sin(2.0 * angle - uTime * 0.6 + lane * 1.3));

  // Dust: a loose shell that drifts slowly around the orbits.
  vec3 shell = normalize(vec3(cos(aSeed.y * TAU), sin(aSeed.y * TAU), aSeed.z * 2.0 - 1.0));
  shell *= 0.35 + aSeed.x * 1.25;
  shell = rotZ(uTime * 0.02 * (aSeed.z - 0.5)) * shell;
  p = mix(p, shell, dust);

  // Portrait screens get a rounder, smaller orbit so it frames the copy.
  float portrait = 1.0 - clamp((uAspect - 0.5) / 0.7, 0.0, 1.0);
  float tilt = mix(1.18, 0.8, portrait) - uScroll * 0.55;
  p = rotZ(0.38) * rotY(0.22 * sin(uTime * 0.13)) * rotX(tilt) * p;
  p *= mix(1.0, 0.62, portrait);

  // Intro: each particle springs out of the centre with a little overshoot.
  float t = clamp(uIntro * 1.5 - aSeed.w * 0.5, 0.0, 1.0);
  float spring = 1.0 - exp(-6.5 * t) * cos(9.0 * t);
  p *= spring;

  float depth = 2.7 - p.z;
  vec2 screen = p.xy * (2.9 / depth);
  screen.x /= uAspect;

  // Pointer: push away within a soft radius (aspect-corrected distance).
  vec2 d = screen - uPointer;
  d.x *= uAspect;
  float near = exp(-dot(d, d) / 0.035) * uPush;
  screen += normalize(d + 1e-5) * near * 0.11 * vec2(1.0 / uAspect, 1.0);

  gl_Position = vec4(screen, 0.0, 1.0);

  // Thin the field behind the copy so the headline and text stay readable.
  vec2 fromCentre = screen * vec2(uAspect * 0.62, 1.15);
  float clear = mix(0.2, 1.0, smoothstep(0.25, 0.8, length(fromCentre)));

  float front = smoothstep(-0.9, 0.9, p.z);
  float size = mix(1.3, 3.0, aSeed.z) * mix(0.7, 1.35, front) * (dust > 0.5 ? 0.75 : 1.0);
  gl_PointSize = size * uDpr * (1.0 + near * 1.5);

  float hue = 0.5 + 0.5 * sin(angle + lane * 1.7 + uTime * 0.05);
  vColor = mix(uColorA, uColorB, hue);
  vColor = mix(vColor, vec3(1.0), step(0.985, aSeed.z) * 0.6);
  vAlpha = (dust > 0.5 ? 0.35 : mix(0.35, 1.0, front)) * smoothstep(0.0, 0.25, t) * (1.0 - uScroll * 0.7) * clear;
}`;

const FRAGMENT = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vAlpha;
uniform float uLight;
out vec4 outColor;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r) * vAlpha;
  if (a < 0.003) discard;
  // Dark: additive light (premultiplied). Light: plain alpha over the page.
  outColor = uLight > 0.5 ? vec4(vColor * 0.85, min(1.0, a * 1.5)) : vec4(vColor * a, a);
}`;

type Uniforms = Record<
  | 'uTime'
  | 'uIntro'
  | 'uPointer'
  | 'uPush'
  | 'uAspect'
  | 'uScroll'
  | 'uDpr'
  | 'uColorA'
  | 'uColorB'
  | 'uLight',
  WebGLUniformLocation | null
>;

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
    const gl = canvas?.getContext('webgl2', { antialias: false, premultipliedAlpha: true });
    if (!canvas || !gl) return;

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
      [
        'uTime',
        'uIntro',
        'uPointer',
        'uPush',
        'uAspect',
        'uScroll',
        'uDpr',
        'uColorA',
        'uColorB',
        'uLight',
      ].map((n) => [n, gl.getUniformLocation(program, n)]),
    ) as Uniforms;

    const light = scheme === 'light';
    gl.uniform3fv(u.uColorA, cssColor('--k-ember'));
    gl.uniform3fv(u.uColorB, cssColor('--k-ice'));
    gl.uniform1f(u.uLight, light ? 1 : 0);
    gl.enable(gl.BLEND);
    if (light) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.ONE, gl.ONE);

    const rect = canvas.getBoundingClientRect();
    const count = Math.round(Math.min(24000, Math.max(7000, (rect.width * rect.height) / 50)));
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aSeed');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const r = canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(r.width * dpr));
      canvas!.height = Math.max(1, Math.round(r.height * dpr));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform1f(u.uAspect, r.width / Math.max(1, r.height));
      gl!.uniform1f(u.uDpr, dpr);
    }

    // Pointer target and a damped spring that follows it.
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, push: 0, pushTarget: 0 };
    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.pushTarget = 1;
    }
    function onLeave() {
      pointer.pushTarget = 0;
    }

    let scroll = 0;
    function onScroll() {
      const r = canvas!.getBoundingClientRect();
      scroll = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
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

    resize();
    onScroll();

    if (reduced) {
      draw(12, 1);
      const onResize = () => {
        resize();
        draw(12, 1);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    let frame = 0;
    let visible = true;
    let last = performance.now();
    let elapsed = 0;
    const start = last;

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      // Critically damped follow for the pointer and its strength.
      const k = 90;
      const c = 2 * Math.sqrt(k);
      pointer.vx += (k * (pointer.tx - pointer.x) - c * pointer.vx) * dt;
      pointer.vy += (k * (pointer.ty - pointer.y) - c * pointer.vy) * dt;
      pointer.x += pointer.vx * dt;
      pointer.y += pointer.vy * dt;
      pointer.push += (pointer.pushTarget - pointer.push) * Math.min(1, dt * 4);
      const intro = Math.min(1, (now - start) / 2600);
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

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', resume);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener('resize', resize);
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
