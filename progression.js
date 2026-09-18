import { hero, inventoryAbilityOrders, player, tutorialProfessionState } from "./modules/state.js";
import { clamp } from "./modules/math.js";
import {
  statusTextEl,
  upgradeActionEls,
  upgradePointsEl,
  xpFillEl,
  xpLevelEl,
} from "./modules/dom.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createProgressionSystem(services) {
  function updateUpgradeUI() {
    upgradePointsEl.textContent = `Upgrade Points: ${player.upgradePoints}`;
    upgradePointsEl.classList.toggle("hidden", player.upgradePoints <= 0);
    upgradeActionEls.forEach((element) => {
      element.classList.toggle("hidden", player.upgradePoints <= 0);
    });
    services.updateWeaponDetailsUI();
  }

  function registerUpgradeControls() {
    upgradeActionEls.forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyUpgrade(element.dataset.upgrade);
      });
    });
  }

  function getXpRequiredForLevel(level) {
    return 50 + (level - 1) * 25;
  }

  function updateXpUI() {
    const xpRequired = getXpRequiredForLevel(player.level);
    const inventoryXpProgress = document.getElementById("inventoryXpProgress");
    inventoryXpProgress.max = xpRequired;
    inventoryXpProgress.value = player.xp;
    xpLevelEl.textContent = `Level ${player.level} • ${player.xp}/${xpRequired} XP`;
    xpFillEl.style.width = `${Math.min(100, (player.xp / xpRequired) * 100)}%`;
    updateUpgradeUI();
  }

  function awardPlayerXp(amount, sourceX = hero.x, sourceY = hero.y) {
    if (amount <= 0) {
      return;
    }

    player.xp += amount;
    services.spawnTextPopup(sourceX, sourceY - 24, `+${amount} XP`, "rgba(150, 219, 255, 1)", 1.2);

    let leveledUp = false;
    while (player.xp >= getXpRequiredForLevel(player.level)) {
      player.xp -= getXpRequiredForLevel(player.level);
      player.level += 1;
      player.upgradePoints += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      statusTextEl.textContent = `Level up! You are now level ${player.level}.`;
      if (player.inventoryOpen) services.updateInventoryAbilities();
    }

    updateXpUI();
  }

  function applyUpgrade(upgradeId) {
    if (player.upgradePoints <= 0) {
      return;
    }

    if (upgradeId === "health") {
      player.bonusHealth += 10;
      hero.maxHp += 10;
      hero.hp = Math.min(hero.maxHp, hero.hp + 10);
      statusTextEl.textContent = "Upgrade applied: +10 max HP.";
    } else if (upgradeId === "armor") {
      player.bonusArmor += 3;
      statusTextEl.textContent = "Upgrade applied: +3 armor.";
    } else if (upgradeId === "speed") {
      player.bonusSpeed += 5;
      hero.speed += 5;
      statusTextEl.textContent = "Upgrade applied: +5 speed.";
    } else if (upgradeId === "regen") {
      player.bonusRegen += 0.5;
      statusTextEl.textContent = "Upgrade applied: +0.5 health regen.";
    } else if (upgradeId === "ability") {
      player.bonusAbilityDamage += 3;
      statusTextEl.textContent = "Upgrade applied: +3 ability damage.";
    } else if (upgradeId === "helmet") {
      player.helmetBonusArmor += 3;
      if (!hero.equippedHelmetType) {
        hero.equippedHelmetType = "helmet";
      }
      statusTextEl.textContent = "Upgrade applied: +3 helmet armor.";
    } else {
      return;
    }

    player.upgradePoints -= 1;
    services.updateStatsUI();
    updateXpUI();
  }

  const CHARACTER_SAVE_PREFIX = "timberlineCommandCharacterV1:";

  const SAVED_PLAYER_FIELDS = ["level", "xp", "upgradePoints", "wood", "money", "weaponBonusStat", "weaponBonusDamage",
    "weaponDetailDamageLevel", "weaponDetailAmmoLevel", "weaponDetailReloadLevel", "weaponDetailRangeLevel",
    "weaponDetailFireRateLevel", "bonusArmor", "bonusHealth", "bonusDamage", "bonusSpeed", "bonusRegen", "bonusAbilityDamage", "helmetBonusArmor"];

  const SAVED_EQUIPMENT_FIELDS = ["hasRifle", "hasBow", "hasAxe", "equippedArmorValue", "equippedHelmetType", "ammo"];

  function characterSaveKey(classId = hero.selectedClass) {
    return CHARACTER_SAVE_PREFIX + encodeURIComponent(player.displayName) + ":" + classId;
  }

  function saveCharacterProgress() {
    if (!player.hasSelectedCharacter || !hero.selectedClass) return;
    try {
      localStorage.setItem(characterSaveKey(), JSON.stringify({version: 1, classId: hero.selectedClass,
        stats: Object.fromEntries(SAVED_PLAYER_FIELDS.map(k => [k, player[k]])),
        equipment: Object.fromEntries(SAVED_EQUIPMENT_FIELDS.map(k => [k, hero[k]])),
        backpack: player.backpack, abilityOrder: services.getInventoryAbilitySlots(),
        cooldowns: {slashTimer: hero.slashTimer, battleMedicineCooldownRemaining: hero.battleMedicineCooldownRemaining, grenadeCooldownRemaining: hero.grenadeCooldownRemaining},
        professions: tutorialProfessionState
      }));
    } catch (error) { console.warn("Character progress could not be saved", error); }
  }

  function restoreCharacterProgress(classId) {
    try {
      const saved = JSON.parse(localStorage.getItem(characterSaveKey(classId)) || "null");
      if (!saved || saved.version !== 1 || saved.classId !== classId) return false;
      for (const key of SAVED_PLAYER_FIELDS) {
        if (Number.isFinite(saved.stats?.[key]) && saved.stats[key] >= 0) player[key] = saved.stats[key];
      }
      player.level = Math.max(1, Math.floor(player.level));
      for (const key of SAVED_EQUIPMENT_FIELDS) {
        const value = saved.equipment?.[key];
        if (typeof value === typeof hero[key] && (typeof value !== "number" || Number.isFinite(value) && value >= 0)) hero[key] = value;
      }
      if (["helmet", "rareHelmet", "enemyHelmet", "goldHelmet"].includes(saved.equipment?.equippedHelmetType)) hero.equippedHelmetType = saved.equipment.equippedHelmetType;
      if (Array.isArray(saved.backpack)) player.backpack = saved.backpack.filter(i => i && typeof i.type === "string").slice(0, player.backpackCapacity);
      if (Array.isArray(saved.abilityOrder)) inventoryAbilityOrders.set(classId, saved.abilityOrder.slice(0, 6));
      const abilities = services.getInventoryAbilities();
      const cooldownLimits = {slashTimer: abilities.find(a => a.key === "F")?.cooldown || 0, battleMedicineCooldownRemaining: abilities.find(a => a.key === "Q")?.cooldown || 0, grenadeCooldownRemaining: abilities.find(a => a.key === "G")?.cooldown || 0};
      for (const [key, max] of Object.entries(cooldownLimits)) {
        if (Number.isFinite(saved.cooldowns?.[key])) hero[key] = Math.max(0, Math.min(max, saved.cooldowns[key]));
      }
      for (const [key, state] of Object.entries(tutorialProfessionState)) {
        const stored = saved.professions?.[key];
        if (!stored) continue;
        for (const field of ["xp", "reputation", "completed"]) if (Number.isFinite(stored[field]) && stored[field] >= 0) state[field] = stored[field];
        if (Array.isArray(stored.claimedRewardRanks)) state.claimedRewardRanks = stored.claimedRewardRanks.filter(Number.isFinite);
        state.introSeen = Boolean(stored.introSeen);
      }
      hero.maxHp = services.getSelectedClassConfig().stats.health + player.bonusHealth;
      hero.hp = hero.maxHp;
      hero.speed = services.getHeroSpeed();
      services.syncWeaponDerivedStats();
      return true;
    } catch (error) { console.warn("Invalid character save ignored", error); return false; }
  }

  function registerProgressionPersistence() {
    window.addEventListener("pagehide", saveCharacterProgress);
    setInterval(saveCharacterProgress, 5000);
  }

  const TUTORIAL_PROFESSIONS = {
    farmer: {
      label: "Farmer",
      color: "#b8d86b",
      taskXp: 12,
      intro: "I teach farming. Start with seeds, learn to plant, then harvest for better crops and better rewards later.",
      workText: "Farming grows from simple seed plots into better crops, rarer harvests, and stronger farm rewards.",
      taskTitle: "Plant and harvest 1 crop",
      rewardText: "Seed stock increased and farming progress gained.",
    },
    mercenary: {
      label: "Mercenary",
      color: "#ff5a5a",
      taskXp: 12,
      intro: "I post combat contracts. The first one is simple: kill a nearby target and come back alive.",
      workText: "Mercenary work scales into area clears, escorts, hunts, and harder contracts with gold and gear.",
      taskTitle: "Defeat the training raider",
      rewardText: "Gold paid and Mercenary reputation improved.",
    },
    explorer: {
      label: "Explorer",
      color: "#7fd0c5",
      taskXp: 12,
      intro: "I map the wilds. Find the marked landmark nearby and you will understand how discovery work begins.",
      workText: "Exploration unlocks landmarks, ruins, treasure routes, and deeper resource finds the farther you roam.",
      taskTitle: "Discover the old waypoint",
      rewardText: "Explorer progress increased.",
    },
    merchant: {
      label: "Merchant",
      color: "#e0b766",
      taskXp: 12,
      intro: "I teach trade. Bring me gathered materials and I turn them into deals, gold, and better prices.",
      workText: "Trading grows through deliveries, buying low, selling high, and unlocking stronger market opportunities.",
      taskTitle: "Deliver 25 wood",
      rewardText: "Gold earned and Merchant standing improved.",
    },
    craftsman: {
      label: "Craftsman",
      color: "#aab6cb",
      taskXp: 12,
      intro: "I teach crafting. Gather ore, bring it back, and I will show you how raw material becomes equipment.",
      workText: "Crafting expands into recipes, forging, upgrades, and stronger equipment options over time.",
      taskTitle: "Collect 1 ore sample",
      rewardText: "Crafting progress increased and a forge bonus granted.",
    },
    scholar: {
      label: "Scholar",
      color: "#c794ff",
      taskXp: 12,
      intro: "I study artifacts and enchantment. Bring me an arcane shard and I will introduce the magical path.",
      workText: "Scholar work opens enchanting, artifacts, magical materials, and stronger ability growth.",
      taskTitle: "Recover 1 arcane shard",
      rewardText: "Scholar progress increased and magical insight granted.",
    },
  };

  const PROFESSION_REPUTATION_UNLOCKS = {
    merchant: [
      { reputation: 1, text: "Unlocks better trade payouts for wood deliveries." },
      { reputation: 3, text: "Unlocks stronger merchant delivery contracts." },
      { reputation: 5, text: "Unlocks the best tutorial market opportunities." },
    ],
  };

  Object.assign(tutorialProfessionState, Object.fromEntries(
    Object.keys(TUTORIAL_PROFESSIONS).map((professionId) => [
      professionId,
      {
        xp: 0,
        reputation: 1,
        claimedRewardRanks: [],
        completed: 0,
        introSeen: false,
        activeTask: null,
      },
    ])
  ));

  function getTutorialProfessionState(professionId) {
    return tutorialProfessionState[professionId];
  }

  function getProfessionXpRequired(reputation) {
    return 20 + (reputation - 1) * 10;
  }

  function getNextProfessionUnlock(professionId, reputation) {
    const unlocks = PROFESSION_REPUTATION_UNLOCKS[professionId] || [];
    return unlocks.find((entry) => entry.reputation > reputation) || null;
  }

  function buildProfessionProgressView(professionId) {
    const profession = TUTORIAL_PROFESSIONS[professionId];
    const state = getTutorialProfessionState(professionId);
    const xpRequired = getProfessionXpRequired(state.reputation);
    const nextUnlock = getNextProfessionUnlock(professionId, state.reputation);
    return {
      label: professionId === "mercenary" ? "XP Progress" : `${profession.label} XP Progress`,
      value: `${state.xp}/${xpRequired} XP`,
      percent: clamp(state.xp / xpRequired, 0, 1),
      reputationText: `${professionId === "mercenary" ? "" : `${profession.label} `}Reputation ${state.reputation}`,
      rankRewards: professionId === "mercenary" ? [
        { rank: 1, gold: 30 },
        { rank: 2, gold: 35 },
        { rank: 3, ability: "Sprint" },
      ].map((reward) => ({
        ...reward,
        unlocked: state.reputation > reward.rank,
        claimed: state.claimedRewardRanks.includes(reward.rank),
      })) : null,
      unlockText: nextUnlock
        ? `Next unlock at Reputation ${nextUnlock.reputation}: ${nextUnlock.text}`
        : "Nothing is unlocked next.",
    };
  }

  function awardMercenaryRankRewards() {
    const state = getTutorialProfessionState("mercenary");
    let goldAwarded = 0;
    for (const reward of buildProfessionProgressView("mercenary").rankRewards) {
      if (!reward.unlocked || state.claimedRewardRanks.includes(reward.rank)) continue;
      state.claimedRewardRanks.push(reward.rank);
      goldAwarded += reward.gold || 0;
    }
    player.money += goldAwarded;
    if (goldAwarded > 0) services.updateInventoryUI();
  }

  function awardTutorialProfessionProgress(professionId, xp, rewardMessage) {
    const state = getTutorialProfessionState(professionId);
    const previousReputation = state.reputation;
    state.xp += xp;
    state.completed += 1;

    while (state.xp >= getProfessionXpRequired(state.reputation)) {
      state.xp -= getProfessionXpRequired(state.reputation);
      state.reputation += 1;
    }

    if (professionId === "mercenary") awardMercenaryRankRewards();

    if (rewardMessage) {
      statusTextEl.textContent = rewardMessage;
    }
    if (professionId === "mercenary" && previousReputation <= 3 && state.reputation > 3) {
      services.updateInventoryAbilities();
      services.updateAbilityUI();
      const popup = document.createElement("div");
      popup.className = "ability-unlock-popup";
      popup.setAttribute("role", "status");
      const title = document.createElement("strong");
      title.textContent = "New ability unlocked: Sprint";
      const detail = document.createElement("span");
      detail.textContent = "Mercenary Reputation 3 completed! Equip Sprint in your inventory for +150% movement speed.";
      popup.append(title, detail);
      document.body.appendChild(popup);
      setTimeout(() => popup.remove(), 6500);
    }
  }

  return {
    updateUpgradeUI,
    registerUpgradeControls,
    getXpRequiredForLevel,
    updateXpUI,
    awardPlayerXp,
    applyUpgrade,
    CHARACTER_SAVE_PREFIX,
    SAVED_PLAYER_FIELDS,
    SAVED_EQUIPMENT_FIELDS,
    characterSaveKey,
    saveCharacterProgress,
    restoreCharacterProgress,
    registerProgressionPersistence,
    TUTORIAL_PROFESSIONS,
    PROFESSION_REPUTATION_UNLOCKS,
    tutorialProfessionState,
    getTutorialProfessionState,
    getProfessionXpRequired,
    getNextProfessionUnlock,
    buildProfessionProgressView,
    awardMercenaryRankRewards,
    awardTutorialProfessionProgress,
  };
}

export { createProgressionSystem };
