/* ==========================================================================
   Apeiron Solutions — GlowCursor WebGL Fluid Trail Engine
   ========================================================================== */
export function initCursor() {
  const canvas = document.getElementById('glow-cursor-canvas');
  if (!canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (reduce || coarse) return;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false
  });
  if (!gl) return;

  const MAX_POINTS = 64;
  const V_SHADER = `attribute vec2 position;attribute vec2 uv;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0.0,1.0);}`;
  const F_SHADER = `precision highp float;
    #define MAX_POINTS 64
    uniform vec2 uResolution;uniform vec2 uPoints[MAX_POINTS];uniform float uPointCount;
    uniform vec3 uColor;uniform vec3 uSecondaryColor;uniform float uTrailWidth;uniform float uTaper;
    uniform float uGlowIntensity;uniform float uGlowSpread;uniform float uHotspot;uniform float uBrightness;
    uniform float uOpacity;uniform float uPulseSpeed;uniform float uNoiseStrength;uniform float uNormalBlend;uniform float uTime;uniform float uFade;
    varying vec2 vUv;
    float sRGB(float x){if(x<=0.00031308)return 12.92*x;return 1.055*pow(x,1.0/2.4)-0.055;}
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float filmGrain(vec2 p,float time){
      float frame=time*18.0;float frameIndex=mod(floor(frame),256.0);float nextFrameIndex=mod(frameIndex+1.0,256.0);
      float blend=fract(frame);blend=blend*blend*(3.0-2.0*blend);vec2 pixel=floor(p);
      float current=hash(pixel+vec2(frameIndex*17.0,frameIndex*31.0));
      float next=hash(pixel+vec2(nextFrameIndex*17.0,nextFrameIndex*31.0));
      return mix(current,next,blend)*2.0-1.0;
    }
    void main(){
      vec2 pixel=vUv*uResolution;float denominator=max(uPointCount-1.0,1.0);
      float strongest=0.0;float strongestCore=0.0;float colorWeight=0.0;vec3 colorSum=vec3(0.0);
      for(int i=0;i<MAX_POINTS-1;i++){
        float index=float(i);float active=1.0-step(uPointCount-1.0,index);
        vec2 start=uPoints[i];vec2 end=uPoints[i+1];
        vec2 toPixel=pixel-start;vec2 segment=end-start;
        float along=clamp(dot(toPixel,segment)/max(dot(segment,segment),0.0001),0.0,1.0);
        float progress=clamp((index+along)/denominator,0.0,1.0);
        float life=pow(max(1.0-progress,0.0),mix(0.55,1.25,uTaper));
        float width=uTrailWidth*mix(1.0,0.25,pow(progress,mix(0.55,1.6,uTaper)));
        float distanceToTrail=length(toPixel-segment*along);
        float falloff=max(width*(0.8+uGlowSpread*1.4),0.5);
        float beam=min(1.0,(falloff*falloff)/(distanceToTrail*distanceToTrail+falloff*falloff));
        float core=exp(-pow(distanceToTrail/max(width,0.5),2.0)*2.5);
        float pulseAmount=min(abs(uPulseSpeed),1.0);
        float pulse=1.0+sin(uTime*uPulseSpeed*3.0-progress*11.0)*0.16*pulseAmount;
        float intensity=(core+beam*uGlowIntensity*0.55)*life*pulse*active;
        vec3 segmentColor=mix(uColor,uSecondaryColor,progress);
        strongest=max(strongest,intensity);
        strongestCore=max(strongestCore,core*life*active);
        colorSum+=segmentColor*intensity;
        colorWeight+=intensity;
      }
      float grain=filmGrain(pixel,uTime);
      float noiseAmount=(1.0-exp(-uNoiseStrength*2.2))*0.4;
      float alpha=clamp(strongest*uOpacity*uFade,0.0,1.0);
      if(alpha<0.0005)discard;
      vec3 color=colorSum/max(colorWeight,0.0001);
      color=mix(color,vec3(1.0),smoothstep(0.25,0.95,strongestCore)*uHotspot);
      float luminance=sRGB(clamp(strongest*uBrightness,0.0,1.0))*(1.0+grain*noiseAmount);
      vec3 additiveColor=color*luminance;
      float normalAlpha=clamp(strongest*uBrightness*uOpacity*uFade,0.0,1.0);
      vec3 normalColor=mix(color,vec3(1.0),smoothstep(0.45,1.0,strongestCore)*uHotspot*0.35);
      gl_FragColor=vec4(mix(additiveColor,normalColor,uNormalBlend),mix(alpha,normalAlpha,uNormalBlend));
    }`;

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }
  const vs = compileShader(V_SHADER, gl.VERTEX_SHADER);
  const fs = compileShader(F_SHADER, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uResolution');
  const uPts = gl.getUniformLocation(prog, 'uPoints');
  const uCnt = gl.getUniformLocation(prog, 'uPointCount');
  const uCol = gl.getUniformLocation(prog, 'uColor');
  const uSecCol = gl.getUniformLocation(prog, 'uSecondaryColor');
  const uWidth = gl.getUniformLocation(prog, 'uTrailWidth');
  const uTaperLoc = gl.getUniformLocation(prog, 'uTaper');
  const uGI = gl.getUniformLocation(prog, 'uGlowIntensity');
  const uGS = gl.getUniformLocation(prog, 'uGlowSpread');
  const uHS = gl.getUniformLocation(prog, 'uHotspot');
  const uB = gl.getUniformLocation(prog, 'uBrightness');
  const uOp = gl.getUniformLocation(prog, 'uOpacity');
  const uPS = gl.getUniformLocation(prog, 'uPulseSpeed');
  const uNS = gl.getUniformLocation(prog, 'uNoiseStrength');
  const uNB = gl.getUniformLocation(prog, 'uNormalBlend');
  const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
  const uFadeLoc = gl.getUniformLocation(prog, 'uFade');

  const config = {
    color: [0.40392, 0.90980, 0.97647],       // #67E8F9
    secondaryColor: [0.65490, 0.54510, 0.98039], // #A78BFA
    trailLength: 37,
    trailWidth: 2,
    trailTaper: 0.8,
    followSpeed: 0.25,
    glowIntensity: 1.15,
    glowSpread: 1.2,
    hotspot: 0.52,
    brightness: 1.25,
    opacity: 1.0,
    pulseSpeed: 1.1,
    noiseStrength: 0.035,
    idleFade: true,
    idleTimeout: 700,
    fadeDuration: 900,
    blendMode: 'screen',
    maxDevicePixelRatio: 1.5
  };

  const pointData = new Float32Array(MAX_POINTS * 2);
  const points = Array.from({ length: MAX_POINTS }, () => ({ x: 0, y: 0 }));
  const target = { x: 0, y: 0 };
  const head = { x: 0, y: 0 };
  let initialized = false;
  let pointerInside = false;
  let fade = 0;
  let lastInputTime = performance.now();
  let lastFrameTime = performance.now();

  function resize() {
    const pr = Math.min(window.devicePixelRatio || 1, config.maxDevicePixelRatio);
    canvas.width = Math.round(innerWidth * pr);
    canvas.height = Math.round(innerHeight * pr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let animating = false;

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const pr = Math.min(window.devicePixelRatio || 1, config.maxDevicePixelRatio);
    const x = e.clientX * pr;
    const y = (innerHeight - e.clientY) * pr;
    if (!initialized) {
      head.x = target.x = x;
      head.y = target.y = y;
      points.forEach(p => { p.x = x; p.y = y; });
      initialized = true;
      fade = 1;
    }
    target.x = x;
    target.y = y;
    pointerInside = true;
    lastInputTime = performance.now();
    if (!animating) {
      animating = true;
      lastFrameTime = performance.now();
      requestAnimationFrame(render);
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    pointerInside = false;
    lastInputTime = performance.now();
  });

  function render(now) {
    if (document.hidden) {
      animating = false;
      return;
    }
    const delta = Math.min((now - lastFrameTime) / 16.667, 3);
    lastFrameTime = now;

    if (initialized) {
      const headEase = 1 - Math.pow(1 - Math.min(Math.max(config.followSpeed, 0.01), 0.99), delta);
      const chainBase = Math.min(Math.max(0.28 + config.followSpeed * 0.35, 0.08), 0.92);
      const chainEase = 1 - Math.pow(1 - chainBase, delta);
      head.x += (target.x - head.x) * headEase;
      head.y += (target.y - head.y) * headEase;
      points[0].x = head.x;
      points[0].y = head.y;
      for (let i = 1; i < MAX_POINTS; i++) {
        points[i].x += (points[i - 1].x - points[i].x) * chainEase;
        points[i].y += (points[i - 1].y - points[i].y) * chainEase;
      }
      for (let i = 0; i < MAX_POINTS; i++) {
        pointData[i * 2] = points[i].x;
        pointData[i * 2 + 1] = points[i].y;
      }
    }

    const idleFor = now - lastInputTime;
    const shouldFade = config.idleFade && (!pointerInside || idleFor > config.idleTimeout);
    const fadeStep = (16.667 * delta) / Math.max(config.fadeDuration, 16);
    const fadeTarget = (initialized && !shouldFade) ? 1 : 0;
    fade += (fadeTarget - fade) * Math.min(1, fadeStep * 7);

    if (fade < 0.001) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      animating = false;
      return;
    }

    const pr = Math.min(window.devicePixelRatio || 1, config.maxDevicePixelRatio);
    gl.useProgram(prog);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2fv(uPts, pointData);
    gl.uniform1f(uCnt, config.trailLength);
    gl.uniform3fv(uCol, config.color);
    gl.uniform3fv(uSecCol, config.secondaryColor);
    gl.uniform1f(uWidth, Math.max(config.trailWidth * pr, 0.1));
    gl.uniform1f(uTaperLoc, config.trailTaper);
    gl.uniform1f(uGI, config.glowIntensity);
    gl.uniform1f(uGS, config.glowSpread);
    gl.uniform1f(uHS, config.hotspot);
    gl.uniform1f(uB, config.brightness);
    gl.uniform1f(uOp, config.opacity);
    gl.uniform1f(uPS, config.pulseSpeed);
    gl.uniform1f(uNS, config.noiseStrength);
    gl.uniform1f(uNB, config.blendMode === 'normal' ? 1.0 : 0.0);
    gl.uniform1f(uTimeLoc, now * 0.001);
    gl.uniform1f(uFadeLoc, fade);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (animating) {
      requestAnimationFrame(render);
    }
  }

  // Wake on visibility restore
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pointerInside && !animating) {
      animating = true;
      lastFrameTime = performance.now();
      requestAnimationFrame(render);
    }
  });
}
