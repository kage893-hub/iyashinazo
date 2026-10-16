// 実際の箱庭で新3施設・任意体験・川久保の近景を個別確認する。通しプレイはしない。
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const oldSave={stage:'saga',flags:{introDone:true,saGuideMet:true,saBusDone:true,saSpaRested:true,saFoamTasted:true,saDrafts:{sketch:{choices:[1,null,null,null]}}},inventory:['sagaGuide'],counts:{},cleared:['japan'],hints:2,elapsed:210,notes:[{id:'legacy',stage:'saga',title:'前のメモ',html:'残しておく'}]};
const errors=[];let passed=0;
await mkdir('shots/review',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource'))errors.push(m.text());});
 await page.addInitScript(save=>{localStorage.setItem('hoshimawari-muted','1');if(!sessionStorage.getItem('city-seeded')){sessionStorage.setItem('city-seeded','1');localStorage.setItem('hoshimawari-save-v1',JSON.stringify(save));}},oldSave);
 const settle=()=>page.waitForFunction(()=>__game&&!__game.busy&&!__game.cinematic&&!__game.stage.sideBusy&&!__game.ui.dialogueActive&&__game.tweens.list.length===0);
 const resume=async()=>{await page.waitForFunction(()=>window.__game?.stage?.id==='saga'&&!document.querySelector('#title').classList.contains('hidden'),null,{timeout:180000});await page.locator('[data-act="continue"]').click();await page.evaluate(()=>{__game.timeScale=6;__game.ui.questsCollapsed=true;__game.refreshQuests();clearInterval(window.__cityAuto);window.__cityAuto=setInterval(()=>{if(__game.ui.dialogueActive)__game.ui.advance();},65);});await page.waitForFunction(()=>__game.playing&&getComputedStyle(document.querySelector('#fade')).opacity==='0');await settle();await page.waitForTimeout(400);await settle();};
 const close=async()=>{await page.evaluate(()=>__game.ui.closeAllPanels());await page.waitForTimeout(280);};
 const run=(method,...args)=>page.evaluate(async({method,args})=>{await __game.stage[method](...args);},{method,args}).then(settle);
 const snapshot=()=>page.evaluate(()=>({stamps:__game.stage.stamps,quests:__game.stage.quests(),draft:__game.flags.saDrafts,inventory:__game.state.inventory,cleared:__game.state.cleared,hints:__game.state.hints,oldNote:__game.state.notes.find(n=>n.id==='legacy'),rest:__game.flags.saSpaRested,foam:__game.flags.saFoamTasted}));
 const test=async(name,f)=>{await f();passed++;console.log('OK',name);};
 await page.goto((process.env.BASE||'http://localhost:8123')+'/index.html?low');await resume();const before=await snapshot();
 await test('追加3施設は結合後も操作でき、旧進行を保持する',async()=>{
  const info=await page.evaluate(async()=>{const T=await import('three'),g=__game;return ['roundone','ide','tadakane'].map(id=>{const m=g.stage.R[id],box=new T.Box3().setFromObject(m.root),lot=g.stage.R.cityLots[id],it=g.interactables.get(id);return{id,pickable:it.meshes.filter(v=>g.pickList.includes(v)&&!v.userData.noPick).length,inLot:box.min.x>=lot.x[0]-.01&&box.max.x<=lot.x[1]+.01&&box.min.z>=lot.z[0]-.01&&box.max.z<=lot.z[1]+.01};});});
  for(const m of info){assert.ok(m.pickable>0,m.id);assert.ok(m.inLot,m.id+'の模型を区画内に保持');}
  const crop=await page.evaluate(()=>{const R=__game.stage.R,inst=R.rice,fail=[];if(!inst?.isInstancedMesh)throw new Error('田の植生インスタンスを確認できない');const matrix=inst.matrixWorld.clone();for(let i=0;i<inst.count;i++){inst.getMatrixAt(i,matrix);const p=__game.controls.target.clone().setFromMatrixPosition(matrix);for(const[id,lot]of Object.entries(R.cityLots))if(p.x>lot.x[0]&&p.x<lot.x[1]&&p.z>lot.z[0]&&p.z<lot.z[1])fail.push(id);}return fail;});assert.deepEqual(crop,[]);
  assert.deepEqual(before.stamps,['bus']);assert.deepEqual(before.draft,oldSave.flags.saDrafts);assert.equal(before.quests.length,6);
 });
 for(const viewport of [{width:390,height:844},{width:820,height:520}]){
  await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__game.camera.aspect-innerWidth/innerHeight)<.0001);
  await test(`${viewport.width}×${viewport.height}: 3施設の案内と操作が画面内で届く`,async()=>{
   await page.evaluate(()=>__game.stage.showGuide());
   for(const label of ['ラウンドワン佐賀店','井手ちゃんぽん 大和店','忠兼総本社'])assert.equal(await page.locator('.sa-destination').filter({hasText:label}).count(),1);await close();
   for(const id of ['roundone','ide','tadakane']){
    await run('visit',id);
    const picked=await page.evaluate(async id=>{const g=__game,m=g.stage.R[id];g.scene.updateMatrixWorld(true);g.camera.updateMatrixWorld(true);const p=m.root.localToWorld(m.focusTarget.clone()).project(g.camera),r=g.renderer.domElement.getBoundingClientRect(),T=await import('three'),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(p.x,p.y),g.camera);const meshes=[];g.scene.traverse(o=>{if(!o.isMesh)return;let v=o;while(v){if(!v.visible)return;v=v.parent;}meshes.push(o);});const hit=ray.intersectObjects(meshes,false)[0];let ancestor=hit?.object;while(ancestor&&ancestor!==m.root)ancestor=ancestor.parent;const preset=m.views.front,target=m.root.localToWorld(new T.Vector3(...preset.target));return{visual:ancestor===m.root,targetError:target.distanceTo(g.controls.target),ndc:p.toArray(),id:g._pick({clientX:r.left+(p.x+1)*r.width/2,clientY:r.top+(1-p.y)*r.height/2})};},id);
    assert.ok(Math.abs(picked.ndc[0])<1&&Math.abs(picked.ndc[1])<1&&picked.ndc[2]<1,id+'の正面が画面内');assert.equal(picked.id,id,id+'を正しく調べられる');assert.equal(picked.visual,true,id+'の正面が背景の物体に遮られない');assert.ok(picked.targetError<.01,id+'へ移動した視点が保たれる');
    await page.screenshot({path:`shots/review/saga-city-${id}-${viewport.width}.png`});
    await run('openCity',id);const panel=page.locator('.panel-wrap.show .sa-visit-panel');await panel.waitFor();
    const layout=await panel.evaluate(root=>{const r=root.getBoundingClientRect(),fail=[];for(const b of root.querySelectorAll('button')){b.scrollIntoView({block:'center'});const p=b.getBoundingClientRect();if(p.top<r.top-1||p.bottom>r.bottom+1||p.left<r.left-1||p.right>r.right+1)fail.push(b.textContent);}root.scrollTop=0;return{overflow:root.scrollWidth>root.clientWidth+1,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,fail};});
    assert.equal(layout.overflow,false);assert.equal(layout.inside,true);assert.deepEqual(layout.fail,[]);
    await page.screenshot({path:`shots/review/saga-city-menu-${id}-${viewport.width}.png`});await close();
   }
  });
 }
 await test('ボウリングの操作・最高記録・閉じた投球の中断を確認する',async()=>{
  await run('openCity','roundone');await page.getByRole('button',{name:'ミニボウリングで遊ぶ',exact:true}).click();await page.locator('.sa-bowling').waitFor();
  const aim=page.getByRole('slider',{name:'狙う位置'});await aim.fill('-2');await aim.dispatchEvent('input');await page.getByRole('button',{name:'ボールを転がす',exact:true}).click();await page.waitForFunction(()=>__game.flags.saBowlingBest===4);assert.match(await page.locator('.sa-bowling .sa-message').innerText(),/4本/);
  await aim.fill('0');await aim.dispatchEvent('input');await page.getByRole('button',{name:'もう一度、転がす',exact:true}).click();await page.waitForFunction(()=>__game.flags.saBowlingBest===10);assert.match(await page.locator('.sa-bowling .sa-message').innerText(),/ストライク/);await page.screenshot({path:'shots/review/saga-city-bowling.png'});
  await page.getByRole('button',{name:'もう一度、転がす',exact:true}).click();await close();await page.waitForTimeout(850);assert.equal(await page.evaluate(()=>__game.state.notes.filter(n=>n.id==='sa-side-bowling').length),1);
 });
 await test('食事と窓辺の観察は任意メモに保存され、必須5謎を変えない',async()=>{
  for(const [id,label,flag]of[['ide','ちゃんぽんを味わう','saChanponTasted'],['tadakane','窓辺の容器を眺める','saTadakaneSeen']]){await run('openCity',id);await page.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(flag=>__game.flags[flag]&&!__game.stage.sideBusy&&!__game.ui.dialogueActive,flag);await settle();await close();}
  assert.deepEqual(await snapshot(),before);
 });
 await test('川久保の6方向は操作でき、玄関・塀・作業場の近景を表示する',async()=>{
  await page.evaluate(()=>__game.stage.showPropertyViews());assert.equal(await page.locator('.sa-property-guide button').count(),7);await close();
  for(const viewport of [{width:390,height:844},{width:820,height:520}]) {
   await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__game.camera.aspect-innerWidth/innerHeight)<.0001);
   for(const [view,point]of [['front',[2.82,1.9,2.05]],['left',[-6.88,4.6,5.28]],['right',[2.82,1.9,2.05]],['porch',[2.82,1.9,2.05]],['wall',[3.3,.94,8.4]],['shed',[-6.88,4.6,5.28]]]){
    await run('propertyView',view);
    const visible=await page.evaluate(async point=>{const T=await import('three'),g=__game,root=g.stage.R.property.root;g.scene.updateMatrixWorld(true);g.camera.updateMatrixWorld(true);const target=root.localToWorld(new T.Vector3(...point)),ray=new T.Raycaster(g.camera.position,target.clone().sub(g.camera.position).normalize()),meshes=[];g.scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(p){if(!p.visible)return;p=p.parent;}meshes.push(o);});let hit=ray.intersectObjects(meshes,false)[0]?.object;while(hit&&hit!==root)hit=hit.parent;const screen=target.project(g.camera);return{property:hit===root,onScreen:Math.abs(screen.x)<1&&Math.abs(screen.y)<1&&screen.z<1};},point);
    assert.equal(visible.property,true,`${viewport.width} ${view}: 他施設の屋根が家の視界を遮らない`);assert.equal(visible.onScreen,true,`${view}: 注目する部分が画面内`);
    await page.screenshot({path:`shots/review/saga-city-property-${view}-${viewport.width}.png`});
   }
  }
 });
 await test('再読み込みで新3体験・旧メモ・入力途中を復元する',async()=>{
  const saved=await page.evaluate(()=>{__game.save();return JSON.parse(localStorage.getItem('hoshimawari-save-v1'));});await page.reload();await resume();assert.deepEqual(await page.evaluate(()=>__game.flags),saved.flags);assert.deepEqual(await page.evaluate(()=>__game.state.notes),saved.notes);assert.deepEqual(await snapshot(),before);
  assert.equal(saved.flags.saBowlingBest,10);assert.equal(saved.flags.saBowlingPlayed,true);assert.equal(saved.flags.saChanponTasted,true);assert.equal(saved.flags.saTadakaneSeen,true);
 });
 assert.deepEqual(errors,[]);console.log(`PASS ${passed} checks`);
}finally{await browser.close();}
