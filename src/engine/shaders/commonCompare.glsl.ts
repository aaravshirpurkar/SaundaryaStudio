// Shared GLSL chunk: comparison modes are resolved at the fragment level so
// split/loupe/side-by-side stay glitch-free even on 60fps video sources.
// u_compareMode: 0 off · 1 split · 2 x-ray loupe · 3 side-by-side · 4 hold-bypass
export const COMPARE_GLSL = `
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform vec2 u_srcRes;
uniform float u_time;
uniform vec2 u_mouse;
uniform int u_compareMode;
uniform float u_splitPos;
uniform float u_loupeRadius;
uniform bool u_bypass;
uniform float u_contrast;
uniform float u_brightness;
uniform float u_gamma;

vec2 coverUv(vec2 uv) {
  float ca = u_resolution.x / u_resolution.y;
  float sa = u_srcRes.x / max(u_srcRes.y, 1.0);
  vec2 s = ca > sa ? vec2(1.0, sa / ca) : vec2(ca / sa, 1.0);
  return (uv - 0.5) * s + 0.5;
}

vec3 sampleRaw(vec2 uv) {
  return texture(u_tex, coverUv(uv)).rgb;
}

vec3 preprocess(vec3 c) {
  c += u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  c = pow(max(c, vec3(0.0)), vec3(1.0 / max(u_gamma, 0.01)));
  return clamp(c, 0.0, 1.0);
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 applyCompare(vec3 raw, vec3 fx, vec2 uv) {
  if (u_bypass) return raw;
  if (u_compareMode == 1) {
    float edge = 1.5 / u_resolution.x;
    return mix(raw, fx, smoothstep(u_splitPos - edge, u_splitPos + edge, uv.x));
  }
  if (u_compareMode == 2) {
    float d = length((uv - u_mouse) * u_resolution);
    float m = 1.0 - smoothstep(u_loupeRadius - 2.0, u_loupeRadius, d);
    return mix(fx, raw, m);
  }
  if (u_compareMode == 3) {
    return uv.x < 0.5 ? raw : fx;
  }
  return fx;
}
`;

// Appended after each effect defines `vec3 effect(vec2 uv)`.
export const COMPARE_MAIN_GLSL = `
void main() {
  vec2 uv = v_uv;
  vec2 rawUv = uv;
  vec2 fxUv = uv;
  if (u_compareMode == 3) {
    if (uv.x < 0.5) rawUv = vec2(uv.x * 2.0, uv.y);
    else fxUv = vec2((uv.x - 0.5) * 2.0, uv.y);
  }
  vec3 raw = sampleRaw(rawUv);
  vec3 fx = effect(fxUv);
  fragColor = vec4(applyCompare(raw, fx, uv), 1.0);
}
`;