import * as THREE from "three";

// Discrete palette, stepped wave silhouettes, and grid-aligned ripple clusters.
export function createWater(width, level) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      size: { value: new THREE.Vector2(width, level + 8) },
    },
    vertexShader: `varying vec2 uvWater;
      void main(){ uvWater=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `precision mediump float;
      varying vec2 uvWater; uniform float time; uniform vec2 size;
      void main(){
        vec2 p=floor(uvWater*size/3.0)*3.0;
        float tick=floor(time*6.0)/6.0;
        float wave=size.y-8.0+floor(sin(p.x*.018+tick)*1.5)*3.0;
        float depth=wave-p.y;
        if(depth<0.0) discard;
        vec3 color=depth<15.0 ? vec3(.19,.43,.45) :
          depth<40.0 ? vec3(.14,.37,.40) : vec3(.11,.30,.35);
        if(depth<3.0) color=vec3(.57,.68,.60);
        float row=floor(depth/12.0);
        float cell=floor((p.x+row*37.0)/36.0);
        float noise=fract(sin(cell*127.1+row*311.7)*43758.5453);
        float segment=mod(p.x+row*37.0+floor(tick*3.0)*3.0,36.0);
        if(mod(depth,12.0)<3.0 && noise>.7 && segment<15.0){
          color=vec3(.32,.53,.54);
          if(abs(p.x-size.x*.73)<65.0+depth*.7 && noise>.65)
            color=vec3(.86,.65,.43);
        }
        gl_FragColor=vec4(color,1.0);
      }`,
  });
  const baseHeight = level + 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, baseHeight),
    material,
  );
  mesh.position.set(width / 2, baseHeight / 2, 22);
  mesh.userData.update = (time) => {
    material.uniforms.time.value = time;
  };
  // Sudden death lifts the same plane; the shader reads the new surface height.
  mesh.userData.setLevel = (nextLevel) => {
    const height = nextLevel + 8;
    mesh.scale.y = height / baseHeight;
    mesh.position.y = height / 2;
    material.uniforms.size.value.y = height;
  };
  return mesh;
}
