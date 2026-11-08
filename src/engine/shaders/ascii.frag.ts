import { COMPARE_GLSL, COMPARE_MAIN_GLSL } from "./commonCompare.glsl";

export const ASCII_FRAG = `#version 300 es
precision highp float;
${COMPARE_GLSL}

uniform sampler2D u_atlas;
uniform float u_charCount;
uniform float u_cellSize;
uniform bool u_colorMode;
uniform vec3 u_tint;
uniform bool u_invert;

vec3 effect(vec2 uv) {
  vec2 px = uv * u_resolution;
  float cell = max(u_cellSize, 2.0);

  vec2 cellId = floor(px / cell);
  vec2 center = (cellId + 0.5) * cell / u_resolution;
  vec3 c = preprocess(sampleRaw(center));
  float l = luma(c);
  if (u_invert) l = 1.0 - l;
  float idx = floor(clamp(l, 0.0, 0.999) * u_charCount);

  vec2 local = fract(px / cell);
  vec2 atlasUv = vec2((idx + local.x) / u_charCount, local.y);
  float mask = texture(u_atlas, atlasUv).r;

  vec3 tint = u_colorMode ? max(c, vec3(0.08)) : u_tint;
  return tint * mask;
}
${COMPARE_MAIN_GLSL}
`;