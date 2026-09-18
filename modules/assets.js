function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

const weaponBuffImage = loadImage("./images/sword.jpg");
const soldierRunningImage = loadImage("./images/soldierRunning.png");
const soldierRunningTransitionImage = loadImage("./images/soldierRunningTransition.png");
const soldierRunningRightFootImage = loadImage("./images/soldierRunningRightFoot.png");
const soldierIdleImage = loadImage("./images/soldier-stationary.png");
const soldierMedkitImage = loadImage("./images/soldierMedkit.png");
const soldierReloadingImage = loadImage("./images/soldierReloading.png");
const soldierShootingImage = loadImage("./images/soldier-shooting.png");
const skeletonImage = loadImage("./images/skeleton.png");
const bowImage = loadImage("./images/bow.png");
const grenadeImage = loadImage("./images/grenade.png");
const humveeImage = loadImage("./images/humvee.png");
const exhaustImage = loadImage("./images/exaust.png");
const fireImage = loadImage("./images/fire.png");
const archerImage = loadImage("./images/archer.png");
const archerRunningImage = loadImage("./images/archer-running.png");
const archerShootingImage = loadImage("./images/archer-shooting.png");
const archerDeadImage = loadImage("./images/archer-dead.png");

export {
  archerDeadImage,
  archerImage,
  archerRunningImage,
  archerShootingImage,
  bowImage,
  grenadeImage,
  humveeImage,
  exhaustImage,
  fireImage,
  skeletonImage,
  soldierIdleImage,
  soldierMedkitImage,
  soldierReloadingImage,
  soldierRunningImage,
  soldierRunningRightFootImage,
  soldierRunningTransitionImage,
  soldierShootingImage,
  weaponBuffImage,
};
