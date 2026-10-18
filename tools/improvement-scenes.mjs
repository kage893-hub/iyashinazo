// 指摘3・4の変更した実箱庭だけを通常画質で撮影する。
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out='shots/improvements';await mkdir(out,{recursive:true});
const errors=[];
try {
 for(const stage of ['kinoko','museum']) {
  const context=await browser.newContext({viewport:{width:1000,height:720}});
  const page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(stage=>{
   localStorage.setItem('hoshimawari-muted','1');
   localStorage.setItem('hoshimawari-save-v1',JSON.stringify({stage,flags:{introDone:true,...(stage==='museum'?{muGardenDone:true,muClue_garden:true}:{})},inventory:[],counts:{},elapsed:0,hints:0,cleared:['japan'],notes:stage==='museum'?[{id:'mu-clue-garden',title:'旧温室',html:'旧版は4Lを量る'}]:[]}));
  },stage);
  await page.goto(`${process.env.BASE||'http://localhost:8123'}/index.html?stage=${stage}&ts=16`);
  await page.waitForFunction(stage=>window.__game?.stage?.id===stage,stage);
  await page.locator('[data-act="continue"]').click();
  await page.waitForFunction(()=>__game.playing&&!__game.tweens.list.length&&!__game.cinematic);
  if(stage==='kinoko') {
   await page.evaluate(()=>{const g=__game;g.ui.questsCollapsed=false;g.refreshQuests();void g.stage.talkElder();});
   await page.waitForFunction(()=>__game.ui.dialogueActive&&!__game.tweens.list.length);
   await page.setViewportSize({width:390,height:844});
   await page.waitForFunction(()=>document.querySelector('#quests').classList.contains('collapsed'));
   await page.evaluate(()=>__game.ui.advance());
   await page.waitForTimeout(350);
   await page.screenshot({path:`${out}/elder-conversation-portrait.png`});
   console.log('OK 長老の実会話を横→縦に切り替え、目標の一時折り畳みを撮影');
  } else {
   const old=await page.evaluate(()=>({done:__game.flags.muGardenDone,html:__game.state.notes.find(n=>n.id==='mu-clue-garden').html,bloom:__game.stage.R.gardenDewBloom.visible}));
   assert.equal(old.done,true);assert.equal(old.bloom,true);assert.match(old.html,/6L/);
   await page.evaluate(()=>{const g=__game;void g.stage.view(g.stage.R.garden,{height:1.5,dist:19,polar:.9,theta:.1});});
   await page.waitForFunction(()=>!__game.tweens.list.length);
   await page.screenshot({path:`${out}/museum-two-flowers-landscape.png`});
   console.log('OK 旧クリア済み展示と更新されたメモ・ふたつの花の通常画質を確認');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
