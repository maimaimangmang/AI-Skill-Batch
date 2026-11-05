'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * Warp shader adapted from React Bits WarpText:
 * https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/TextAnimations/WarpText
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software as part of
 * an application, website, or product, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * Commons Clause Restriction:
 * You may use this Software, including for any commercial purpose, so long as
 * you do not sell, sublicense, or redistribute the components themselves,
 * whether alone, in a bundle, or as a ported version.
 * The same restriction covers the React Bits tools (Background Studio,
 * Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later)
 * and the sounds in the sound library. You may not sell, sublicense, or
 * redistribute the tools or the sounds themselves, or offer the tools or a
 * substantially similar copy of them as a hosted service, whether alone, in
 * a bundle, or as a ported version.
 * What you make with the tools is yours to use. You can use exported code,
 * images, videos, and audio files in any personal or commercial application,
 * website, or product, including paid ones. You may not sell or redistribute
 * the exports on their own, either individually or as the product itself,
 * such as a sound, texture, background, or template pack.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

const vertex = `#version 300 es
layout(location = 0) in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uIntro;
uniform vec4 uClicks[4];
in vec2 vUv;
out vec4 fragColor;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}
vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTextTexture, uv);
}
void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * 0.55;
  vec2 drift = vec2(time * 0.055, -time * 0.045);
  vec2 ambient = (vec2(fbm(vUv * 1.7 * 3.1 + drift),
                      fbm((vUv + 19.17) * 1.7 * 3.4 - drift.yx)) - 0.5)
                 * (0.08 * 0.045 + uIntro * 0.18);
  vec2 delta = vUv - uPointer;
  vec2 scaled = vec2(delta.x * aspect, delta.y);
  float dist = length(scaled);
  float t = clamp(dist / 0.42, 0.0, 1.0);
  float lens = (1.0 - smoothstep(0.0, 0.42, dist)) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(scaled.x / aspect, scaled.y) / dist : vec2(0.0);
  float ripple = sin(dist * 28.0 - time * 4.2) * 0.5;
  vec2 bend = dir * bulge * 0.38 * (ripple * 0.016 - 0.045);
  float shockLight = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 click = uClicks[i];
    if (click.w <= 0.0) continue;
    vec2 shockDelta = vUv - click.xy;
    vec2 shockAspect = vec2(shockDelta.x * aspect, shockDelta.y);
    float shockDist = length(shockAspect);
    float offset = (shockDist - click.z * 0.9) / (0.06 + click.z * 0.06);
    float energy = exp(-offset * offset) * (1.0 - smoothstep(0.0, 1.6, click.z))
                   * smoothstep(0.0, 0.08, click.z) * click.w;
    vec2 shockDir = shockDist > 0.0001 ? vec2(shockAspect.x / aspect, shockAspect.y) / shockDist : vec2(0.0);
    bend -= shockDir * offset * energy * 0.09;
    shockLight += energy;
  }
  vec2 splitDir = ambient + bend;
  splitDir = length(splitDir) > 0.00001 ? normalize(splitDir) : vec2(0.7071);
  vec2 split = splitDir * 0.018 * 0.16 * (0.35 + lens * 1.65 + uIntro * 3.0);
  vec3 ink = vec3(0.0), cover = vec3(0.0), weight = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float k = 1.0 - float(i) / 3.0;
    vec4 tap = sampleText(vUv + ambient + bend + split * k);
    vec3 band = vec3(max(k, 0.0), 1.0 - abs(k), max(-k, 0.0));
    ink += tap.rgb * band;
    cover += tap.a * band;
    weight += band;
  }
  ink /= weight;
  cover /= weight;
  float alpha = max(max(cover.r, cover.g), cover.b);
  vec3 color = ink + (alpha - cover);
  color = min(color + (lens + shockLight * 0.5) * cover.g * 0.055, vec3(alpha));
  fragColor = vec4(color, alpha);
}`;

export default function HeroWarpTitle({ lead, accent }: { lead: string; accent: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const heading = headingRef.current, text = textRef.current, canvas = canvasRef.current;
    if (!motion || !heading || !text || !canvas) return;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    const release = () => {
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
      delete heading.dataset.warpReady;
    };
    if (!program || !buffer || !texture) { release(); return; }
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type);
      if (!shader) { release(); return; }
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { release(); return; }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { release(); return; }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const parameter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, parameter, gl.LINEAR);
    for (const parameter of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, parameter, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.clearColor(0, 0, 0, 0);
    const uniforms = Object.fromEntries(['uResolution', 'uPointer', 'uPointerActive', 'uTime', 'uIntro', 'uClicks[0]'].map(name => [name, gl.getUniformLocation(program, name)]));
    const atlas = document.createElement('canvas');
    const ctx = atlas.getContext('2d');
    if (!ctx) { release(); return; }
    let frame = 0, disposed = false, ready = false, visible = true, lost = false;
    let elapsed = 0, previous = 0, clickSlot = 0;
    const pointer = { x: .5, y: .5, tx: .5, ty: .5, active: .2, engaged: false };
    const clicks = new Float32Array(16);

    // Rasterize the existing DOM positions so Chinese, English, colours and wraps match.
    function rasterize() {
      if (disposed || lost) return;
      const bounds = canvas!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = atlas.width = Math.round(bounds.width * dpr);
      canvas!.height = atlas.height = Math.round(bounds.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.textBaseline = 'alphabetic';
      const walker = document.createTreeWalker(text!, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const style = getComputedStyle(node.parentElement!);
        ctx!.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx!.fillStyle = style.color;
        let offset = 0;
        for (const character of node.textContent || '') {
          range.setStart(node, offset);
          offset += character.length;
          range.setEnd(node, offset);
          const rect = range.getBoundingClientRect();
          const metrics = ctx!.measureText(character);
          const ascent = metrics.fontBoundingBoxAscent;
          const descent = metrics.fontBoundingBoxDescent;
          const baseline = rect.top - bounds.top + (rect.height - ascent - descent) / 2 + ascent;
          ctx!.fillText(character, rect.left - bounds.left, baseline);
        }
      }
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(uniforms.uResolution, canvas!.width, canvas!.height);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, atlas);
      ready = true;
      sync();
    }
    function paint(now: number) {
      frame = 0;
      if (disposed || lost || !ready || !visible || document.hidden) return;
      const delta = previous ? Math.min(now - previous, 50) : 16;
      previous = now;
      elapsed += delta / 1000;
      const follow = 1 - Math.exp(-delta / (pointer.engaged ? 130 : 470));
      const targetX = pointer.engaged ? pointer.tx : .5 + Math.sin(elapsed * .33) * .12;
      const targetY = pointer.engaged ? pointer.ty : .5 + Math.cos(elapsed * .27) * .10;
      pointer.x += (targetX - pointer.x) * follow;
      pointer.y += (targetY - pointer.y) * follow;
      pointer.active += ((pointer.engaged ? 1 : .2) - pointer.active) * (1 - Math.exp(-delta / 270));
      for (let i = 0; i < 16; i += 4) if (clicks[i + 3]) {
        clicks[i + 2] += delta / 1000;
        if (clicks[i + 2] > 1.6) clicks[i + 3] = 0;
      }
      gl!.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
      gl!.uniform1f(uniforms.uPointerActive, pointer.active);
      gl!.uniform1f(uniforms.uTime, elapsed);
      gl!.uniform1f(uniforms.uIntro, Math.pow(Math.max(0, 1 - elapsed / 1.6), 3));
      gl!.uniform4fv(uniforms['uClicks[0]'], clicks);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      heading!.dataset.warpReady = 'true';
      frame = requestAnimationFrame(paint);
    }
    function sync() {
      if (disposed || lost) return;
      if (document.hidden || !visible) {
        cancelAnimationFrame(frame); frame = 0; previous = 0;
      } else if (ready && !frame) frame = requestAnimationFrame(paint);
    }
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const rect = canvas!.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      pointer.engaged = true;
    }
    const leave = () => { pointer.engaged = false; };
    function ripple(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const i = clickSlot++ % 4 * 4;
      clicks.set([(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height, 0, 1], i);
    }
    function contextLost(event: Event) {
      event.preventDefault(); lost = true;
      cancelAnimationFrame(frame); frame = 0;
      delete heading!.dataset.warpReady;
    }
    const resize = new ResizeObserver(rasterize);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    resize.observe(heading);
    intersection.observe(heading);
    heading.addEventListener('pointermove', move, { passive: true });
    heading.addEventListener('pointerleave', leave);
    heading.addEventListener('pointerdown', ripple, { passive: true });
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', sync);
    void document.fonts.ready.then(rasterize);
    rasterize();
    return () => {
      disposed = true; cancelAnimationFrame(frame);
      resize.disconnect(); intersection.disconnect();
      heading.removeEventListener('pointermove', move);
      heading.removeEventListener('pointerleave', leave);
      heading.removeEventListener('pointerdown', ripple);
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', sync);
      release();
    };
  }, [motion, lead, accent]);

  return <h1 ref={headingRef} className="hero-warp-title" aria-label={`${lead} ${accent}`}>
    <span ref={textRef} className="hero-warp-text">{lead}<br /><em>{accent}</em></span>
    <canvas ref={canvasRef} className="hero-warp-canvas" aria-hidden="true" />
  </h1>;
}
