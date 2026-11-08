import { COMPARE_GLSL, COMPARE_MAIN_GLSL } from "./commonCompare.glsl";

export const DITHER_FRAG = `#version 300 es
precision highp float;
${COMPARE_GLSL}

uniform int u_bayerSize;
uniform float u_pixelSize;
uniform vec3 u_palette[8];
uniform int u_paletteSize;
uniform float u_spread;
uniform bool u_invert;
uniform bool u_useProcessed;
uniform sampler2D u_processedTex;

float bayer2(vec2 a) {
  a = floor(a);
  return fract(dot(a, vec2(0.5, a.y * 0.75)));
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

vec3 nearestPalette(vec3 c) {
  float best = 1e9;
  vec3 bestC = u_palette[0];
  for (int i = 0; i < 8; i++) {
    if (i >= u_paletteSize) break;
    vec3 d = c - u_palette[i];
    float dd = dot(d, d);
    if (dd < best) { best = dd; bestC = u_palette[i]; }
  }
  return bestC;
}

vec3 effect(vec2 uv) {
  if (u_useProcessed) return texture(u_processedTex, uv).rgb;

  vec2 px = uv * u_resolution;
  float cell = max(u_pixelSize, 1.0);
  vec2 cellId = floor(px / cell);
  vec2 cuv = (cellId + 0.5) * cell / u_resolution;
  vec3 c = preprocess(sampleRaw(cuv));
  if (u_invert) c = vec3(1.0) - c;

  float b = u_bayerSize == 2 ? bayer2(cellId)
          : u_bayerSize == 4 ? bayer4(cellId)
          : bayer8(cellId);
  c += (b - 0.5) * u_spread;
  return nearestPalette(clamp(c, 0.0, 1.0));
}
${COMPARE_MAIN_GLSL}
`;