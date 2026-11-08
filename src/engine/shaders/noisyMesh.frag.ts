import { COMPARE_GLSL, COMPARE_MAIN_GLSL } from "./commonCompare.glsl";

export const MESH_FRAG = `#version 300 es
precision highp float;
${COMPARE_GLSL}

uniform vec3 u_colA;
uniform vec3 u_colB;
uniform vec3 u_colC;
uniform vec3 u_colD;
uniform float u_scale;
uniform float u_warp;
uniform float u_speed;
uniform float u_grain;
uniform float u_sourceInfluence;

// Ashima / Ian McEwan simplex noise (MIT).
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    f += amp * snoise(p);
    p = p * 2.03 + vec2(11.3, 7.9);
    amp *= 0.5;
  }
  return f * 0.5 + 0.5;
}

vec3 effect(vec2 uv) {
  vec2 p = uv * u_scale;
  p.x *= u_resolution.x / u_resolution.y;
  float t = u_time * u_speed;

  vec2 q = vec2(fbm(p + t * 0.12), fbm(p + vec2(5.2, 1.3) - t * 0.09));
  vec2 r = vec2(
    fbm(p + u_warp * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(p + u_warp * q + vec2(8.3, 2.8) - t * 0.11)
  );
  float f = fbm(p + u_warp * r);

  // The source image is the skeleton: the noise field bends and re-colors it.
  vec2 flow = (r - 0.5) * u_warp * 0.12;
  vec3 src = preprocess(sampleRaw(clamp(uv + flow * u_sourceInfluence, 0.0, 1.0)));
  float w = clamp(mix(f, luma(src), u_sourceInfluence), 0.0, 1.0);

  vec3 col = mix(u_colA, u_colB, smoothstep(0.0, 0.38, w));
  col = mix(col, u_colC, smoothstep(0.32, 0.68, w));
  col = mix(col, u_colD, smoothstep(0.62, 1.0, w));
  col = mix(col, src * (0.35 + 0.65 * w), u_sourceInfluence * 0.55);

  // Animated monochrome micro-grain kills gradient banding.
  float g = hash21(uv * u_resolution + fract(u_time * 7.0) * 913.0);
  col += (g - 0.5) * (u_grain / 255.0) * 2.0;
  return clamp(col, 0.0, 1.0);
}
${COMPARE_MAIN_GLSL}
`;