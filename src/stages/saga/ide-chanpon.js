import * as THREE from 'three';
import { add, G, group, mat, rng } from '../../lib/util.js';
import { sign, rod, parking, littleCar } from './site-details.js';

function chanpon(parent) {
  const dish = group(parent, 1.6, .94, 7.5); dish.name = '野菜が山になったちゃんぽんの食品見本';
  const profile = [[.14,0],[.22,.025],[.29,.12],[.41,.29],[.42,.31],[.395,.32],[.365,.27],[.25,.11],[.12,.055]].map(p=>new THREE.Vector2(...p));
  add(dish, new THREE.LatheGeometry(profile, 40), mat('#e8e5d4', { roughness: .38 }));
  add(dish, G.torus(.40,.012,6,48), mat('#384e70'), 0,.31,0,{rot:[Math.PI/2,0,0]});
  add(dish, G.cyl(.345,.345,.014,32), mat('#bcb18b'),0,.245,0);
  const r=rng(3650);
  for(let i=0;i<62;i++){
    const a=r()*Math.PI*2, rad=Math.sqrt(r())*.27, xx=Math.cos(a)*rad,zz=Math.sin(a)*rad,yy=.32+(1-rad/.32)*.25+r()*.05;
    const v=[Math.cos(a)*.07, .025, Math.sin(a)*.07];
    const points=[new THREE.Vector3(xx-v[0],yy-.04,zz-v[2]),new THREE.Vector3(xx,yy+.015,zz),new THREE.Vector3(xx+v[0],yy-.02,zz+v[2])];
    add(dish,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),6,.011,5),mat(i%6===0?'#8ca56c':'#e3dbad'));
  }
  for(let i=0;i<17;i++){
    const a=i*2.399,d=.25*Math.sqrt(r());
    add(dish,G.sphere(.06,6,5),mat(i%4===0?'#c39a8b':i%3===0?'#83a16d':'#c8ce98'),Math.cos(a)*d,.32+(1-d/.3)*.16,Math.sin(a)*d,{scale:[1.6,.35,.8],rot:[0,a,.3]});
  }
  // 染付の丼の縁は繰り返し模様にする。
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    add(dish,G.sphere(.018,5,4),mat('#3d5275'),Math.sin(a)*.393,.29,Math.cos(a)*.393,{scale:[1,.5,1]});
  }
  add(dish,G.sphere(.08,7,5),mat('#e1e0d2'),.22,.40,-.10,{scale:[.5,.24,1.3]});
  rod(dish,[.22,.40,-.1],[.38,.58,-.34],.022,mat('#d5d5ca'));
  return dish;
}

/** 大和店の写真参照。赤い入口、白/薄橙の横長店舗、風除けを個別に造形。 */
export function createIdeChanpon(parent) {
  const root = group(parent); root.name = '井手ちゃんぽん大和店';
  const white=mat('#e0ddd0'), red=mat('#9f2639'), frame=mat('#a9b3ae'), glass=mat('#718780',{roughness:.37});
  parking(root, 25, 10, 0, 12);
  add(root,G.box(23,3.7,10),white,0,1.95,0);
  add(root,G.box(23,.88,.10),mat('#b47b66'),0,.9,5.07);
  // パネル継ぎ目はごく浅い凹凸。
  for(let x=-11;x<11.5;x+=1.14)add(root,G.box(.018,3.55,.025),mat('#bebdb0'),x,2,5.064);
  for(const x of [-7.6,-3.1,6.4,9.7]){
    add(root,G.box(2.7,1.55,.12),frame,x,2.28,5.12);
    add(root,G.plane(2.48,1.34),glass,x,2.28,5.19);
    add(root,G.box(.045,1.42,.06),frame,x,2.28,5.24);
    add(root,G.box(2.49,.04,.04),frame,x,2.0,5.24);
  }
  // 入口の赤い壁と、前へ張り出した赤い箱庇。
  add(root,G.box(4.45,3.6,.30),red,2.0,2.0,5.24);
  add(root,G.box(7.2,.8,3.0),red,2.0,4.0,5.5);
  add(root,G.box(7.3,.09,3.12),mat('#b7b6a7'),2.0,4.44,5.5);
  add(root,G.box(7.0,.08,2.95),mat('#ddd9ca'),2.0,3.56,5.5);
  sign(root,'名代 井手ちゃんぽん',3.9,2.50,2.0,2.08,5.405,{bg:'#dd942d',color:'#342c26',border:'#d0802f',sub:'大和店'});
  add(root,G.box(12.95,1.19,.12),red,-4.7,4.67,5.34);
  sign(root,'名代 井手ちゃんぽん',12.8,1.12,-4.7,4.67,5.43,{bg:'#c53b28',color:'#fff0d4',border:'#e4ac47'});
  // 写真の入口左にある半透明の風除け。通路をガラスでふさがない。
  const wind=group(root,-2.4,0,6.45);
  add(wind,G.box(3.15,3.36,.10),mat('#afb7b2'),0,1.79,0);
  add(wind,G.plane(3.0,3.18),mat('#a3b0ac',{roughness:.68}),0,1.79,.061);
  for(const x of [-1.56,-.52,.52,1.56])add(wind,G.box(.044,3.37,.07),frame,x,1.79,.08);
  for(const y of [.12,1.2,2.3,3.45])add(wind,G.box(3.16,.047,.07),frame,0,y,.08);
  // 入口左の奥まった引戸。黒い開口と枠の奥行きを分ける。
  add(root,G.box(1.45,2.65,.11),mat('#36443e'),-1.0,1.65,5.19);
  for(const x of [-1.7,-.98,-.27])add(root,G.box(.05,2.65,.10),frame,x,1.65,5.27);
  add(root,G.box(24,.2,10.7),mat('#a8aaa0'),0,3.93,0);
  for(const x of [-10,-7,-4]){
    rod(root,[x,5.22,5.0],[x,5.70,5.65],.027,frame);
    add(root,G.cyl(.12,.18,.18,12),mat('#c8ccc0'),x,5.62,5.69,{rot:[-.8,0,0]});
  }
  const vending=group(root,-10.35,0,5.55);
  add(vending,G.box(.88,1.95,.7),mat('#b62e31'),0,1.05,0);
  for(let y=.8;y<1.8;y+=.28)for(const x of [-.23,0,.23])add(vending,G.box(.13,.17,.025),mat('#e2dec9'),x,y,.363);
  add(vending,G.box(.56,.14,.03),mat('#343f36'),0,.35,.365);
  add(root,G.box(3.7,.83,1.0),mat('#72583c'),1.4,.48,7.5);
  const dish=chanpon(root);
  sign(root,'ちゃんぽん',1.25,.36,1.55,.62,8.02,{bg:'#eadbb7',color:'#533d2e'});
  for(const [x,z,c]of[[-8,12,'#dbdbce'],[-3,14,'#6e8082'],[8,14,'#d2c4a9']])littleCar(root,x,z,c);
  root.updateMatrixWorld(true);
  return {root,dish,focusTarget:new THREE.Vector3(0,2,5.5),views:{front:{position:[10,7.0,35],target:[0,2,4]},whole:{position:[34,27,42],target:[0,1.5,4]},dish:{position:[2.8,2.8,10],target:[1.6,1.2,7.5]}},bounds:new THREE.Box3().setFromObject(root)};
}
