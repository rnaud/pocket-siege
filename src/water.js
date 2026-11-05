import * as THREE from "three";

// One lightweight shader: scalloped waves, drifting caustics and tiny bubbles.
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
        vec2 p=uvWater*size;
        float wave=size.y-8.0+2.5*sin(p.x*.025+time*1.5)+1.2*sin(p.x*.057-time);
        float depth=wave-p.y;
        if(depth<0.0) discard;
        vec3 color=mix(vec3(.035,.35,.48),vec3(.19,.79,.75),exp(-depth*.035));
        float ripples=sin(p.x*.045+sin(p.y*.12+time)*1.8+time)*sin(p.y*.24-time*1.1);
        color+=vec3(.12,.20,.16)*pow(max(0.0,ripples),8.0);
        float foam=1.0-smoothstep(1.0,3.6,depth);
        color=mix(color,vec3(.83,1.0,.87),foam*.85);
        vec2 cell=vec2(mod(p.x+sin(time+p.y*.03)*3.0,71.0)-35.5,mod(p.y-time*5.0,31.0)-15.5);
        float bubble=(1.0-smoothstep(.5,1.1,abs(length(cell)-2.0)))*.25;
        color+=bubble;
        gl_FragColor=vec4(color,.88);
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
