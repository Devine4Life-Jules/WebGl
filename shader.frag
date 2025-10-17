precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform float iWalkSpeed;
uniform float iArmSwing;
uniform vec3 iCameraPos;
uniform float iShakeIntensity;

const int maxSteps = 64;
const float hitThreshold = 0.001;
const int shadowSteps = 64;
const float PI = 3.14159;

float _union(float a, float b) { return min(a, b); }
float intersect(float a, float b) { return max(a, b); }
float difference(float a, float b) { return max(a, -b); }

vec3 rotateX(vec3 p, float a) {
  float sa = sin(a), ca = cos(a);
  return vec3(p.x, ca*p.y - sa*p.z, sa*p.y + ca*p.z);
}
vec3 rotateY(vec3 p, float a) {
  float sa = sin(a), ca = cos(a);
  return vec3(ca*p.x + sa*p.z, p.y, -sa*p.x + ca*p.z);
}
vec3 rotateZ(vec3 p, float a) {
  float sa = sin(a), ca = cos(a);
  return vec3(ca*p.x - sa*p.y, sa*p.x + ca*p.y, p.z);
}

mat4 lookAt(vec3 eye, vec3 center, vec3 up) {
  vec3 z = normalize(eye - center);
  vec3 y = up;
  vec3 x = cross(y, z);
  y = cross(z, x);
  x = normalize(x);
  y = normalize(y);
  mat4 rm = mat4(
    x.x, y.x, z.x, 0.0,
    x.y, y.y, z.y, 0.0,
    x.z, y.z, z.z, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
  mat4 tm = mat4(1.0);
  tm[3] = vec4(-eye, 1.0);
  return rm * tm;
}

float sdPlane(vec3 p, vec4 n) { return dot(p, n.xyz) + n.w; }
float sdBox(vec3 p, vec3 b) {
  vec3 di = abs(p) - b;
  float mc = max(di.x, max(di.y, di.z));
  return min(mc, length(max(di, 0.0)));
}
float sphere(vec3 p, float r) { return length(p) - r; }
float hash(float n) { return fract(sin(n)*43758.5453123); }

float noise(float p) {
  float i = floor(p);
  float f = fract(p);
  float u = f*f*(3.0-2.0*f);
  return mix(hash(i), hash(i+1.0), u);
}

vec3 target = vec3(0.0);
mat4 headMat;

float scene(vec3 p) {
  float t = iTime*iWalkSpeed;
  float d = sdPlane(p, vec4(0, 1, 0, 1)); 
  p.y -= cos(t*2.0)*0.1;

  vec3 hp = p - vec3(0.0, 4.0, 0.0);
  hp = (vec4(hp, 1.0)*headMat).xyz;
  d = _union(d, sdBox(hp, vec3(1.5, 1.0, 1.0)));

  // Eye scaling: blink animation + shake effect (makes eyes bigger when shaking)
  vec3 eyeScale = vec3(1.0);
  eyeScale.y *= 1.0 - smoothstep(0.8, 1.0, noise(t*5.0)); // Blink
  
  // Increase eye size during shake (multiply radius by 1 + shake intensity)
  float eyeRadius = 0.15 * (1.0 + iShakeIntensity * 2.0); // 2.0 = multiplier for effect strength
  d = difference(d, sphere((hp - vec3(0.6, 0.2, 1.0))/eyeScale, eyeRadius));
  d = difference(d, sphere((hp - vec3(-0.6, 0.2, 1.0))/eyeScale, eyeRadius));

  // Mouth with shake effect - opens wider when shaking
  float mouthHeight = 0.05 + iShakeIntensity * 0.4; // Base 0.05, grows to ~0.25 at peak shake
  if (iMouse.z > 0.0)
    d = difference(d, sdBox(hp - vec3(0.0, -0.4, 1.0), vec3(0.2, 0.1, 0.1)));
  else
    d = difference(d, sdBox(hp - vec3(0.0, -0.4, 1.0), vec3(0.25, mouthHeight, 0.1)));

  vec3 bp = p;
  bp = rotateY(bp, -target.x*0.05);
  d = _union(d, sdBox(bp - vec3(0.0, 2.0, 0.0), vec3(0.8, 1.0, 0.5)));

  float arz = -noise(t*0.3);
  vec3 a1 = rotateZ(rotateX(bp- vec3(1.2, 2.0+0.7, 0.0), sin(t)*iArmSwing), arz) + vec3(0, 1.0, 0);
  vec3 a2 = rotateZ(rotateX(bp- vec3(-1.2, 2.0+0.7, 0.0), sin(t+PI)*iArmSwing), -arz) + vec3(0, 1.0, 0);
  d = _union(d, sdBox(a1, vec3(0.25, 1.0, 0.25)));
  d = _union(d, sdBox(a2, vec3(0.25, 1.0, 0.25)));

  vec3 l1 = rotateX(p - vec3(0.5, 1.2, 0.0), -sin(t)*iArmSwing*0.66) + vec3(0.0, 1.2, 0.0);
  vec3 l2 = rotateX(p - vec3(-0.5, 1.2, 0.0), -sin(t+PI)*iArmSwing*0.66) + vec3(0.0, 1.2, 0.0);
  d = _union(d, sdBox(l1, vec3(0.3, 1.0, 0.5)));
  d = _union(d, sdBox(l2, vec3(0.3, 1.0, 0.5)));
  return d;
}

vec3 sceneNormal(in vec3 pos) {
  float eps = 0.0001;
  float d = scene(pos);
  vec3 n = vec3(
    scene(pos + vec3(eps, 0, 0)) - d,
    scene(pos + vec3(0, eps, 0)) - d,
    scene(pos + vec3(0, 0, eps)) - d
  );
  return normalize(n);
}

float ambientOcclusion(vec3 p, vec3 n) {
  const int steps = 4;
  const float delta = 0.5;
  float a = 0.0, weight = 1.0;
  for (int i=1; i<=steps; i++) {
    float d = (float(i) / float(steps)) * delta; 
    a += weight * (d - scene(p + n*d));
    weight *= 0.5;
  }
  return clamp(1.0 - a, 0.0, 1.0);
}

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float dt = (maxt - mint) / float(shadowSteps);
  float t = mint + hash(ro.z*574854.0 + ro.y*517.0 + ro.x)*0.1;
  float res = 1.0;
  for (int i=0; i<shadowSteps; i++) {
    float h = scene(ro + rd*t);
    if (h < hitThreshold) return 0.0;
    res = min(res, k*h/t);
    t += dt;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 trace(vec3 ro, vec3 rd, out bool hit) {
  hit = false;
  vec3 pos = ro;
  for (int i=0; i<maxSteps; i++) {
    float d = scene(pos);
    if (abs(d) < hitThreshold) {
      hit = true;
      break;
    }
    pos += d * rd;
  }
  return pos;
}

vec3 shade(vec3 pos, vec3 n, vec3 eyePos) {
  float ao = ambientOcclusion(pos, n);
  vec3 sky = mix(vec3(0.5, 0.2, 0.0), vec3(0.6, 0.8, 1.0), n.y*0.5+0.5);
  vec3 c = sky*0.5*ao;
  const vec3 lightPos = vec3(5.0, 5.0, 5.0);
  const vec3 lightColor = vec3(0.5, 0.5, 0.1);
  vec3 l = lightPos - pos;
  float dist = length(l);
  l /= dist;
  float diff = max(0.0, dot(n, l));
  float shadow = softShadow(pos, l, 0.1, dist, 5.0);
  diff *= shadow;
  c += diff * lightColor;
  return c;
}

vec3 background(vec3 rd) {
  return mix(vec3(0.5, 0.2, 0.0), vec3(0.8, 0.8, 1.0), rd.y*0.5+0.5);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 pixel = (fragCoord / iResolution.xy)*2.0 - 1.0;
  float asp = iResolution.x / iResolution.y;
  vec3 rd = normalize(vec3(asp*pixel.x, pixel.y, -2.0));
  vec3 ro = iCameraPos;

  vec2 mouse = iMouse.xy / iResolution.xy;
  float roty = 0.0;
  float rotx = 0.0;

  rd = rotateX(rd, rotx);
  ro = rotateX(ro, rotx);
  rd = rotateY(rd, roty);
  ro = rotateY(ro, roty);

  if (iMouse.z > 0.0)
    target = vec3(mouse*10.0-5.0, -10.0);
  else
    target = vec3(noise(iTime*0.5)*10.0-5.0, noise(iTime*0.5+250673.0)*8.0-4.0, -10.0);

  headMat = lookAt(vec3(0.0), target, vec3(0.0, 1.0, 0.0));

  bool hit;
  vec3 pos = trace(ro, rd, hit);
  vec3 rgb = hit ? shade(pos, sceneNormal(pos), ro) : background(rd);
  gl_FragColor = vec4(rgb, 1.0);
}
