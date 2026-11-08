import { COMPARE_GLSL, COMPARE_MAIN_GLSL } from "./commonCompare.glsl";

export const HALFTONE_FRAG = `#version 300 es
precision highp float;
${COMPARE_GLSL}

uniform float u_dotSize;
uniform float u_angle;
uniform int u_mode;
uniform int u_shape;
uniform vec2 u_registration;
uniform float u_grain;
uniform vec3 u_paper;
uniform vec3 u_inkC;
uniform vec3 u_inkM;
uniform vec3 u_inkY;
uniform vec3 u_inkK;
uniform vec3 u_duoA;
uniform vec3 u_duoB;

mat2 rot2(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float dotDist(vec2 local) {
  if (u_shape == 1) return abs(local.y) * 1.4142;
  if (u_shape == 2) return length(local * vec2(1.0, 1.65));
  return length(local);
}

// Samples the source at the rotated cell centre and returns ink coverage.
float screenCoverage(vec2 px, float angle, float size, int channel, vec2 reg) {
  vec2 p = rot2(angle) * (px + reg) / size;
  vec2 cellId = floor(p);
  vec2 centerPx = rot2(-angle) * ((cellId + 0.5) * size) - reg;
  vec2 cuv = clamp(centerPx / u_resolution, 0.0, 1.0);
  vec3 c = preprocess(sampleRaw(cuv));

  float value;
  if (u_mode == 0) {
    float k = 1.0 - max(c.r, max(c.g, c.b));
    float inv = 1.0 / max(1.0 - k, 1e-4);
    if (channel == 0) value = (1.0 - c.r - k) * inv;
    else if (channel == 1) value = (1.0 - c.g - k) * inv;
    else if (channel == 2) value = (1.0 - c.b - k) * inv;
    else value = k;
  } else {
    float l = luma(c);
    value = channel == 0 ? 1.0 - l : 1.0 - abs(l - 0.5) * 2.0;
  }

  vec2 local = fract(p) - 0.5;
  float r = sqrt(clamp(value, 0.0, 1.0)) * 0.7071;
  float dist = dotDist(local);
  float aa = 1.6 / size;
  float cov = 1.0 - smoothstep(r - aa, r + aa, dist);
  cov += (hash21(px) - 0.5) * u_grain;
  return clamp(cov, 0.0, 1.0);
}

vec3 effect(vec2 uv) {
  vec2 px = uv * u_resolution;
  float size = max(u_dotSize, 2.0);
  float a = radians(u_angle);
  vec3 col = u_paper;

  if (u_mode == 0) {
    float c = screenCoverage(px, a + radians(15.0), size, 0, u_registration);
    float m = screenCoverage(px, a + radians(75.0), size, 1, -u_registration);
    float y = screenCoverage(px, a, size, 2, u_registration.yx);
    float k = screenCoverage(px, a + radians(45.0), size, 3, vec2(0.0));
    col *= mix(vec3(1.0), u_inkC, c);
    col *= mix(vec3(1.0), u_inkM, m);
    col *= mix(vec3(1.0), u_inkY, y);
    col *= mix(vec3(1.0), u_inkK, k);
  } else if (u_mode == 1) {
    float dark = screenCoverage(px, a + radians(45.0), size, 0, u_registration);
    float mid = screenCoverage(px, a + radians(15.0), size, 1, -u_registration);
    col = mix(col, u_duoB, dark);
    col = mix(col, u_duoA, mid * 0.55 * (1.0 - dark));
  } else {
    float dark = screenCoverage(px, a + radians(45.0), size, 0, vec2(0.0));
    col = mix(col, u_inkK, dark);
  }
  return col;
}
${COMPARE_MAIN_GLSL}
`;