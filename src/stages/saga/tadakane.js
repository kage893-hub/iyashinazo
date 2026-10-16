import * as THREE from 'three';
import {add,G,group,mat} from '../../lib/util.js';
import {sign,rod,planter} from './site-details.js';

/** 高木瀬町長瀬の旧工場直営入口の公開写真を参照。背面・工場内部は中立な補完。 */
export function createTadakaneCompany(parent){
  const root=group(parent);root.name='忠兼総本社・黄色いひさしの外観';
  const wall=mat('#d3d5c8'),frame=mat('#a6afaa'),glass=mat('#596e6b',{roughness:.43}),brown=mat('#6d5540'),yellow=mat('#ddbd35');
  add(root,G.box(12,6.6,9.5),wall,0,3.4,0);
  add(root,G.box(12.1,.55,9.6),mat('#89938c'),0,.36,0);
  add(root,G.box(12.3,.13,9.9),mat('#8c958c'),0,6.78,0);
  for(let x=-5.6;x<6;x+=1.12)add(root,G.box(.018,6.0,.04),mat('#a9b1a7'),x,3.5,4.78);
  for(const yof of [3.5,5.7])add(root,G.box(12,.024,.04),mat('#b1b9ad'),0,yof,4.78);
  for(const [x,y,w,h]of[[3.0,3.5,3.6,1.45],[-3.8,5.55,2.1,1.3],[.2,5.55,2.1,1.3]]){
    add(root,G.box(w,h,.11),frame,x,y,4.84);add(root,G.plane(w-.12,h-.12),glass,x,y,4.91);
    add(root,G.box(.045,h-.04,.04),frame,x,y,4.94);
  }
  // 低い付け庇と黄色い巻き下げ式テント。
  add(root,G.box(7.3,.14,1.35),mat('#7b8173'),-1.9,3.68,5.17,{rot:[.1,0,0]});
  add(root,G.box(6.9,.06,1.1),yellow,-1.9,3.31,5.43,{rot:[.36,0,0]});
  add(root,G.box(6.9,.86,.08),yellow,-1.9,2.73,5.96);
  sign(root,'有限会社 忠兼総本社',6.4,.63,-1.9,2.76,6.01,{bg:'#ddbd35',color:'#a63d27',sub:'ただかね そうほんしゃ'});
  // 左の展示窓、右の木枠のガラス戸。
  add(root,G.box(3.35,2.05,.13),brown,-3.7,1.32,4.90);
  add(root,G.plane(3.14,1.83),glass,-3.7,1.32,4.98);
  add(root,G.box(3.12,.70,.05),mat('#b2b6a7'),-3.7,1.94,5.01);
  for(const xof of [-4.45,-3.7,-2.95])add(root,G.box(.035,1.2,.06),frame,xof,.99,5.03);
  add(root,G.box(2.12,2.35,.16),brown,-.63,1.40,4.97);
  add(root,G.plane(1.84,2.10),glass,-.63,1.4,5.062);
  add(root,G.box(.075,2.12,.08),brown,-1.20,1.40,5.09);
  add(root,G.box(.038,.35,.06),mat('#c0b79b'),-.95,1.26,5.13);
  for(const y of [.55,.69,.83,1.99])add(root,G.box(1.81,.028,.04),brown,-.63,y,5.10);
  add(root,G.box(1.9,.025,.65),mat('#537d4e'),-.63,.16,5.28);
  // 写真のランプ、雨樋・給湯器、植木鉢。文字の電話番号や人物は写さない。
  rod(root,[-1.87,2.28,5.02],[-1.87,2.28,5.34],.025,brown);
  add(root,G.box(.19,.34,.19),mat('#35483d'),-1.87,2.12,5.35);
  add(root,G.box(.13,.23,.13),mat('#c7c6a6'),-1.87,2.12,5.36);
  for(const x of [1.4,1.68])rod(root,[x,.35,4.95],[x,4.35,4.95],.045,frame);
  add(root,G.box(.74,1.0,.25),mat('#c6c8bb'),2.35,2.0,5.01);
  for(const x of [2.16,2.32])rod(root,[x,1.5,5.0],[x,.4,5.0],.018,frame);
  planter(root,1.5,5.35,1.0,.40);planter(root,2.9,5.3,1.1,.33);planter(root,-5.6,5.35,.7,.38);
  // 窓際の小さな容器は公開写真の陳列を抽象化。効能や架空の商品名は付けない。
  const display=group(root,-3.7,0,5.045);display.name='窓辺の容器';
  for(let i=0;i<7;i++){
    const x=-1.27+i*.41;
    add(display,G.cyl(.10,.105,.18,14),mat('#e1dbc0'),x,.61,0);
    add(display,G.cyl(.11,.11,.045,14),mat('#e8e5d6'),x,.725,0);
    add(display,G.box(.22,.20,.14),mat(i%2?'#e0cd76':'#c4cdb1'),x,1.1,0);
  }
  add(root,G.box(12.7,.10,2.8),mat('#a0a28e'),0,.04,5.5);
  root.updateMatrixWorld(true);
  return{root,display,focusTarget:new THREE.Vector3(-1.8,1.8,5.3),views:{front:{position:[4.5,5.1,21],target:[-1.8,2.5,4.5]},whole:{position:[17,13,24],target:[0,2,1]}},bounds:new THREE.Box3().setFromObject(root)};
}
