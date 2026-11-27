const n=`const fragmentShader = glsl\`
  precision mediump float;
  uniform float time;
  uniform vec2 resolution;

  vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.3, 0.6)));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec3 color = palette(uv.x + time * 0.1);
    gl_FragColor = vec4(color, 1.0);
  }
\`;
`;export{n as default};
