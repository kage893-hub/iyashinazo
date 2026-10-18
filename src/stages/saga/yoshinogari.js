import * as THREE from 'three';
import { add, G, group, mat, canvasTex, rng } from '../../lib/util.js';
import { rod } from './site-details.js';

// 吉野ヶ里歴史公園の復元建物を組み合わせた縮景。実際の園内配置や縮尺ではない。
// 正面は+z。外周27×25の中へ、南内郭の物見櫓・竪穴住居と倉を置く。
// 参照した公式写真・再現範囲は docs/saga-yoshinogari-references.md。
export const YOSHINOGARI_SIZE = Object.freeze({ w: 27, d: 25 });
const FLOOR = .42;
const C = {
  wood: '#81725b', cut: '#a1967a', dark: '#554c3d', rail: '#95886e',
  wall: '#877c62', earth: '#a49676', slope: '#94866a', ditch: '#73684f',
  grass: '#99aa72', straw: '#91826b', ridge: '#6e604d', rope: '#c4b99b',
};
const box = (p, w, h, d, color, x, y, z, opt) => add(p, G.sharpBox(w,h,d), mat(color), x,y,z,opt);

let strawMaterial;
function thatchMaterial() {
  if (strawMaterial) return strawMaterial;
  const texture = canvasTex(512,512,(c,W,H) => {
    const r = rng(716492);
    c.fillStyle = C.straw; c.fillRect(0,0,W,H);
    // 茅の細い束。写真を使わず、屋根の傾斜に沿う縦の繊維を描く。
    for (let i=0;i<5500;i++) {
      const x=r()*W,y=r()*H,l=3+r()*24;
      c.strokeStyle=i%3===0?'rgba(39,35,27,.19)':'rgba(219,207,174,.20)';
      c.lineWidth=.45+r()*.65; c.beginPath(); c.moveTo(x,y);c.lineTo(x+(r()-.5)*3,y+l);c.stroke();
    }
  });
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  strawMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:1});
  return strawMaterial;
}

function faceGeometry(faces) {
  const positions=[],uv=[];
  for (const f of faces) {
    for (let i=1;i<f.length-1;i++) for (const p of [f[0],f[i],f[i+1]]) {
      positions.push(...p); uv.push((p[0]+p[2]*.31)*.33,p[1]*.4);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.computeVertexNormals(); return g;
}

/** 棟がx方向に走る厚い寄棟。底面の茅の小口も閉じて、下から見た穴を作らない。 */
function hipRoof(parent,{w,d,eave,rise,ridge=w*.37}) {
  const x=w/2,z=d/2,t=.17;
  const a=[-x,eave,-z],b=[x,eave,-z],c=[x,eave,z],e=[-x,eave,z];
  const r0=[-ridge/2,eave+rise,0],r1=[ridge/2,eave+rise,0];
  const g=group(parent);
  add(g,faceGeometry([[a,r0,r1,b],[b,r1,c],[c,r1,r0,e],[e,r0,a]]),thatchMaterial());
  const skirt = [[a,b],[b,c],[c,e],[e,a]].map(([u,v])=>[u,v,[v[0],v[1]-t,v[2]],[u[0],u[1]-t,u[2]]]);
  add(g,faceGeometry(skirt),mat(C.ridge));
  rod(g,[-ridge*.58,eave+rise+.05,0],[ridge*.58,eave+rise+.05,0],.10,mat(C.ridge));
  // 厚く積んだ棟の押さえ木と縄。屋根面へ沿わせ、突き抜けない。
  for (let j=0;j<4;j++) {
    const zz=(j+1)*.11,yy=eave+rise-zz/(d/2)*rise+.07;
    for (const side of [-1,1]) rod(g,[-ridge*.60,yy,side*zz],[ridge*.60,yy,side*zz],.042,mat(C.wood));
  }
  for (let i=0;i<7;i++) {
    const xx=-ridge*.55+i*ridge*1.1/6;
    const sideY=eave+rise-.46/(d/2)*rise+.11;
    for(const side of [-1,1]) rod(g,[xx,sideY,side*.46],[xx,eave+rise+.18,0],.025,mat(C.rope));
  }
  return g;
}

function gableRoof(parent,{w,d,eave,rise}) {
  const x=w/2,z=d/2,y=eave,top=y+rise,t=.14;
  add(parent,faceGeometry([
    [[-x,y,z],[0,top,z],[0,top,-z],[-x,y,-z]],
    [[x,y,-z],[0,top,-z],[0,top,z],[x,y,z]],
    [[x,y-t,z],[x,y,z],[0,top,z],[-x,y,z],[-x,y-t,z]],
    [[-x,y-t,-z],[-x,y,-z],[0,top,-z],[x,y,-z],[x,y-t,-z]],
  ]),thatchMaterial());
  // 木の垂木は茅の上へごく少し出す。軒先から棟まで同じ傾斜。
  for (let zz=-z+.18;zz<=z-.1;zz+=.5) for (const side of [-1,1])
    rod(parent,[side*(x+.04),y+.08,zz],[0,top+.08,zz],.035,mat(C.wood));
  rod(parent,[0,top+.08,-z-.1],[0,top+.08,z+.1],.07,mat(C.ridge));
}

function rail(parent,a,b,height=1.0) {
  for (let i=0;i<5;i++) rod(parent,[a[0],a[1]+.18+i*height/4,a[2]],[b[0],b[1]+.18+i*height/4,b[2]],.035,mat(C.rail));
  const length=Math.hypot(b[0]-a[0],b[2]-a[2]),n=Math.ceil(length/.9);
  for (let i=0;i<=n;i++) {
    const s=i/n,x=THREE.MathUtils.lerp(a[0],b[0],s),z=THREE.MathUtils.lerp(a[2],b[2],s);
    add(parent,G.cyl(.055,.065,height+.3,7),mat(C.wood),x,a[1]+height/2+.1,z);
  }
}

function watchtower(parent,x,z,scale=1) {
  const root=group(parent,x,FLOOR,z);root.scale.setScalar(scale);root.name='吉野ヶ里・物見櫓';
  const deck=5.7,w=4.0,d=3.5;
  for (const xx of [-1.45,1.45]) for (const zz of [-1.1,1.1]) {
    add(root,G.cyl(.13,.19,6.1,10),mat(C.wood),xx,3.05,zz);
    add(root,G.cyl(.155,.155,.12,10),mat(C.cut),xx,6.13,zz);
  }
  for (const y of [2.3,4.15,5.48]) {
    for (const zz of [-1.1,1.1]) rod(root,[-1.62,y,zz],[1.62,y,zz],.095,mat(C.dark));
    for (const xx of [-1.45,1.45]) rod(root,[xx,y,-1.3],[xx,y,1.3],.095,mat(C.wood));
  }
  box(root,w,.22,d,C.dark,0,deck-.13,0);
  for (let xx=-1.88;xx<1.9;xx+=.25) box(root,.23,.075,d-.08,C.wall,xx,deck+.025,0);
  for (const zz of [-d/2+.08,d/2-.08]) rail(root,[-w/2+.08,deck,zz],[w/2-.08,deck,zz]);
  for (const xx of [-w/2+.08,w/2-.08]) rail(root,[xx,deck,-d/2+.08],[xx,deck,d/2-.08]);
  for (const xx of [-1.45,1.45]) for (const zz of [-1.1,1.1]) add(root,G.cyl(.08,.10,1.6,8),mat(C.wood),xx,deck+.8,zz);
  hipRoof(root,{w:4.65,d:4.15,eave:deck+1.5,rise:2.0,ridge:1.5});
  // 櫓の梯子は内側へ。近景の正面に斜材のかたまりを置かない。
  rod(root,[.65,.12,-.65],[.65,deck,-.95],.045,mat(C.wood));
  rod(root,[1.18,.12,-.65],[1.18,deck,-.95],.045,mat(C.wood));
  for (let i=1;i<19;i++) {
    const h=i*deck/19;
    rod(root,[.65,h,-.65-h/deck*.3],[1.18,h,-.65-h/deck*.3],.028,mat(C.cut));
  }
  return root;
}

function pitDwelling(parent,x,z,w,d,ry=0) {
  const root=group(parent,x,FLOOR,z,ry);root.name='吉野ヶ里・竪穴住居';
  const h=w*.58;
  box(root,w*.79,.7,d*.77,C.wall,0,.39,0);
  hipRoof(root,{w,d,eave:.32,rise:h,ridge:w*.35});
  // 土際から続く厚い屋根の、低い入口。庇と戸は別の面にする。
  const porch=group(root,0,0,d*.39);
  box(porch,1.05,1.34,.65,C.dark,0,.68,.18);
  box(porch,.77,1.24,.06,'#4f4638',0,.64,.54);
  for (const xx of [-.27,-.09,.09,.27]) box(porch,.13,1.15,.035,C.wall,xx,.61,.59);
  gableRoof(porch,{w:1.45,d:1.55,eave:1.26,rise:.60});
  for (const xx of [-.50,.50]) rod(porch,[xx,.05,.63],[xx,1.35,.63],.055,mat(C.wood));
  box(porch,1.0,.10,.6,C.earth,0,.05,.88);
  // 写真の棟を押さえる段状の木組み。
  for (const side of [-1,1]) for (let i=0;i<5;i++) {
    const zz=side*(.15+i*.145),yy=.32+h-(i*.145/d*2)*h+.09;
    rod(root,[-w*.23,yy,zz],[w*.23,yy,zz],.034,mat(C.wood));
  }
  return root;
}

function granary(parent,x,z,ry=0) {
  const root=group(parent,x,FLOOR,z,ry);root.name='吉野ヶ里・高床倉庫';
  const w=3.1,d=3.2,floor=1.65;
  for (const xx of [-1.12,1.12]) for (const zz of [-1.05,1.05]) {
    add(root,G.cyl(.14,.19,floor+2,8),mat(C.wood),xx,(floor+2)/2,zz);
    // 鼠返しは四隅の柱の上。床より下なので倉の壁へ浮かない。
    box(root,.62,.08,.62,C.cut,xx,1.46,zz);
  }
  box(root,w,.18,d,C.dark,0,floor,0);
  box(root,w,1.9,d,C.wall,0,floor+1.03,0);
  for (let yy=floor+.2;yy<floor+1.95;yy+=.23) {
    for (const zz of [-d/2-.018,d/2+.018]) box(root,w,.035,.04,C.dark,0,yy,zz);
    for (const xx of [-w/2-.018,w/2+.018]) box(root,.04,.035,d,C.dark,xx,yy,0);
  }
  // 前の扉は暗い開口と木枠、細い板の戸をずらして入口の奥行きを残す。
  box(root,.95,1.54,.07,C.dark,0,floor+.79,d/2+.045);
  for (const xx of [-.52,.52]) box(root,.09,1.7,.16,C.wood,xx,floor+.82,d/2+.12);
  box(root,1.12,.10,.16,C.cut,0,floor+1.67,d/2+.12);
  box(root,.34,1.47,.07,C.wood,.29,floor+.79,d/2+.11);
  gableRoof(root,{w:4.02,d:4.05,eave:floor+2.06,rise:1.70});
  // 正面の上り階段。両側の手すりを柱の外へ出す。
  const n=7,run=1.55,front=d/2+.26;
  for (let i=0;i<n;i++) box(root,1.04,.09,.27,C.cut,0,floor-(i+.7)*floor/n,front+(i+.5)*run/n);
  for (const side of [-1,1]) {
    rod(root,[side*.6,.12,front+run],[side*.6,floor+.05,front-.05],.07,mat(C.wood));
    rod(root,[side*.6,.86,front+run],[side*.6,floor+.85,front-.05],.035,mat(C.rail));
    for (const i of [0,3,6]) {
      const zz=front+(i+.5)*run/n,yy=floor-(i+.7)*floor/n;
      rod(root,[side*.6,yy,zz],[side*.6,yy+.80,zz],.035,mat(C.wood));
    }
  }
  return root;
}

function roundedLoop(hx,hz,r,n=8) {
  const points=[];
  for (let side=0;side<4;side++) {
    const cx=side===0||side===3?hx-r:-hx+r,cz=side<2?hz-r:-hz+r;
    const a0=side*Math.PI/2;
    for (let i=0;i<=n;i++) { const a=a0+i*Math.PI/2/n;points.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]); }
  }
  return points;
}

function terrainRing(parent) {
  const profiles=[{x:13.45,z:12.45,r:2.7,y:.035},{x:12.95,z:11.95,r:2.5,y:.16},
    {x:12.15,z:11.15,r:2.2,y:.035},{x:11.45,z:10.45,r:1.9,y:.46}];
  const loops=profiles.map(p=>roundedLoop(p.x,p.z,p.r));
  for (let j=0;j<loops.length-1;j++) {
    const faces=[];
    for (let i=0;i<loops[j].length;i++) {
      const k=(i+1)%loops[j].length,a=loops[j][i],b=loops[j][k],c=loops[j+1][k],d=loops[j+1][i];
      faces.push([[a[0],profiles[j].y,a[1]],[d[0],profiles[j+1].y,d[1]],[c[0],profiles[j+1].y,c[1]],[b[0],profiles[j].y,b[1]]]);
    }
    add(parent,faceGeometry(faces),mat(j===0?C.grass:j===1?C.slope:C.ditch));
  }
  const shape=new THREE.Shape(),inside=loops.at(-1);
  inside.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();
  add(parent,new THREE.ShapeGeometry(shape),mat(C.grass),0,FLOOR-.02,0,{rot:[-Math.PI/2,0,0],cast:false});
  // 土橋は空堀を渡る低い盛土。堀に水を張らず、入口の通り道を示す。
  box(parent,2.8,.42,4.1,C.earth,0,.21,10.4);
}

function palisade(parent) {
  const points=roundedLoop(10.85,9.85,1.7,12),r=rng(5507);
  for (let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/.28);
    for (let j=0;j<n;j++) {
      const t=j/n,x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[1],b[1],t);
      if(z>9.7&&Math.abs(x)<1.7) continue;
      const h=1.35+r()*.22,radius=.095+r()*.015;
      add(parent,G.cyl(radius,radius*1.12,h,7),mat(C.wood),x,FLOOR+h/2,z);
      add(parent,G.cone(radius,.22,7),mat(C.cut),x,FLOOR+h+.11,z);
    }
    // 正面の直線だけ門の左右に分ける。角丸の区間ごとに同じ横桟を重ねない。
    if(Math.abs(a[1]-9.85)<1e-6&&Math.abs(b[1]-9.85)<1e-6) {
      for(const [x0,x1] of [[-9.15,-1.7],[1.7,9.15]]) for(const y of [.48,.96])
        rod(parent,[x0,FLOOR+y,9.85],[x1,FLOOR+y,9.85],.045,mat(C.dark));
    } else for(const y of [.48,.96]) rod(parent,[a[0],FLOOR+y,a[1]],[b[0],FLOOR+y,b[1]],.045,mat(C.dark));
  }
}

function bird(parent,x,y,z,flip=1) {
  const g=group(parent,x,y,z);g.scale.x=flip;
  add(g,G.sphere(.15,8,5),mat(C.cut),0,0,0,{scale:[1.75,.60,.55]});
  add(g,G.sphere(.085,8,5),mat(C.cut),.19,.10,0);
  add(g,G.cone(.045,.15,6),mat(C.dark),.30,.105,0,{rot:[0,0,-Math.PI/2]});
  rod(g,[-.15,0,0],[-.39,.10,0],.04,mat(C.cut));
  rod(g,[-.04,-.17,0],[-.04,-.02,0],.025,mat(C.dark));
}

function gate(parent) {
  const g=group(parent,0,FLOOR,9.72);g.name='吉野ヶ里・鳥形の門';
  for(const x of [-1.72,1.72]) {
    add(g,G.cyl(.15,.18,3.7,10),mat(C.wood),x,1.85,0);
    add(g,G.cyl(.17,.17,.10,10),mat(C.cut),x,3.74,0);
  }
  rod(g,[-2.02,2.95,0],[2.02,2.95,0],.13,mat(C.wood));
  rod(g,[-1.95,3.43,0],[1.95,3.43,0],.11,mat(C.dark));
  for(const x of [-1.72,1.72]) for(const yy of [2.86,3.04,3.34,3.5])
    add(g,G.cyl(.18,.18,.035,10),mat(C.rope),x,yy,0);
  bird(g,-1.1,3.73,0,1);bird(g,1.1,3.73,0,-1);
}

function paths(parent) {
  const m=mat(C.earth);
  // 建物の前を回ってから北へ続く園路。境界を薄い土色でなじませる。
  const strip=(a,b,w) => {
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    add(parent,G.sharpBox(w,.012,len),m,(a[0]+b[0])/2,FLOOR+.01,(a[1]+b[1])/2,{rot:[0,Math.atan2(b[0]-a[0],b[1]-a[1]),0],cast:false});
  };
  for(const [a,b,w] of [[[0,9.7],[0,5.9],2.5],[[0,5.9],[-7.1,5.9],1.6],[[0,5.9],[5.0,4.0],1.7],
    [[5.0,4.0],[5.0,-1.5],1.4],[[5.0,-1.5],[6.5,-2.7],1.4],[[-7.1,5.9],[-8.2,-1.1],1.3],
    [[-8.2,-1.1],[-4.0,-1.2],1.25],[[-4.0,-1.2],[.6,-6.4],1.25],[[.6,-6.4],[6.4,-8.2],1.2]]) strip(a,b,w);
  const r=rng(5011);
  for(let i=0;i<90;i++) {
    const x=(r()-.5)*21,z=(r()-.5)*19;
    if(Math.abs(x)<1.6&&z>5)continue;
    add(parent,G.sphere(.035+r()*.04,5,3),mat(i%3? '#a7b781':'#879b66'),x,FLOOR+.012,z,{scale:[1,.15,1],cast:false});
  }
}

export function buildYoshinogari(parent,{x=0,z=0,scale=1}={}) {
  const root=group(parent,x,0,z);root.scale.setScalar(scale);root.name='吉野ヶ里遺跡の縮景';
  terrainRing(root);paths(root);palisade(root);gate(root);
  const buildings={
    westTower:watchtower(root,-7.1,-6.0),
    eastTower:watchtower(root,7.3,5.7,.80),
    granary:granary(root,6.1,-5.5),
    westDwelling:pitDwelling(root,-4.9,2.1,5.1,4.4,-.15),
    centralDwelling:pitDwelling(root,1.1,1.0,4.5,4.0,.20),
    northDwelling:pitDwelling(root,-1.0,-5.0,3.8,3.3,.15),
  };
  root.updateMatrixWorld(true);
  return {
    root,width:YOSHINOGARI_SIZE.w,depth:YOSHINOGARI_SIZE.d,buildings,
    focusTarget:new THREE.Vector3(0,3,0),
    views:{front:{position:[46,29,16],target:[0,3,0]},whole:{position:[30,37,35],target:[0,1.6,0]}},
    footprint:{x:[-13.5,13.5],z:[-12.5,12.5]},bounds:new THREE.Box3().setFromObject(root),
  };
}
