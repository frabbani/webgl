var mathlib = mathlib || {};


function is_scalar(s) {
  return typeof s === 'number'; // && !Number.isInteger(s);
}

function is_vec3(a) {
  if (Array.isArray(a) && a.length == 3) {
    // console.log("    - " + typeof (a[0]) + ' (' + Number.isInteger(a[0]) + ')');
    // console.log("    - " + typeof (a[1]) + ' (' + Number.isInteger(a[1]) + ')');
    // console.log("    - " + typeof (a[2]) + ' (' + Number.isInteger(a[2]) + ')');
    return is_scalar(a[0]) && is_scalar(a[1]) && is_scalar(a[2]);
  }
  return false;
}

function is_vec4(a) {
  if (Array.isArray(a) && a.length == 4) {
    // console.log("    - " + typeof (a[0]) + ' (' + Number.isInteger(a[0]) + ')');
    // console.log("    - " + typeof (a[1]) + ' (' + Number.isInteger(a[1]) + ')');
    // console.log("    - " + typeof (a[2]) + ' (' + Number.isInteger(a[2]) + ')');
    // console.log("    - " + typeof (a[3]) + ' (' + Number.isInteger(a[3]) + ')');
    return is_scalar(a[0]) && is_scalar(a[1]) && is_scalar(a[2]) && is_scalar(a[3]);
  }
  return false;
}


mathlib.vec4 = function () {
  return [0.0, 0.0, 0.0, 0.0];
}

mathlib.vec4set = function (x, y, z, w) {
  if (is_scalar(x) && is_scalar(y) && is_scalar(z) && is_scalar(w))
    return [x, y, z, w];
  return mathlib.vec4();
}

mathlib.vec4dot = function (u, v) {
  if (is_vec4(u) && is_vec4(v))
    return u[0] * v[0] + u[0] * v[0] + u[0] * v[0] + u[0] * v[0];
  return 0.0;
}

mathlib.mat4 = function () {
  return [
    [0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0]
  ];
}

mathlib.mat4ident = function () {
  return [
    [1.0, 0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0],
    [0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 1.0]
  ];
}

mathlib.mat4scale = function (sx, sy, sz) {
  return [
    [sx, 0.0, 0.0, 0.0],
    [0.0, sy, 0.0, 0.0],
    [0.0, 0.0, sz, 0.0],
    [0.0, 0.0, 0.0, 1.0]
  ];
}

function is_mat4(a) {
  if (Array.isArray(a)) {
    if (a.length == 4) {
      // console.log("matrix format:");
      // console.log(" * " + is_vec4(a[0]));
      // console.log(" * " + is_vec4(a[1]));
      // console.log(" * " + is_vec4(a[2]));
      // console.log(" * " + is_vec4(a[3]));
      return is_vec4(a[0]) && is_vec4(a[1]) && is_vec4(a[2]) && is_vec4(a[3]);
    }
  }
  return false;
}

mathlib.mat4mul = function (a, b) {
  if (is_mat4(a)) {
    if (is_mat4(b)) {
      var r = mathlib.mat4();
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++)
          r[i][j] =
            a[i][0] * b[0][j] +
            a[i][1] * b[1][j] +
            a[i][2] * b[2][j] +
            a[i][3] * b[3][j];
      }
      return r;
    }
    else if (is_vec4(b)) {
      var r = mathlib.vec4();
      r[0] = mathlib.vec4dot(a[0], b);
      r[1] = mathlib.vec4dot(a[1], b);
      r[2] = mathlib.vec4dot(a[2], b);
      r[3] = mathlib.vec4dot(a[3], b);
      return r;
    }
  }
  return mathlib.mat4();
}

mathlib.mat4mov = function (v) {
  m = mathlib.mat4ident();
  if (is_vec4(v) || is_vec3(v)) {
    m[0][3] = v[0];
    m[1][3] = v[1];
    m[2][3] = v[2];
  }
  return m;
}

mathlib.mat4rot = function (rads, axisType) {
  var a;
  if (typeof axisType == 'number') {
    axisType = axisType % 3;
    if (axisType < 0) axisType += 3;
    if (axisType == 1) rads = -rads;
    a = axisType;
  }
  else {
    if (axisType == 'x')
      a = 0;
    else if (axisType == 'y') {
      rads = -rads;
      a = 1;
    }
    else if (axisType == 'z')
      a = 2;
    else
      return mathlib.mat4();
  }

  var co = Math.cos(rads);
  var si = Math.sin(rads);

  m = mathlib.mat4ident();
  if (0 == a) {
    m[1][1] = co;
    m[1][2] = -si;
    m[2][1] = si;
    m[2][2] = co;

  } else if (1 == a) {
    m[0][0] = co;
    m[0][2] = -si;
    m[2][0] = si;
    m[2][2] = co;

  } else if (2 == a) {
    m[0][0] = co;
    m[0][1] = -si;
    m[1][0] = si;
    m[1][1] = co;
  }
  return m;
}

mathlib.mat4ortho = function (w, h, minDist, maxDist) {
  var m = mathlib.mat4();
  if (!(is_scalar(w) && is_scalar(h) && is_scalar(minDist) && is_scalar(maxDist)))
    return m;
  // given point <x,y,z,w>, and 4 by 4 matrix mat
  //    | ...,   0,   0,   0 |   | x |   | x' |
  //    |   0,   0, ...,   0 | * | y | = | y' |
  //    |   0,   a,   0,   b |   | z |   | z' |
  //    |   0,   1,   0,   0 |   | 1 |   | w' |
  //
  // x' = x / w
  // y' = z / h
  // z' = a * y + b
  // w' = 1

  var a = 1.0 / maxDist;
  var b = -minDist / maxDist;


  m[0][0] = 2.0 / w;
  m[1][2] = 2.0 / h;
  m[2][1] = a;
  m[2][3] = b;
  m[3][3] = 1.0;
  return m;
}

mathlib.mat4persp = function (aspect, fovRads, minDist, maxDist) {
  var m = mathlib.mat4();
  if (!(is_scalar(aspect) && is_scalar(fovRads) && is_scalar(minDist) && is_scalar(maxDist)))
    return m;
  // given point <x,y,z,w>, and 4 by 4 matrix mat
  //    | ...,   0,   0,   0 |   | x |   | x' |
  //    |   0,   0, ...,   0 | * | y | = | y' |
  //    |   0,   a,   0,   b |   | z |   | z' |
  //    |   0,   1,   0,   0 |   | 1 |   | w' |
  //
  // x' = x / tan( fov/2 )
  // y' = aspect * z / tan( fov/2 )
  // z' = a * y + b
  // w' = y
  //
  // NOTES:
  // z-buffer := z'/w, or z'/y. for min/max distances, we want:
  //    i) ( a * minDist + b ) / minDist = -1
  //   ii) ( a * maxDist + b ) / maxDist = +1
  // solve for a & b (opengl z-buffer ranges from -1 to +1)
  //
  // screen coordinates are signed normalized, so the
  // perspective divide maps x & y values to the -1/1 range, meaning:
  //  -1 <= x'/w <= 1 &
  //  -1 <= y'/w <= 1
  // working in one dimension:
  // let x := sin( theta ), z:= cos( theta ), because look is adj to view angle, right is opp
  // x * D / z = 1, when theta is half of the fov,
  // solving for D, we get D = z/x, or cos( fov/2 ) / sin( fov/2 ), or cotan( fov/2 )

  // solution:
  //
  // 1. a * min + b = min * n,
  // 2. a * max + b = max * f,
  // subtract 2. from 1 and solve for a
  // substitute value of a in 2. & solve for b  

  var zFar = +1.0;
  var zNear = -1.0;
  var a = (zFar * maxDist - zNear * minDist) / (maxDist - minDist);
  var b = (zFar - a) * maxDist;

  var cot = 1.0 / Math.tan(fovRads * 0.5);
  m[0][0] = cot;
  m[1][2] = aspect * cot;
  m[2][1] = a;
  m[2][3] = b;
  m[3][1] = 1.0;
  return m;

}

mathlib.mat4flat = function (a) {
  let r = [];
  let n = 0;
  if (is_mat4(a)) {
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < a[i].length; j++)
        r[n++] = a[j][i];
  }
  else {
    for (let i = 0; i < 16; i++)
      r[n++] = 0.0;
  }
  return r;
}