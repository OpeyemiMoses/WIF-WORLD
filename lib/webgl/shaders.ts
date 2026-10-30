/**
 * Production GLSL ES 3.00 Shaders for the WIF WORLDS WebGL2 Living Island Engine:
 * 1. Directional Shadow Depth Pass (with wind sway)
 * 2. Sculpted Multi-Biome Terrain + Merged Kingdom Borders + PCF Soft Shadows
 * 3. Organic Foliage, Rocks & Medieval Architecture Shader
 * 4. Animated Realistic Ocean, Lagoon & Breaking Seafoam Shader
 * 5. Volumetric Beacon Light Pillar & Rising Smoke/Ember Shader
 */

const GLSL_COMMON_NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}

vec3 acesToneMap(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
`;

const GLSL_SHADOW_SAMPLING = /* glsl */ `
uniform sampler2D u_shadowMap;

float sampleSoftShadow(vec4 lightSpacePos, vec3 normal, vec3 lightDir) {
  vec3 proj = lightSpacePos.xyz / lightSpacePos.w;
  proj = proj * 0.5 + 0.5;
  if (proj.x < 0.01 || proj.x > 0.99 || proj.y < 0.01 || proj.y > 0.99 || proj.z > 0.995) {
    return 1.0;
  }
  float bias = max(0.0022 * (1.0 - dot(normal, lightDir)), 0.00075);
  vec2 texelSize = 1.0 / vec2(textureSize(u_shadowMap, 0));
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float closest = textureLod(u_shadowMap, proj.xy + vec2(float(x), float(y)) * texelSize, 0.0).r;
      lit += (proj.z - bias <= closest) ? 1.0 : 0.0;
    }
  }
  return lit / 9.0;
}
`;

// ============================================================================
// 1. SHADOW DEPTH PASS
// ============================================================================
export const SHADOW_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 3) in vec2 a_extra;

uniform mat4 u_lightVP;
uniform float u_time;
uniform float u_isPropPass;

void main() {
  vec3 pos = a_position;
  if (u_isPropPass > 0.5 && (abs(a_extra.x - 2.0) < 0.2 || abs(a_extra.x - 3.0) < 0.2)) {
    float sway = sin(u_time * 1.6 + pos.x * 0.9 + pos.z * 0.7) * 0.035 * a_extra.y;
    pos.x += sway;
    pos.z += sway * 0.6;
  }
  gl_Position = u_lightVP * vec4(pos, 1.0);
}
`;

export const SHADOW_FRAG = /* glsl */ `#version 300 es
precision highp float;
void main() {
  // Depth written automatically
}
`;

// ============================================================================
// 2. SCULPTED ISLAND TERRAIN SHADER
// ============================================================================
export const TERRAIN_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 3) in vec2 a_extra;

uniform mat4 u_viewProj;
uniform mat4 u_lightVP;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_extra;
out vec4 v_lightSpacePos;

void main() {
  v_worldPos = a_position;
  v_normal = a_normal;
  v_extra = a_extra;
  v_lightSpacePos = u_lightVP * vec4(a_position, 1.0);
  gl_Position = u_viewProj * vec4(a_position, 1.0);
}
`;

export const TERRAIN_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_extra;
in vec4 v_lightSpacePos;

uniform vec3 u_cameraPos;
uniform vec3 u_sunDir;
uniform float u_time;
uniform float u_tileSize;
uniform int u_selectedLocalId;
uniform int u_hoveredLocalId;
uniform int u_showBorders;
uniform int u_showGrid;
uniform int u_tileOwners[49]; // 0 = neutral, 1 = you, 2 = other
uniform int u_lightCount;
uniform vec4 u_pointLightPos[16]; // xyz, w = intensity
uniform vec3 u_pointLightCol[16];

${GLSL_COMMON_NOISE}
${GLSL_SHADOW_SAMPLING}

int getOwnerAt(int r, int c) {
  if (r < 0 || r >= 7 || c < 0 || c >= 7) return 0;
  return u_tileOwners[r * 7 + c];
}

out vec4 outColor;

void main() {
  vec3 N = normalize(v_normal);
  vec2 wp = v_worldPos.xz;
  float h = v_worldPos.y;

  // Multi-scale procedural ground detail
  float macroN = fbm3(wp * 0.45);
  float midN   = fbm3(wp * 2.35);
  float fineN  = vnoise(wp * 11.5);

  // Base grass / biome palette (grounded, lush dark-fantasy colors matching reference Panel 2)
  vec3 meadowGrassA = vec3(0.165, 0.285, 0.135);
  vec3 meadowGrassB = vec3(0.285, 0.405, 0.195);
  vec3 forestMoss   = vec3(0.105, 0.205, 0.115);
  vec3 hillHeather  = vec3(0.245, 0.315, 0.165);
  vec3 dirtEarth    = vec3(0.255, 0.195, 0.140);
  vec3 beachSand    = vec3(0.365, 0.325, 0.245);
  vec3 cliffRockA   = vec3(0.175, 0.168, 0.165);
  vec3 cliffRockB   = vec3(0.285, 0.270, 0.258);
  vec3 alpineSnow   = vec3(0.82, 0.85, 0.89);

  vec3 turf = mix(meadowGrassA, meadowGrassB, smoothstep(0.28, 0.72, macroN * 0.65 + midN * 0.35));

  float biome = v_extra.x;
  if (biome > 0.5 && biome < 1.5) {
    // Deep forest floor moss & pine needles
    turf = mix(turf, forestMoss, 0.68);
  } else if (biome >= 1.5 && biome < 2.5) {
    // Rolling highland turf
    turf = mix(turf, hillHeather, 0.58);
  } else if (biome >= 3.5) {
    // Sacred Obsidian Sanctuary ground with faint crimson veins
    vec3 obs = mix(vec3(0.11, 0.09, 0.11), vec3(0.19, 0.12, 0.14), midN);
    float vein = smoothstep(0.76, 0.84, vnoise(wp * 5.5));
    obs += vec3(0.55, 0.08, 0.12) * vein * 0.55;
    turf = mix(turf, obs, 0.82);
  }

  // Footpaths & settlement cobblestone plazas
  float roadMask = clamp(v_extra.y, 0.0, 1.0);
  vec3 cobble = mix(dirtEarth, vec3(0.31, 0.29, 0.27), smoothstep(0.4, 0.7, fineN));
  turf = mix(turf, cobble, roadMask * 0.78);

  // Sandy / shingle shoreline transition around water level (h = 0)
  float shoreBand = 1.0 - smoothstep(-0.55, 0.46, abs(h - 0.06));
  turf = mix(turf, beachSand, shoreBand * 0.72);

  // Steep slopes expose stratified granite cliff rock
  float slope = 1.0 - clamp(N.y, 0.0, 1.0);
  float rockBlend = smoothstep(0.20, 0.44, slope);
  // High altitude rocky ridges also expose granite
  rockBlend = max(rockBlend, smoothstep(3.4, 4.9, h) * 0.82);

  float strata = 0.5 + 0.5 * sin(h * 7.5 + midN * 4.2);
  vec3 rockCol = mix(cliffRockA, cliffRockB, strata * 0.7 + fineN * 0.3);
  vec3 albedo = mix(turf, rockCol, rockBlend);

  // Alpine snow & frost on high mountain peaks
  float snowFactor = smoothstep(4.55, 5.75, h + midN * 0.55) * smoothstep(0.38, 0.68, N.y);
  albedo = mix(albedo, alpineSnow, snowFactor);

  // Darken wet rock/sand just near & below water surface
  float wetness = 1.0 - smoothstep(-0.05, 0.28, h);
  albedo *= mix(1.0, 0.56, wetness);

  // Micro texture grain
  albedo *= 0.90 + 0.20 * fineN;

  // ==========================================================================
  // LIGHTING & DIRECTIONAL SHADOWS
  // ==========================================================================
  vec3 L = normalize(u_sunDir);
  vec3 V = normalize(u_cameraPos - v_worldPos);
  vec3 H = normalize(L + V);

  float shadow = sampleSoftShadow(v_lightSpacePos, N, L);
  float NdotL = max(dot(N, L), 0.0);

  // Warm sunset golden-ivory key light + moody teal sky hemisphere fill
  vec3 sunColor = vec3(1.32, 1.12, 0.92);
  vec3 skyFill  = mix(vec3(0.08, 0.11, 0.13), vec3(0.17, 0.24, 0.29), N.y * 0.5 + 0.5);

  // Wet shoreline specular sheen
  float roughness = mix(0.85, 0.28, wetness);
  float spec = pow(max(dot(N, H), 0.0), mix(12.0, 64.0, wetness)) * mix(0.04, 0.35, wetness);

  vec3 color = albedo * (skyFill + sunColor * NdotL * shadow) + sunColor * spec * shadow;

  // Warm point lights from player settlements, forges & the Beacon spire
  for (int i = 0; i < 16; i++) {
    if (i >= u_lightCount) break;
    vec3 lVec = u_pointLightPos[i].xyz - v_worldPos;
    float dist = length(lVec);
    float atten = u_pointLightPos[i].w / (1.0 + 0.38 * dist + 0.22 * dist * dist);
    float pDiff = max(dot(N, lVec / max(dist, 0.001)), 0.0) * 0.7 + 0.3;
    color += albedo * u_pointLightCol[i] * atten * pDiff;
  }

  // ==========================================================================
  // CONFORMAL MERGED KINGDOM TERRITORY BORDERS & TILE SELECTION RINGS
  // ==========================================================================
  float fCol = v_worldPos.x / u_tileSize + 3.5;
  float fRow = v_worldPos.z / u_tileSize + 3.5;
  if (h > -0.25 && fCol >= 0.0 && fCol < 7.0 && fRow >= 0.0 && fRow < 7.0) {
    int col = int(floor(fCol));
    int row = int(floor(fRow));
    int localId = row * 7 + col;
    vec2 cellUV = vec2(fract(fCol), fract(fRow));
    float edgeDist = min(min(cellUV.x, 1.0 - cellUV.x), min(cellUV.y, 1.0 - cellUV.y));

    // Optional subtle tactical coordinate grid
    if (u_showGrid == 1) {
      float gridLine = 1.0 - smoothstep(0.008, 0.022, edgeDist);
      color = mix(color, vec3(0.85, 0.88, 0.90), gridLine * 0.22);
    }

    // Merged Kingdom Borders (only draw outer boundary where neighbor owner differs!)
    if (u_showBorders == 1) {
      int owner = getOwnerAt(row, col);
      if (owner > 0) {
        vec3 borderCol = (owner == 1)
          ? vec3(0.18, 0.86, 0.76)  // Sovereign Teal (You)
          : vec3(0.95, 0.24, 0.30); // Rival Crimson (Other Players)

        float bMask = 0.0;
        float bw = 0.045;
        if (cellUV.x < bw && getOwnerAt(row, col - 1) != owner) {
          bMask = max(bMask, 1.0 - smoothstep(0.012, bw, cellUV.x));
        }
        if (cellUV.x > 1.0 - bw && getOwnerAt(row, col + 1) != owner) {
          bMask = max(bMask, 1.0 - smoothstep(0.012, bw, 1.0 - cellUV.x));
        }
        if (cellUV.y < bw && getOwnerAt(row - 1, col) != owner) {
          bMask = max(bMask, 1.0 - smoothstep(0.012, bw, cellUV.y));
        }
        if (cellUV.y > 1.0 - bw && getOwnerAt(row + 1, col) != owner) {
          bMask = max(bMask, 1.0 - smoothstep(0.012, bw, 1.0 - cellUV.y));
        }
        // Subtle territory interior tint + crisp glowing perimeter line
        color = mix(color, borderCol * 0.55, 0.07);
        color = mix(color, borderCol * 1.35, bMask * 0.92);
      }
    }

    // Hovered tile highlight contour
    if (localId == u_hoveredLocalId && localId != u_selectedLocalId) {
      float hRing = 1.0 - smoothstep(0.015, 0.042, edgeDist);
      color += vec3(0.28, 0.30, 0.32) * 0.14;
      color = mix(color, vec3(0.96, 0.96, 0.98), hRing * 0.72);
    }

    // Selected tile pulsing golden-crimson contour
    if (localId == u_selectedLocalId) {
      float pulse = 0.82 + 0.18 * sin(u_time * 3.2);
      float sRing = 1.0 - smoothstep(0.020, 0.055, edgeDist);
      color += vec3(0.32, 0.22, 0.08) * 0.16 * pulse;
      color = mix(color, vec3(1.0, 0.82, 0.36) * 1.25, sRing * 0.95);
    }
  }

  // Distance abyssal fog blend
  float distCam = length(v_worldPos.xz);
  float fog = smoothstep(36.0, 58.0, distCam);
  vec3 fogColor = vec3(0.016, 0.042, 0.052);

  color = acesToneMap(color);
  color = mix(color, fogColor, fog);
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

  outColor = vec4(color, 1.0);
}
`;

// ============================================================================
// 3. ORGANIC TREES, BOULDERS & MEDIEVAL ARCHITECTURE SHADER
// ============================================================================
export const PROP_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec3 a_color;
layout(location = 3) in vec2 a_extra; // [matId, ao]

uniform mat4 u_viewProj;
uniform mat4 u_lightVP;
uniform float u_time;

out vec3 v_worldPos;
out vec3 v_normal;
out vec3 v_color;
out vec2 v_extra;
out vec4 v_lightSpacePos;

void main() {
  vec3 pos = a_position;
  float matId = a_extra.x;

  // Natural gentle breeze swaying tree boughs
  if (abs(matId - 2.0) < 0.2 || abs(matId - 3.0) < 0.2) {
    float sway = sin(u_time * 1.6 + pos.x * 0.9 + pos.z * 0.7) * 0.035 * a_extra.y;
    pos.x += sway;
    pos.z += sway * 0.6;
  }

  v_worldPos = pos;
  v_normal = a_normal;
  v_color = a_color;
  v_extra = a_extra;
  v_lightSpacePos = u_lightVP * vec4(pos, 1.0);
  gl_Position = u_viewProj * vec4(pos, 1.0);
}
`;

export const PROP_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec3 v_color;
in vec2 v_extra;
in vec4 v_lightSpacePos;

uniform vec3 u_cameraPos;
uniform vec3 u_sunDir;
uniform float u_time;
uniform int u_lightCount;
uniform vec4 u_pointLightPos[16];
uniform vec3 u_pointLightCol[16];

${GLSL_COMMON_NOISE}
${GLSL_SHADOW_SAMPLING}

out vec4 outColor;

void main() {
  float matId = v_extra.x;
  float ao    = clamp(v_extra.y, 0.15, 1.0);

  // Glowing emissive windows, braziers & Beacon core
  if (matId > 8.5 && matId < 10.5) {
    float flicker = 0.90 + 0.10 * sin(u_time * 6.5 + v_worldPos.x * 5.0 + v_worldPos.z * 3.0);
    vec3 glow = v_color * (1.85 * flicker);
    glow = acesToneMap(glow);
    glow = pow(max(glow, vec3(0.0)), vec3(1.0 / 2.2));
    outColor = vec4(glow, 1.0);
    return;
  }

  vec3 N = normalize(v_normal);
  vec3 albedo = v_color;

  // Procedural material micro-detail
  float grain = vnoise(v_worldPos.xz * 16.0 + v_worldPos.y * 12.0);
  if (abs(matId - 2.0) < 0.3 || abs(matId - 3.0) < 0.3) {
    // Pine needles & oak leaf cluster texture
    float leafTex = vnoise(v_worldPos.xz * 26.0 + v_worldPos.y * 22.0);
    albedo *= 0.82 + 0.36 * leafTex;
  } else if (abs(matId - 5.0) < 0.3) {
    // Stone castle masonry blocks
    float courses = step(0.12, fract(v_worldPos.y * 9.0));
    albedo *= (0.86 + 0.22 * grain) * mix(0.84, 1.0, courses);
  } else if (abs(matId - 7.0) < 0.3) {
    // Roof shingle courses
    float shingles = 0.88 + 0.16 * sin(v_worldPos.y * 38.0);
    albedo *= shingles * (0.90 + 0.18 * grain);
  } else {
    albedo *= 0.88 + 0.22 * grain;
  }

  vec3 L = normalize(u_sunDir);
  vec3 V = normalize(u_cameraPos - v_worldPos);
  vec3 H = normalize(L + V);

  float shadow = sampleSoftShadow(v_lightSpacePos, N, L);
  float NdotL = max(dot(N, L), 0.0);

  vec3 sunColor = vec3(1.32, 1.12, 0.92);
  vec3 skyFill  = mix(vec3(0.08, 0.11, 0.13), vec3(0.18, 0.25, 0.30), N.y * 0.5 + 0.5);

  // Subsurface foliage translucency when backlit by the warm sun
  float sss = 0.0;
  if (abs(matId - 2.0) < 0.3 || abs(matId - 3.0) < 0.3) {
    sss = pow(clamp(dot(V, -L), 0.0, 1.0), 3.0) * 0.32 * ao;
  }

  float specPower = (abs(matId - 11.0) < 0.3) ? 48.0 : 18.0;
  float specStrength = (abs(matId - 11.0) < 0.3) ? 0.55 : 0.06;
  float spec = pow(max(dot(N, H), 0.0), specPower) * specStrength;

  vec3 color =
    albedo * (skyFill * ao + sunColor * (NdotL * shadow * (0.45 + 0.55 * ao) + sss)) +
    sunColor * spec * shadow;

  // Warm torchlight from settlements
  for (int i = 0; i < 16; i++) {
    if (i >= u_lightCount) break;
    vec3 lVec = u_pointLightPos[i].xyz - v_worldPos;
    float dist = length(lVec);
    float atten = u_pointLightPos[i].w / (1.0 + 0.42 * dist + 0.25 * dist * dist);
    float pDiff = max(dot(N, lVec / max(dist, 0.001)), 0.0) * 0.65 + 0.35;
    color += albedo * u_pointLightCol[i] * atten * pDiff * ao;
  }

  float distCam = length(v_worldPos.xz);
  float fog = smoothstep(36.0, 58.0, distCam);
  vec3 fogColor = vec3(0.016, 0.042, 0.052);

  color = acesToneMap(color);
  color = mix(color, fogColor, fog);
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

  outColor = vec4(color, 1.0);
}
`;

// ============================================================================
// 4. REALISTIC ANIMATED OCEAN, LAGOONS & SEAFOAM SHADER
// ============================================================================
export const WATER_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 3) in vec2 a_extra; // [waterDepth, terrainH]

uniform mat4 u_viewProj;
uniform mat4 u_lightVP;
uniform float u_time;

out vec3 v_worldPos;
out float v_waterDepth;
out vec4 v_lightSpacePos;

void main() {
  vec3 pos = a_position;
  float depth = a_extra.x;
  float swellAmp = clamp(depth * 0.4, 0.0, 1.0) * 0.055;
  pos.y +=
    sin(pos.x * 0.55 + u_time * 1.35) * swellAmp +
    cos(pos.z * 0.68 - u_time * 1.1) * swellAmp * 0.8;

  v_worldPos = pos;
  v_waterDepth = depth;
  v_lightSpacePos = u_lightVP * vec4(pos, 1.0);
  gl_Position = u_viewProj * vec4(pos, 1.0);
}
`;

export const WATER_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_worldPos;
in float v_waterDepth;
in vec4 v_lightSpacePos;

uniform vec3 u_cameraPos;
uniform vec3 u_sunDir;
uniform float u_time;

${GLSL_COMMON_NOISE}
${GLSL_SHADOW_SAMPLING}

float waveHeight(vec2 p, float t) {
  float w = 0.0;
  w += fbm3(p * 0.85 + vec2(t * 0.24, -t * 0.18)) * 0.55;
  w += fbm3(p * 2.15 - vec2(t * 0.31, t * 0.22)) * 0.28;
  w += vnoise(p * 5.8 + vec2(t * 0.55, t * 0.42)) * 0.12;
  return w;
}

out vec4 outColor;

void main() {
  // Discard where water mesh lies underneath dry island ground
  if (v_waterDepth < -0.02) {
    discard;
  }

  float depth = max(v_waterDepth, 0.0);
  vec2 wp = v_worldPos.xz;

  // Finite-difference animated multi-octave wave normal
  float eps = 0.08;
  float h0 = waveHeight(wp, u_time);
  float hx = waveHeight(wp + vec2(eps, 0.0), u_time);
  float hz = waveHeight(wp + vec2(0.0, eps), u_time);
  float waveStrength = mix(0.18, 0.42, clamp(depth * 0.5, 0.0, 1.0));
  vec3 N = normalize(vec3((h0 - hx) * waveStrength / eps, 1.0, (h0 - hz) * waveStrength / eps));

  vec3 V = normalize(u_cameraPos - v_worldPos);
  vec3 L = normalize(u_sunDir);
  vec3 H = normalize(L + V);

  // Depth-based water absorption (turquoise coastal shallows -> dark abyssal teal)
  vec3 shallowCol = vec3(0.09, 0.36, 0.40);
  vec3 midWater   = vec3(0.032, 0.145, 0.185);
  vec3 abyssCol   = vec3(0.014, 0.042, 0.056);

  vec3 waterBody = mix(shallowCol, midWater, smoothstep(0.08, 1.25, depth));
  waterBody = mix(waterBody, abyssCol, smoothstep(1.25, 3.2, depth));

  // Subtle submerged caustics in shallow lagoons
  float caustic = vnoise(wp * 4.2 + N.xz * 2.5 + u_time * 0.4);
  waterBody += vec3(0.06, 0.18, 0.20) * smoothstep(0.55, 0.88, caustic) * (1.0 - smoothstep(0.1, 1.1, depth));

  // Fresnel sky reflection (reflecting twilight teal & faint crimson horizon glow)
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  vec3 R = reflect(-V, N);
  float crimsonSkyHint = pow(max(dot(normalize(vec3(R.x, abs(R.y), R.z)), L), 0.0), 3.0);
  vec3 skyReflect = mix(vec3(0.06, 0.13, 0.16), vec3(0.32, 0.14, 0.16), crimsonSkyHint * 0.65);

  float shadow = sampleSoftShadow(v_lightSpacePos, vec3(0.0, 1.0, 0.0), L);
  vec3 color = mix(waterBody, skyReflect, clamp(0.12 + fresnel * 0.72, 0.0, 0.85));
  color *= (0.55 + 0.45 * shadow);

  // Crisp sun specular sparkles across moving ripples
  float spec = pow(max(dot(N, H), 0.0), 140.0) * 1.45 * shadow;
  color += vec3(1.0, 0.86, 0.72) * spec;

  // Dynamic breaking shoreline seafoam where water meets beaches, cliffs & sea stacks!
  float foamNoise = fbm3(wp * 3.4 - vec2(u_time * 0.18));
  float surfWave = sin(depth * 15.0 - u_time * 2.4 + foamNoise * 5.2);
  float shoreZone = 1.0 - smoothstep(0.02, 0.68, depth);
  float foamMask = shoreZone * smoothstep(-0.15, 0.55, surfWave + (1.0 - depth * 1.8) * 0.55);
  // Crisp white water-edge lip
  foamMask = max(foamMask, (1.0 - smoothstep(0.0, 0.11, depth)) * 0.88);

  vec3 foamColor = vec3(0.76, 0.86, 0.89) * (0.65 + 0.35 * shadow);
  color = mix(color, foamColor, clamp(foamMask * 0.78, 0.0, 0.88));

  // Distance fog fade into abyssal ocean mist
  float distOrigin = length(wp);
  float horizonFade = smoothstep(42.0, 64.0, distOrigin);

  color = acesToneMap(color);
  vec3 bgAbyss = vec3(0.016, 0.042, 0.052);
  color = mix(color, bgAbyss, horizonFade);
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

  float alpha = mix(0.76, 0.98, smoothstep(0.02, 0.45, depth));
  alpha = mix(alpha, 1.0, horizonFade);
  outColor = vec4(color, alpha);
}
`;

// ============================================================================
// 5. VOLUMETRIC BEACON BEAM & RISING SMOKE / EMBERS SHADER
// ============================================================================
export const EFFECT_VERT = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal; // for particles: [quadX, quadY, seed]
layout(location = 2) in vec3 a_color;
layout(location = 3) in vec2 a_extra;  // [kind (1=beam, 2=ember, 3=smoke), alphaOrPhase]

uniform mat4 u_viewProj;
uniform vec3 u_camRight;
uniform vec3 u_camUp;
uniform float u_time;

out vec3 v_color;
out vec2 v_uv;
out float v_kind;
out float v_alpha;

void main() {
  float kind = a_extra.x;
  v_kind = kind;
  v_color = a_color;

  if (kind < 1.5) {
    // Volumetric Beacon Beam Cylinder
    v_uv = vec2(0.5, a_extra.y);
    float pulse = 0.85 + 0.15 * sin(u_time * 3.2 + a_position.y * 0.4);
    v_alpha = a_extra.y * pulse;
    gl_Position = u_viewProj * vec4(a_position, 1.0);
  } else {
    // Rising Smoke / Ember Billboard Particle
    float phase = fract(a_extra.y + u_time * (kind < 2.5 ? 0.28 : 0.16) + a_normal.z * 0.13);
    float seed = a_normal.z;
    vec3 center = a_position;
    center.y += phase * (kind < 2.5 ? 4.8 : 2.1);
    center.x += sin(phase * 5.0 + seed) * (0.18 + phase * 0.25) + phase * 0.35;
    center.z += cos(phase * 4.2 + seed * 1.3) * (0.15 + phase * 0.2);

    float scale = (kind < 2.5) ? (1.0 - phase * 0.5) : (0.65 + phase * 1.45);
    vec3 worldPos =
      center +
      u_camRight * (a_normal.x * scale) +
      u_camUp * (a_normal.y * scale);

    v_uv = vec2(a_normal.x > 0.0 ? 1.0 : 0.0, a_normal.y > 0.0 ? 1.0 : 0.0);
    float fadeIn = smoothstep(0.0, 0.18, phase);
    float fadeOut = 1.0 - smoothstep(0.55, 1.0, phase);
    v_alpha = fadeIn * fadeOut * (kind < 2.5 ? 0.85 : 0.26);
    gl_Position = u_viewProj * vec4(worldPos, 1.0);
  }
}
`;

export const EFFECT_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_color;
in vec2 v_uv;
in float v_kind;
in float v_alpha;

out vec4 outColor;

void main() {
  if (v_kind < 1.5) {
    outColor = vec4(v_color * v_alpha, v_alpha * 0.55);
  } else {
    float d = length(v_uv - vec2(0.5)) * 2.0;
    float soft = 1.0 - smoothstep(0.1, 1.0, d);
    float a = soft * v_alpha;
    if (a < 0.005) discard;
    outColor = vec4(v_color * (v_kind < 2.5 ? 1.4 : 0.55), a);
  }
}
`;
