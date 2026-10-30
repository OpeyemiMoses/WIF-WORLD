/**
 * Hardware-Accelerated WebGL2 Renderer for WIF WORLDS: The Living Map.
 * Renders the sculpted 3D floating island, animated ocean & surf, 1,200+ organic trees,
 * medieval cottages, castles, beacons, and directional 2048x2048 soft shadows at 60 FPS.
 */

import { TileState, ZERO_ADDRESS } from "@/lib/game/worldData";
import {
  createMat4,
  invertMat4,
  lookAtMat4,
  Mat4,
  multiplyMat4,
  orthoMat4,
  perspectiveMat4,
  projectPointToScreen,
  unprojectRay,
  Vec3,
} from "./math";
import {
  EFFECT_FRAG,
  EFFECT_VERT,
  PROP_FRAG,
  PROP_VERT,
  SHADOW_FRAG,
  SHADOW_VERT,
  TERRAIN_FRAG,
  TERRAIN_VERT,
  WATER_FRAG,
  WATER_VERT,
} from "./shaders";
import {
  buildOceanWaterMesh,
  buildSculptedTerrainMesh,
  buildTileGrid2D,
  buildVolumetricEffectsMesh,
  buildWorldPropsMesh,
  PackedMesh,
  sampleIslandSurface,
  SettlementLight,
  tileCenterWorld,
  WORLD_TILE_SIZE,
  worldToGridIndices,
} from "./worldGeometry";

interface GLMeshBuffers {
  vao: WebGLVertexArrayObject;
  posBuf: WebGLBuffer;
  normBuf: WebGLBuffer;
  colBuf: WebGLBuffer;
  extBuf: WebGLBuffer;
  idxBuf: WebGLBuffer;
  indexCount: number;
}

export interface CameraOrbitState {
  azimuth: number;   // Horizontal orbit angle in radians (unbounded 360°)
  elevation: number; // Vertical tilt angle in radians (0.36 .. 1.18)
  distance: number;  // Distance from target (10 .. 48)
  targetX: number;
  targetY?: number;
  targetZ: number;
}

const SUN_DIRECTION: Vec3 = [-0.54, 0.68, 0.49];

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create WebGL shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`GLSL compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const prog = gl.createProgram();
  if (!prog) throw new Error("Failed to create WebGL program");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`GLSL link error: ${info}`);
  }
  return prog;
}

export class IslandWebGLRenderer {
  private gl: WebGL2RenderingContext;
  private shadowProg: WebGLProgram;
  private terrainProg: WebGLProgram;
  private propProg: WebGLProgram;
  private waterProg: WebGLProgram;
  private effectProg: WebGLProgram;

  private shadowFbo: WebGLFramebuffer;
  private shadowTex: WebGLTexture;
  private readonly shadowSize = 2048;

  private terrainMesh: GLMeshBuffers | null = null;
  private waterMesh: GLMeshBuffers | null = null;
  private propMesh: GLMeshBuffers | null = null;
  private effectMesh: GLMeshBuffers | null = null;

  private lights: SettlementLight[] = [];
  private tileOwnersInt = new Int32Array(49);
  private tileGrid: TileState[][] = [];
  private currentTiles: TileState[] = [];
  private lastTopologyKey = "";
  private lastPropsKey = "";

  // Reusable matrices
  private projMat: Mat4 = createMat4();
  private viewMat: Mat4 = createMat4();
  private viewProjMat: Mat4 = createMat4();
  private invViewProjMat: Mat4 = createMat4();
  private lightProjMat: Mat4 = createMat4();
  private lightViewMat: Mat4 = createMat4();
  private lightVPMat: Mat4 = createMat4();

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      depth: true,
      powerPreference: "high-performance",
    });
    if (!gl) {
      throw new Error("WebGL2 is not supported in this browser");
    }
    this.gl = gl;

    this.shadowProg = createProgram(gl, SHADOW_VERT, SHADOW_FRAG);
    this.terrainProg = createProgram(gl, TERRAIN_VERT, TERRAIN_FRAG);
    this.propProg = createProgram(gl, PROP_VERT, PROP_FRAG);
    this.waterProg = createProgram(gl, WATER_VERT, WATER_FRAG);
    this.effectProg = createProgram(gl, EFFECT_VERT, EFFECT_FRAG);

    // Initialize 2048x2048 Directional Shadow Map Framebuffer
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    if (!tex || !fbo) throw new Error("Failed to allocate shadow map");
    this.shadowTex = tex;
    this.shadowFbo = fbo;

    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      this.shadowSize,
      this.shadowSize,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NONE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      this.shadowTex,
      0
    );
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Precompute directional sun LightVP matrix covering the island
    const sunLen = Math.hypot(...SUN_DIRECTION);
    const sx = (SUN_DIRECTION[0] / sunLen) * 38;
    const sy = (SUN_DIRECTION[1] / sunLen) * 38;
    const sz = (SUN_DIRECTION[2] / sunLen) * 38;
    orthoMat4(this.lightProjMat, -28, 28, -28, 28, 4, 84);
    lookAtMat4(this.lightViewMat, [sx, sy, sz], [0, 0, 0], [0, 1, 0]);
    multiplyMat4(this.lightVPMat, this.lightProjMat, this.lightViewMat);
  }

  private uploadMesh(packed: PackedMesh): GLMeshBuffers {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, packed.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const normBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, packed.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const colBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, packed.colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

    const extBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, extBuf);
    gl.bufferData(gl.ARRAY_BUFFER, packed.extra, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, packed.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return {
      vao,
      posBuf,
      normBuf,
      colBuf,
      extBuf,
      idxBuf,
      indexCount: packed.indices.length,
    };
  }

  private deleteMesh(m: GLMeshBuffers | null) {
    if (!m) return;
    const gl = this.gl;
    gl.deleteBuffer(m.posBuf);
    gl.deleteBuffer(m.normBuf);
    gl.deleteBuffer(m.colBuf);
    gl.deleteBuffer(m.extBuf);
    gl.deleteBuffer(m.idxBuf);
    gl.deleteVertexArray(m.vao);
  }

  /**
   * Synchronizes island meshes & faction territory owner array whenever world state updates.
   * Only rebuilds heavy geometry when terrain/settlements/structures actually change!
   */
  syncWorldData(
    tiles: TileState[],
    connectedAddress: string | undefined,
    showStructures: boolean,
    beaconProgressRatio: number
  ) {
    this.currentTiles = tiles;
    this.tileGrid = buildTileGrid2D(tiles);

    const normUser = connectedAddress?.toLowerCase() ?? "";

    // Update 49-element faction ownership uniform array
    this.tileOwnersInt.fill(0);
    for (const t of tiles) {
      const localId = t.row * 7 + t.col;
      if (localId < 0 || localId >= 49) continue;
      const isUnowned = !t.owner || t.owner.toLowerCase() === ZERO_ADDRESS;
      if (isUnowned) {
        this.tileOwnersInt[localId] = 0;
      } else if (normUser && t.owner.toLowerCase() === normUser) {
        this.tileOwnersInt[localId] = 1;
      } else {
        this.tileOwnersInt[localId] = 2;
      }
    }

    // Topology key (region terrain + building terrace flatten positions)
    const topoKey = tiles
      .map(
        (t) =>
          `${t.id}:${t.terrain}:${t.hasSettlement ? 1 : 0}:${t.structureType}`
      )
      .join("|");

    if (topoKey !== this.lastTopologyKey) {
      this.lastTopologyKey = topoKey;
      this.deleteMesh(this.terrainMesh);
      this.deleteMesh(this.waterMesh);
      this.terrainMesh = this.uploadMesh(buildSculptedTerrainMesh(tiles));
      this.waterMesh = this.uploadMesh(buildOceanWaterMesh(tiles));
    }

    // Props key (settlement tiers, structures, owner colors, visibility toggle, beacon ratio)
    const propsKey =
      `${topoKey}|${normUser}|${showStructures ? 1 : 0}|` +
      tiles
        .map((t) => `${t.owner}:${t.settlementLevel}:${t.structureType}`)
        .join(",") +
      `|${beaconProgressRatio.toFixed(2)}`;

    if (propsKey !== this.lastPropsKey) {
      this.lastPropsKey = propsKey;
      this.deleteMesh(this.propMesh);
      this.deleteMesh(this.effectMesh);
      const built = buildWorldPropsMesh(tiles, connectedAddress, showStructures);
      this.propMesh = this.uploadMesh(built.mesh);
      this.lights = built.lights;
      this.effectMesh = this.uploadMesh(
        buildVolumetricEffectsMesh(tiles, built.smokeSources, beaconProgressRatio)
      );
    }
  }

  private setPointLightUniforms(prog: WebGLProgram) {
    const gl = this.gl;
    const count = Math.min(this.lights.length, 16);
    gl.uniform1i(gl.getUniformLocation(prog, "u_lightCount"), count);
    if (count === 0) return;

    const posArr = new Float32Array(16 * 4);
    const colArr = new Float32Array(16 * 3);
    for (let i = 0; i < count; i++) {
      const l = this.lights[i];
      posArr[i * 4] = l.x;
      posArr[i * 4 + 1] = l.y;
      posArr[i * 4 + 2] = l.z;
      posArr[i * 4 + 3] = l.intensity;
      colArr[i * 3] = l.r;
      colArr[i * 3 + 1] = l.g;
      colArr[i * 3 + 2] = l.b;
    }
    gl.uniform4fv(gl.getUniformLocation(prog, "u_pointLightPos"), posArr);
    gl.uniform3fv(gl.getUniformLocation(prog, "u_pointLightCol"), colArr);
  }

  /**
   * Renders one complete frame (Shadow Map Pass -> Terrain -> Props -> Ocean -> Volumetric Effects).
   */
  renderFrame(
    widthCss: number,
    heightCss: number,
    dpr: number,
    cam: CameraOrbitState,
    timeSec: number,
    selectedLocalTileId: number,
    hoveredLocalTileId: number,
    showBorders: boolean,
    showGrid: boolean
  ) {
    const gl = this.gl;
    const pixelW = Math.max(1, Math.floor(widthCss * dpr));
    const pixelH = Math.max(1, Math.floor(heightCss * dpr));

    if (gl.canvas.width !== pixelW || gl.canvas.height !== pixelH) {
      gl.canvas.width = pixelW;
      gl.canvas.height = pixelH;
    }

    // Compute 3D camera eye position from spherical orbit parameters
    const focusY = cam.targetY ?? 0.85;
    const cosEl = Math.cos(cam.elevation);
    const sinEl = Math.sin(cam.elevation);
    const eyeX = cam.targetX + Math.sin(cam.azimuth) * cosEl * cam.distance;
    const eyeY = focusY + 0.35 + sinEl * cam.distance;
    const eyeZ = cam.targetZ + Math.cos(cam.azimuth) * cosEl * cam.distance;
    const eye: Vec3 = [eyeX, eyeY, eyeZ];
    const target: Vec3 = [cam.targetX, focusY, cam.targetZ];

    perspectiveMat4(
      this.projMat,
      (39 * Math.PI) / 180,
      pixelW / pixelH,
      0.5,
      140.0
    );
    lookAtMat4(this.viewMat, eye, target, [0, 1, 0]);
    multiplyMat4(this.viewProjMat, this.projMat, this.viewMat);
    invertMat4(this.invViewProjMat, this.viewProjMat);

    // ========================================================================
    // PASS 1: 2048x2048 DIRECTIONAL SHADOW MAP
    // ========================================================================
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.viewport(0, 0, this.shadowSize, this.shadowSize);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.shadowProg);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.shadowProg, "u_lightVP"),
      false,
      this.lightVPMat
    );
    gl.uniform1f(gl.getUniformLocation(this.shadowProg, "u_time"), timeSec);

    if (this.terrainMesh) {
      gl.uniform1f(gl.getUniformLocation(this.shadowProg, "u_isPropPass"), 0.0);
      gl.bindVertexArray(this.terrainMesh.vao);
      gl.drawElements(
        gl.TRIANGLES,
        this.terrainMesh.indexCount,
        gl.UNSIGNED_INT,
        0
      );
    }

    if (this.propMesh && this.propMesh.indexCount > 0) {
      gl.uniform1f(gl.getUniformLocation(this.shadowProg, "u_isPropPass"), 1.0);
      gl.bindVertexArray(this.propMesh.vao);
      gl.drawElements(
        gl.TRIANGLES,
        this.propMesh.indexCount,
        gl.UNSIGNED_INT,
        0
      );
    }

    // ========================================================================
    // PASS 2: MAIN SCENE RENDER
    // ========================================================================
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pixelW, pixelH);
    gl.clearColor(0.016, 0.042, 0.052, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);

    // 2A. Sculpted Island Terrain
    if (this.terrainMesh) {
      gl.useProgram(this.terrainProg);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.terrainProg, "u_viewProj"),
        false,
        this.viewProjMat
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.terrainProg, "u_lightVP"),
        false,
        this.lightVPMat
      );
      gl.uniform3fv(gl.getUniformLocation(this.terrainProg, "u_cameraPos"), eye);
      gl.uniform3fv(
        gl.getUniformLocation(this.terrainProg, "u_sunDir"),
        SUN_DIRECTION
      );
      gl.uniform1f(gl.getUniformLocation(this.terrainProg, "u_time"), timeSec);
      gl.uniform1f(
        gl.getUniformLocation(this.terrainProg, "u_tileSize"),
        WORLD_TILE_SIZE
      );
      gl.uniform1i(
        gl.getUniformLocation(this.terrainProg, "u_selectedLocalId"),
        selectedLocalTileId
      );
      gl.uniform1i(
        gl.getUniformLocation(this.terrainProg, "u_hoveredLocalId"),
        hoveredLocalTileId
      );
      gl.uniform1i(
        gl.getUniformLocation(this.terrainProg, "u_showBorders"),
        showBorders ? 1 : 0
      );
      gl.uniform1i(
        gl.getUniformLocation(this.terrainProg, "u_showGrid"),
        showGrid ? 1 : 0
      );
      gl.uniform1iv(
        gl.getUniformLocation(this.terrainProg, "u_tileOwners"),
        this.tileOwnersInt
      );
      gl.uniform1i(gl.getUniformLocation(this.terrainProg, "u_shadowMap"), 0);
      this.setPointLightUniforms(this.terrainProg);

      gl.bindVertexArray(this.terrainMesh.vao);
      gl.drawElements(
        gl.TRIANGLES,
        this.terrainMesh.indexCount,
        gl.UNSIGNED_INT,
        0
      );
    }

    // 2B. Trees, Boulders, Medieval Cottages, Castles & Monuments
    if (this.propMesh && this.propMesh.indexCount > 0) {
      gl.disable(gl.CULL_FACE); // Double-sided roof eaves & pine boughs
      gl.useProgram(this.propProg);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.propProg, "u_viewProj"),
        false,
        this.viewProjMat
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.propProg, "u_lightVP"),
        false,
        this.lightVPMat
      );
      gl.uniform3fv(gl.getUniformLocation(this.propProg, "u_cameraPos"), eye);
      gl.uniform3fv(
        gl.getUniformLocation(this.propProg, "u_sunDir"),
        SUN_DIRECTION
      );
      gl.uniform1f(gl.getUniformLocation(this.propProg, "u_time"), timeSec);
      gl.uniform1i(gl.getUniformLocation(this.propProg, "u_shadowMap"), 0);
      this.setPointLightUniforms(this.propProg);

      gl.bindVertexArray(this.propMesh.vao);
      gl.drawElements(
        gl.TRIANGLES,
        this.propMesh.indexCount,
        gl.UNSIGNED_INT,
        0
      );
    }

    // 2C. Translucent Animated Ocean, Lagoons & Breaking Seafoam
    if (this.waterMesh) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(true);
      gl.useProgram(this.waterProg);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.waterProg, "u_viewProj"),
        false,
        this.viewProjMat
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.waterProg, "u_lightVP"),
        false,
        this.lightVPMat
      );
      gl.uniform3fv(gl.getUniformLocation(this.waterProg, "u_cameraPos"), eye);
      gl.uniform3fv(
        gl.getUniformLocation(this.waterProg, "u_sunDir"),
        SUN_DIRECTION
      );
      gl.uniform1f(gl.getUniformLocation(this.waterProg, "u_time"), timeSec);
      gl.uniform1i(gl.getUniformLocation(this.waterProg, "u_shadowMap"), 0);

      gl.bindVertexArray(this.waterMesh.vao);
      gl.drawElements(
        gl.TRIANGLES,
        this.waterMesh.indexCount,
        gl.UNSIGNED_INT,
        0
      );
    }

    // 2D. Volumetric Crimson Beacon Pillar & Rising Chimney Smoke / Embers
    if (this.effectMesh && this.effectMesh.indexCount > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);

      const camRight: Vec3 = [this.viewMat[0], this.viewMat[4], this.viewMat[8]];
      const camUp: Vec3 = [this.viewMat[1], this.viewMat[5], this.viewMat[9]];

      gl.useProgram(this.effectProg);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.effectProg, "u_viewProj"),
        false,
        this.viewProjMat
      );
      gl.uniform3fv(
        gl.getUniformLocation(this.effectProg, "u_camRight"),
        camRight
      );
      gl.uniform3fv(gl.getUniformLocation(this.effectProg, "u_camUp"), camUp);
      gl.uniform1f(gl.getUniformLocation(this.effectProg, "u_time"), timeSec);

      gl.bindVertexArray(this.effectMesh.vao);
      gl.drawElements(
        gl.TRIANGLES,
        this.effectMesh.indexCount,
        gl.UNSIGNED_INT,
        0
      );

      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Exact 3D Raycast against the sculpted island heightfield & ocean plane.
   * Returns the world tile ID (`tile.id`) and 3D hit coordinates under `(localX, localY)` in CSS pixels.
   */
  pickSurfaceAtScreen(
    localX: number,
    localY: number,
    widthCss: number,
    heightCss: number
  ): { tileId: number | null; wx: number; wy: number; wz: number } | null {
    if (widthCss <= 0 || heightCss <= 0 || this.currentTiles.length === 0) {
      return null;
    }

    const ndcX = (localX / widthCss) * 2 - 1;
    const ndcY = 1 - (localY / heightCss) * 2;
    const { origin, dir } = unprojectRay(this.invViewProjMat, ndcX, ndcY);

    // Raymarch along the view ray from near top of mountain ceiling (Y = 10) down to water (Y = -1)
    const maxDist = 95.0;
    const step = 0.35;
    let prevT = 0;

    for (let t = 2.0; t < maxDist; t += step) {
      const px = origin[0] + dir[0] * t;
      const py = origin[1] + dir[1] * t;
      const pz = origin[2] + dir[2] * t;

      if (Math.abs(px) > 18.0 || Math.abs(pz) > 18.0) {
        prevT = t;
        continue;
      }

      const surfH = Math.max(
        0.0,
        sampleIslandSurface(px, pz, this.tileGrid).height
      );

      if (py <= surfH) {
        // Binary refine intersection in [prevT, t]
        let lo = prevT;
        let hi = t;
        for (let iter = 0; iter < 5; iter++) {
          const mid = (lo + hi) * 0.5;
          const mx = origin[0] + dir[0] * mid;
          const my = origin[1] + dir[1] * mid;
          const mz = origin[2] + dir[2] * mid;
          const mh = Math.max(
            0.0,
            sampleIslandSurface(mx, mz, this.tileGrid).height
          );
          if (my <= mh) hi = mid;
          else lo = mid;
        }
        const hitX = origin[0] + dir[0] * hi;
        const hitZ = origin[2] + dir[2] * hi;
        const hitY = Math.max(
          0.35,
          sampleIslandSurface(hitX, hitZ, this.tileGrid).height
        );
        const cell = worldToGridIndices(hitX, hitZ);
        if (!cell) {
          return { tileId: null, wx: hitX, wy: hitY, wz: hitZ };
        }
        const hitTile = this.tileGrid[cell.row]?.[cell.col];
        if (hitTile) {
          const center = tileCenterWorld(cell.row, cell.col);
          const centerY = Math.max(
            0.45,
            sampleIslandSurface(center.wx, center.wz, this.tileGrid).height
          );
          return {
            tileId: hitTile.id,
            wx: center.wx,
            wy: centerY,
            wz: center.wz,
          };
        }
        return { tileId: null, wx: hitX, wy: hitY, wz: hitZ };
      }
      prevT = t;
    }

    return null;
  }

  pickTileAtScreen(
    localX: number,
    localY: number,
    widthCss: number,
    heightCss: number
  ): number | null {
    const hit = this.pickSurfaceAtScreen(localX, localY, widthCss, heightCss);
    return hit ? hit.tileId : null;
  }

  /**
   * Projects all 49 tile centers to 2D CSS screen coordinates (for optional coordinate labels).
   */
  projectTileCenters(
    widthCss: number,
    heightCss: number
  ): { id: number; sx: number; sy: number; visible: boolean }[] {
    return this.currentTiles.map((t) => {
      const { wx, wz } = tileCenterWorld(t.row, t.col);
      const wy = Math.max(
        0.15,
        sampleIslandSurface(wx, wz, this.tileGrid).height + 0.35
      );
      const p = projectPointToScreen(
        this.viewProjMat,
        wx,
        wy,
        wz,
        widthCss,
        heightCss
      );
      return { id: t.id, sx: p.sx, sy: p.sy, visible: p.visible };
    });
  }

  dispose() {
    const gl = this.gl;
    this.deleteMesh(this.terrainMesh);
    this.deleteMesh(this.waterMesh);
    this.deleteMesh(this.propMesh);
    this.deleteMesh(this.effectMesh);
    gl.deleteFramebuffer(this.shadowFbo);
    gl.deleteTexture(this.shadowTex);
    gl.deleteProgram(this.shadowProg);
    gl.deleteProgram(this.terrainProg);
    gl.deleteProgram(this.propProg);
    gl.deleteProgram(this.waterProg);
    gl.deleteProgram(this.effectProg);
  }
}
