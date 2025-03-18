import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// ---------------------------
// 1) 顶点着色器 (vertex shader)
// ---------------------------
const VERTEX_SHADER = `
    void main() {
        gl_Position = vec4(position, 1.0);
    }
`;

// ---------------------------
// 2) 片元着色器 (fragment shader)
//    这里就是你提供的那一大段代码
// ---------------------------
const FRAGMENT_SHADER = `
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform sampler2D u_noise;
  
  #define PI 3.141592653589793
  #define TAU 6.
  
  const float multiplier = 25.5;
  const float zoomSpeed = 10.;
  const int layers = 10;
  const int octaves = 5;

  vec2 hash2(vec2 p)
  {
    vec2 o = texture2D(u_noise, (p + 0.5)/256.0).xy;

    return o;
  }
  
  mat2 rotate2d(float _angle){
      return mat2(cos(_angle), sin(_angle),
                  -sin(_angle), cos(_angle));
  }
  
  vec3 hsb2rgb(in vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
                             6.0)-3.0)-1.0,
                     0.0,
                     1.0);
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
  }
  
  float hash(vec2 p)
  {
    float o = texture2D(u_noise, (p+0.5)/256.0, -100.0).x;
    return o;
  }
  
  float noise(vec2 uv) {
    vec2 id = floor(uv);
    vec2 subuv = fract(uv);
    vec2 u = subuv * subuv * (3. - 2. * subuv);
    float a = hash(id);
    float b = hash(id + vec2(1., 0.));
    float c = hash(id + vec2(0., 1.));
    float d = hash(id + vec2(1., 1.));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  
  float fbm(in vec2 uv) {
    float s = .0;
    float m = .0;
    float a = .5;
    for(int i = 0; i < octaves; i++) {
      s += a * noise(uv);
      m += a;
      a *= .5;
      uv *= 2.;
    }
    return s / m;
  }
  
  vec3 domain(vec2 z){
    return vec3(hsb2rgb(vec3(atan(z.y,z.x)/TAU,1.,1.)));
  }
  
  vec3 colour(vec2 z) {
    return domain(z);
  }
  
  vec3 render(vec2 uv, float scale, vec3 colour) {
    vec2 id = floor(uv);
    vec2 subuv = fract(uv);
    vec2 rand = hash2(id);
    float bokeh = abs(scale) * 1.;
    
    float particle = 0.;
    
    if(length(rand) > 1.3) {
      vec2 pos = subuv - .5;
      float field = length(pos);
      particle = smoothstep(.3, 0., field);
      particle += smoothstep(.4, 0.34 * bokeh, field);
    }
    return vec3(particle*2.);
  }
  
  vec3 renderLayer(int layer, int layers, vec2 uv, inout float opacity, vec3 colour, float n) {
    vec2 _uv = uv;
    // scale
    float scale = mod((u_time + zoomSpeed / float(layers) * float(layer)) / zoomSpeed, -1.);
    uv *= 20.;
    uv *= scale*scale;
    uv = rotate2d(u_time / 10.) * uv;
    uv += vec2(25. + sin(u_time*.1)) * float(layer);
    
    vec3 pass = render(uv * multiplier, scale, colour) * .2;
    
    opacity = 1. + scale;
    float _opacity = opacity;
    
    float endOpacity = smoothstep(0., 0.4, scale * -1.);
    opacity += endOpacity;
    
    return pass * _opacity * endOpacity;
  }

  void main() {
    // 把像素坐标变成 [-something, +something]
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy);

    if(u_resolution.y < u_resolution.x) {
      uv /= u_resolution.y;
    } else {
      uv /= u_resolution.x;
    }

    float n = fbm((uv + vec2(sin(u_time*.1), u_time*.1)) * 2. - 2.);
    
    vec3 colour = vec3(0.);
    colour = n * mix(vec3(0., .5, 1.5), clamp(vec3(1., .5, .25)*2., 0., 1.), n);
    
    float opacity = 1.;
    float opacity_sum = 1.;

    for(int i = 1; i <= layers; i++) {
      colour += renderLayer(i, layers, uv, opacity, colour, n);
      opacity_sum += opacity;
    }

    colour /= opacity_sum;
    gl_FragColor = vec4(clamp(colour * 20., 0., 1.), 1.0);
  }
`;

export default function ThreeBG() {
  const containerRef = useRef(null); // 用于挂载Three.js渲染器
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  // 纹理加载只需一次
  const textureRef = useRef(null);

  // 用 useEffect 处理三步：
  // 1) 加载纹理
  // 2) 初始化 Three.js
  // 3) 开启动画循环
  useEffect(() => {
    // ============ 1) 先加载 noise 纹理 ============
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('');
    loader.load(
      'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png',
      (tex) => {
        textureRef.current = tex;
        textureRef.current.wrapS = THREE.RepeatWrapping;
        textureRef.current.wrapT = THREE.RepeatWrapping;
        textureRef.current.minFilter = THREE.LinearFilter;

        // 纹理就绪后再初始化场景
        initScene();
      },
      undefined,
      (err) => {
        console.error('Texture loading error:', err);
      }
    );

    return () => {
      // 组件卸载时做清理
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  function initScene() {
    // 获取容器
    const container = containerRef.current;
    if (!container) return;

    // 创建场景、相机、渲染器
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    camera.position.z = 1;
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    // 把 renderer canvas 放进DOM
    container.appendChild(renderer.domElement);

    // 存refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // 创建 uniforms
    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_noise: { value: textureRef.current }, // 噪声纹理
    };

    // 用一个2x2平面来承载全屏shader
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 调整尺寸
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    }
    onResize();
    window.addEventListener('resize', onResize);

    // 监听鼠标移动 => 更新u_mouse
    function onPointerMove(e) {
      // 这里把坐标转到 [-0.5, 0.5] 之间，可以按需调整
      const w = container.clientWidth;
      const h = container.clientHeight;
      const x = (e.clientX / w) - 0.5;
      const y = (e.clientY / h) - 0.5;
      uniforms.u_mouse.value.set(x, -y);
    }
    window.addEventListener('pointermove', onPointerMove);

    // 动画循环
    let startTime = performance.now();
    let animationId;
    function animate(now) {
      animationId = requestAnimationFrame(animate);
      const elapsed = now - startTime;
      uniforms.u_time.value = elapsed * 0.001;
      renderer.render(scene, camera);
    }
    animate();

    // 卸载时清理
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }

  // 容器样式：保证有宽高，否则看不到
  // 你可以改成 position:absolute; z-index: -1; 放到背面
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
}
