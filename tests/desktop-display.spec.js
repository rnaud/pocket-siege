import {test,expect} from '@playwright/test';

// Exercise the existing display check on a Retina-density desktop.
test.use({ deviceScaleFactor: 2 });

test('desktop fills the battlefield with a finer integer pixel grid and undistorted camera', async ({page},info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await page.waitForFunction(()=>window.siege?.getState().assetsReady);
  await page.locator('#mode').selectOption('local');
  await page.locator('#start').click();
  for (const size of [{width:1440,height:900},{width:1920,height:1080},{width:2560,height:1440}]) {
    await page.setViewportSize(size);
    await expect.poll(()=>page.evaluate(()=>{
      const a=document.querySelector('#arena'),f=document.querySelector('#battlefield-frame'),c=document.querySelector('#scene canvas');
      const scale=Number(c.dataset.pixelScale),v=window.siege.getState().camera;
      return a.clientWidth===f.clientWidth && a.clientHeight===f.clientHeight && c.width>=960 &&
        Number.isInteger(scale*devicePixelRatio) && c.width>=a.clientWidth*devicePixelRatio/Number(c.dataset.devicePixelScale) &&
        Math.abs(c.getBoundingClientRect().width-c.width*scale)<0.02 && Math.abs(c.getBoundingClientRect().height-c.height*scale)<0.02 &&
        Math.abs(v.w/v.h-a.clientWidth/a.clientHeight)<0.02;
    })).toBe(true);
  }
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:test.info().outputPath('mac-desktop.png')});
});
