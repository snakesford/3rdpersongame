const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const healthValueEl = document.getElementById("healthValue");
const healthFillEl = document.getElementById("healthFill");
const xpLevelEl = document.getElementById("xpLevel");
const xpFillEl = document.getElementById("xpFill");
const upgradePointsEl = document.getElementById("upgradePoints");
const upgradeActionEls = document.querySelectorAll(".upgrade-action");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");
minimapCtx.imageSmoothingEnabled = true;
minimapCtx.imageSmoothingQuality = "high";
const equipmentWeaponNameEl = document.getElementById("equipmentWeaponName");
const equipmentWeaponMetaEl = document.getElementById("equipmentWeaponMeta");
const equipmentWeaponIconEl = document.getElementById("equipmentWeaponIcon");
const weaponDetailsBtnEl = document.getElementById("weaponDetailsBtn");
const weaponDetailsPanelEl = document.getElementById("weaponDetailsPanel");
const weaponDetailsNameEl = document.getElementById("weaponDetailsName");
const weaponDetailsMetaEl = document.getElementById("weaponDetailsMeta");
const weaponDetailsDamageEl = document.getElementById("weaponDetailsDamage");
const weaponDetailsDamageEffectEl = document.getElementById("weaponDetailsDamageEffect");
const weaponDetailsAmmoEl = document.getElementById("weaponDetailsAmmo");
const weaponDetailsAmmoEffectEl = document.getElementById("weaponDetailsAmmoEffect");
const weaponDetailsReloadEl = document.getElementById("weaponDetailsReload");
const weaponDetailsReloadEffectEl = document.getElementById("weaponDetailsReloadEffect");
const weaponDetailsRangeEl = document.getElementById("weaponDetailsRange");
const weaponDetailsRangeEffectEl = document.getElementById("weaponDetailsRangeEffect");
const weaponDetailsFireRateEl = document.getElementById("weaponDetailsFireRate");
const weaponDetailsFireRateEffectEl = document.getElementById("weaponDetailsFireRateEffect");
const weaponDetailUpgradeEls = document.querySelectorAll(".weapon-detail-upgrade");
const closeWeaponDetailsBtn = document.getElementById("closeWeaponDetailsBtn");
const equipmentHelmetNameEl = document.getElementById("equipmentHelmetName");
const equipmentHelmetMetaEl = document.getElementById("equipmentHelmetMeta");
const equipmentHelmetIconEl = document.getElementById("equipmentHelmetIcon");
const equipmentBodyArmorNameEl = document.getElementById("equipmentBodyArmorName");
const equipmentBodyArmorMetaEl = document.getElementById("equipmentBodyArmorMeta");
const equipmentBodyArmorIconEl = document.getElementById("equipmentBodyArmorIcon");
const inventoryListEl = document.getElementById("inventoryList");
const questPanelEl = document.getElementById("questPanel");
const questTitleEl = document.getElementById("questTitle");
const questObjectiveEl = document.getElementById("questObjective");
const statusTextEl = document.getElementById("statusText");
const overlayMessageEl = document.getElementById("overlayMessage");
const buildBarracksBtn = document.getElementById("buildBarracksBtn");
const trainSoldierBtn = document.getElementById("trainSoldierBtn");
const shopPanelEl = document.getElementById("shopPanel");
const shopSellWoodBtn = document.getElementById("shopSellWoodBtn");
const closeShopBtn = document.getElementById("closeShopBtn");
const traderPanelEl = document.getElementById("traderPanel");
const buyWeaponUpgradeBtn = document.getElementById("buyWeaponUpgradeBtn");
const closeTraderBtn = document.getElementById("closeTraderBtn");
const traderStatusEl = document.getElementById("traderStatus");
const slashAbilityEl = document.getElementById("slashAbility");
const abilityNameEl = document.getElementById("abilityName");
const slashCooldownTextEl = document.getElementById("slashCooldownText");
const battleMedicineAbilityEl = document.getElementById("battleMedicineAbility");
const battleMedicineAbilityNameEl = document.getElementById("battleMedicineAbilityName");
const battleMedicineCooldownTextEl = document.getElementById("battleMedicineCooldownText");
const grenadeAbilityEl = document.getElementById("grenadeAbility");
const grenadeAbilityNameEl = document.getElementById("grenadeAbilityName");
const grenadeCooldownTextEl = document.getElementById("grenadeCooldownText");
const dashAbilityEl = document.getElementById("dashAbility");
const dashAbilityNameEl = document.getElementById("dashAbilityName");
const dashCooldownTextEl = document.getElementById("dashCooldownText");
const characterSelectEl = document.getElementById("characterSelect");
const nameStepEl = document.getElementById("nameStep");
const classStepEl = document.getElementById("classStep");
const playerPortraitEl = document.getElementById("playerPortrait");
const playerPortraitNameEl = document.getElementById("playerPortraitName");
const playerNameInputEl = document.getElementById("playerNameInput");
const confirmPlayerNameBtn = document.getElementById("confirmPlayerNameBtn");
const classGridEl = document.querySelector(".class-grid");
const dialoguePanelEl = document.getElementById("dialoguePanel");
const dialogueSpeakerEl = document.getElementById("dialogueSpeaker");
const dialogueTextEl = document.getElementById("dialogueText");
const dialogueProgressEl = document.getElementById("dialogueProgress");
const dialogueProgressFillEl = document.getElementById("dialogueProgressFill");
const dialogueProgressLabelEl = document.getElementById("dialogueProgressLabel");
const dialogueProgressReputationEl = document.getElementById("dialogueProgressReputation");
const dialogueProgressUnlockEl = document.getElementById("dialogueProgressUnlock");
const dialogueProgressValueEl = document.getElementById("dialogueProgressValue");
const dialogueOptionsEl = document.getElementById("dialogueOptions");
const dialogueHintEl = document.getElementById("dialogueHint");

export {
  abilityNameEl,
  battleMedicineAbilityEl,
  battleMedicineAbilityNameEl,
  battleMedicineCooldownTextEl,
  buildBarracksBtn,
  canvas,
  characterSelectEl,
  classGridEl,
  classStepEl,
  closeShopBtn,
  closeTraderBtn,
  confirmPlayerNameBtn,
  ctx,
  dashAbilityEl,
  dashAbilityNameEl,
  dashCooldownTextEl,
  dialogueHintEl,
  dialogueOptionsEl,
  dialoguePanelEl,
  dialogueProgressEl,
  dialogueProgressFillEl,
  dialogueProgressLabelEl,
  dialogueProgressReputationEl,
  dialogueProgressUnlockEl,
  dialogueProgressValueEl,
  dialogueSpeakerEl,
  dialogueTextEl,
  equipmentBodyArmorIconEl,
  equipmentBodyArmorMetaEl,
  equipmentBodyArmorNameEl,
  equipmentHelmetIconEl,
  equipmentHelmetMetaEl,
  equipmentHelmetNameEl,
  equipmentWeaponIconEl,
  equipmentWeaponMetaEl,
  equipmentWeaponNameEl,
  grenadeAbilityEl,
  grenadeAbilityNameEl,
  grenadeCooldownTextEl,
  healthFillEl,
  healthValueEl,
  inventoryListEl,
  minimapCanvas,
  minimapCtx,
  nameStepEl,
  overlayMessageEl,
  playerNameInputEl,
  playerPortraitNameEl,
  playerPortraitEl,
  questObjectiveEl,
  questPanelEl,
  questTitleEl,
  shopPanelEl,
  shopSellWoodBtn,
  slashAbilityEl,
  slashCooldownTextEl,
  statusTextEl,
  traderPanelEl,
  traderStatusEl,
  trainSoldierBtn,
  upgradeActionEls,
  upgradePointsEl,
  weaponDetailsAmmoEl,
  weaponDetailsBtnEl,
  weaponDetailsDamageEl,
  weaponDetailsDamageEffectEl,
  weaponDetailsFireRateEl,
  weaponDetailsFireRateEffectEl,
  weaponDetailsMetaEl,
  weaponDetailsNameEl,
  weaponDetailsPanelEl,
  weaponDetailsRangeEl,
  weaponDetailsRangeEffectEl,
  weaponDetailsReloadEl,
  weaponDetailsReloadEffectEl,
  weaponDetailsAmmoEffectEl,
  weaponDetailUpgradeEls,
  xpFillEl,
  xpLevelEl,
  buyWeaponUpgradeBtn,
  closeWeaponDetailsBtn,
};
