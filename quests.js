import { hero, player, quest, shootingRangeTutorial } from "./modules/state.js";
import { questObjectiveEl, questPanelEl, questTitleEl, statusTextEl } from "./modules/dom.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createQuestsSystem(services) {
  function markCampDiscovered(campId) {
    if (hasDiscoveredCamp(campId)) {
      return;
    }

    quest.discoveredCampIds.push(campId);
    const camp = services.getCampConfig(campId);
    if (camp?.discoveryXp) {
      services.awardTutorialProfessionProgress("explorer", camp.discoveryXp, "Hidden Goblin Camp discovered. Explorer progress increased.");
      services.spawnTextPopup(hero.x, hero.y - 26, `+${camp.discoveryXp} Exploration XP`, "rgba(126, 220, 205, 1)", 1.5);
    }
    ensureContractAvailability();
    updateQuestUI();
  }

  function getQuestObjectiveText() {
    if (player.inWaveWorld) return services.getWaveModeStatus();
    if (player.inVillageWorld) {
      if (shootingRangeTutorial.started && !shootingRangeTutorial.completed) {
        return "Speak to the Shooting Instructor and read the range rules.";
      }
      const task = services.getTutorialProfessionState("mercenary").activeTask;
      if (task) return task.status === "readyToTurnIn"
        ? "Return to the Mercenary for your reward."
        : "Defeat the training raider east of the village.";
      return "Talk to the Mercenary or visit the shooting range on the far right of the map.";
    }
    const activeContract = getActiveContract();
    if (player.inTutorialWorld) {
      if (activeContract && quest.activeContractStage === "active") {
        return `${activeContract.title}\n${getContractProgressText(activeContract)}`;
      }
      if (activeContract && quest.activeContractStage === "readyToTurnIn") {
        return `${activeContract.title}\nReturn to the Mercenary Captain.`;
      }
      if (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp")) {
        return "Explore off the main forest paths to find the hidden goblin camp.";
      }
      if (shootingRangeTutorial.started && !shootingRangeTutorial.completed) {
        return "Speak to the Shooting Instructor and read the range rules.";
      }
      const activeTasks = Object.entries(services.tutorialProfessionState)
        .filter(([, state]) => state.activeTask && state.activeTask.status !== "completed")
        .map(([professionId]) => `${services.TUTORIAL_PROFESSIONS[professionId].label}: ${services.TUTORIAL_PROFESSIONS[professionId].taskTitle}`);
      return activeTasks.length ? activeTasks.slice(0, 2).join(" • ") : "Talk to the guides to learn each career path.";
    }

    if (activeContract && quest.activeContractStage === "active") {
      return `${activeContract.title}\n${getContractProgressText(activeContract)}`;
    }
    if (activeContract && quest.activeContractStage === "readyToTurnIn") {
      return `${activeContract.title}\nReturn to the Mercenary Captain.`;
    }
    if (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp")) {
      return "Explore off the main forest paths to find the hidden goblin camp.";
    }
    return "No contract posted right now.";
  }

  function updateQuestUI() {
    if (player.inWaveWorld) {
      questPanelEl.classList.remove("hidden");
      questTitleEl.textContent = "Wave Mode";
      questObjectiveEl.textContent = services.getWaveModeStatus();
      return;
    }
    if (player.inVillageWorld) {
      questPanelEl.classList.remove("hidden");
      questTitleEl.textContent = "Village";
      questObjectiveEl.textContent = getQuestObjectiveText();
      return;
    }
    if (player.inTutorialWorld) {
      const showingContract = Boolean(getActiveContract()) || (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp"));
      const visible = player.tutorialPathsUnlocked || showingContract;
      questPanelEl.classList.toggle("hidden", !visible);
      if (!visible) {
        return;
      }
      questPanelEl.classList.remove("hidden");
      questTitleEl.textContent = showingContract ? "Mercenary Contract" : "Tutorial Paths";
      questObjectiveEl.textContent = getQuestObjectiveText();
      return;
    }
    const visible = Boolean(getActiveContract()) || (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp"));
    questPanelEl.classList.toggle("hidden", !visible);
    if (!visible) {
      return;
    }
    questTitleEl.textContent = "Mercenary Contract";
    questObjectiveEl.textContent = getQuestObjectiveText();
  }

  const MERCENARY_CONTRACTS = {
    knownCamp: {
      id: "knownCamp",
      title: "Clear the Goblin Camp",
      campId: "knownCamp",
      discoveryRequired: false,
      requirements: {
        goblin: 5,
        goblinArcher: 2,
        ogre: 1,
      },
      rewards: {
        gold: 90,
        xp: 60,
        mercenaryXp: 18,
        lootChance: 0.55,
        lootTable: ["enemyHelmet", "healthBuff", "weaponBuff"],
      },
      offerLines: [
        "A goblin camp has settled deeper in the forest and they are testing our roads.",
        "Clear it out. I need five goblins, two archers, and their ogre brute dead.",
      ],
      progressLines: [
        "Hold the line and finish the camp. I only pay for confirmed kills.",
      ],
      completionLines: [
        "The known camp is broken. Good work.",
        "Take your pay. Keep roaming. There may be a second camp hidden in those trees.",
      ],
    },
    hiddenCamp: {
      id: "hiddenCamp",
      title: "Break the Hidden Goblin Camp",
      campId: "hiddenCamp",
      discoveryRequired: true,
      requirements: {
        goblin: 6,
        goblinArcher: 3,
        ogre: 1,
      },
      rewards: {
        gold: 160,
        xp: 110,
        mercenaryXp: 30,
        lootChance: 0.85,
        lootTable: ["rareHelmet", "weaponBuff", "enemyHelmet"],
      },
      offerLines: [
        "You found their hidden camp. Hit it before they spread farther.",
        "This one is tougher. Break their whole warband and come back standing.",
      ],
      progressLines: [
        "The hidden camp is still active. Finish the harder contract and report back.",
      ],
      completionLines: [
        "That hidden camp was the real nest.",
        "You earned the heavier contract pay. More work will open as the frontier expands.",
      ],
    },
  };

  function getContractConfig(contractId) {
    return MERCENARY_CONTRACTS[contractId] || null;
  }

  function hasCompletedContract(contractId) {
    return quest.completedContractIds.includes(contractId);
  }

  function hasDiscoveredCamp(campId) {
    return quest.discoveredCampIds.includes(campId);
  }

  function getNextAvailableContractId() {
    if (!hasCompletedContract("knownCamp")) {
      return "knownCamp";
    }
    if (!hasCompletedContract("hiddenCamp") && hasDiscoveredCamp("hiddenCamp")) {
      return "hiddenCamp";
    }
    return null;
  }

  function ensureContractAvailability() {
    const nextContractId = getNextAvailableContractId();
    quest.availableContractIds = nextContractId ? [nextContractId] : [];
    if (!quest.activeContractId) {
      quest.activeContractStage = nextContractId ? "available" : "idle";
    }
  }

  function buildContractProgress(requirements) {
    return Object.fromEntries(
      Object.keys(requirements).map((kind) => [kind, 0])
    );
  }

  function getActiveContract() {
    return quest.activeContractId ? getContractConfig(quest.activeContractId) : null;
  }

  function startMercenaryContract(contractId) {
    const contract = getContractConfig(contractId);
    if (!contract) {
      return false;
    }

    quest.activeContractId = contractId;
    quest.activeContractStage = "active";
    quest.progress = buildContractProgress(contract.requirements);
    quest.availableContractIds = [];
    updateQuestUI();
    return true;
  }

  function finishMercenaryContractObjective() {
    quest.activeContractStage = "readyToTurnIn";
    updateQuestUI();
    services.spawnTextPopup(hero.x, hero.y - 24, "Contract complete!", "rgba(214, 255, 176, 1)", 1.6);
    statusTextEl.textContent = "Return to the Mercenary Captain.";
  }

  function rollContractLootPickup(contractId) {
    const contract = getContractConfig(contractId);
    if (!contract || Math.random() > contract.rewards.lootChance) {
      return false;
    }

    const lootType = contract.rewards.lootTable[Math.floor(Math.random() * contract.rewards.lootTable.length)];
    const loot = {
      enemyHelmet: { type: "enemyHelmet", armorValue: 80, radius: 18 },
      rareHelmet: { type: "rareHelmet", armorValue: 85, radius: 18 },
      healthBuff: { type: "healthBuff", healthValue: 20, radius: 18 },
      weaponBuff: { type: "weaponBuff", damageValue: 2, radius: 18 },
    }[lootType];

    if (!loot) {
      return false;
    }

    services.spawnPickupDrop(loot, hero.x + 28, hero.y - 6);
    services.spawnTextPopup(hero.x, hero.y - 42, "Bonus loot dropped", "rgba(255, 228, 154, 1)", 1.4);
    return true;
  }

  function completeMercenaryContractTurnIn(contractId) {
    const contract = getContractConfig(contractId);
    if (!contract) {
      return;
    }

    player.money += contract.rewards.gold;
    services.awardPlayerXp(contract.rewards.xp, hero.x, hero.y);
    services.awardTutorialProfessionProgress(
      "mercenary",
      contract.rewards.mercenaryXp,
      "Mercenary contract completed. Reputation increased."
    );
    rollContractLootPickup(contractId);
    quest.completedContractIds.push(contractId);
    quest.activeContractId = null;
    quest.activeContractStage = "idle";
    quest.progress = null;
    ensureContractAvailability();
    services.updateInventoryUI();
    updateQuestUI();
    services.spawnTextPopup(hero.x, hero.y - 24, `+${contract.rewards.gold} Gold`, "rgba(255, 219, 146, 1)", 1.4);
    statusTextEl.textContent = `${contract.title} completed.`;
  }

  function getContractProgressText(contract) {
    const lines = [];
    for (const [kind, required] of Object.entries(contract.requirements)) {
      const label = kind === "goblin"
        ? "Goblins"
        : kind === "goblinArcher"
          ? "Archers"
          : "Ogre";
      const current = Math.min(required, quest.progress?.[kind] || 0);
      lines.push(`${label}: ${current}/${required}`);
    }
    return lines.join("\n");
  }

  function registerContractKill(enemy) {
    const contract = getActiveContract();
    if (!contract || quest.activeContractStage !== "active" || enemy.campId !== contract.campId) {
      return;
    }

    const required = contract.requirements[enemy.kind];
    if (!required) {
      return;
    }

    quest.progress[enemy.kind] = Math.min(required, (quest.progress[enemy.kind] || 0) + 1);
    const isComplete = Object.entries(contract.requirements).every(([kind, amount]) => (quest.progress[kind] || 0) >= amount);
    updateQuestUI();
    if (isComplete) {
      finishMercenaryContractObjective();
    }
  }

  return {
    markCampDiscovered,
    getQuestObjectiveText,
    updateQuestUI,
    MERCENARY_CONTRACTS,
    getContractConfig,
    hasCompletedContract,
    hasDiscoveredCamp,
    getNextAvailableContractId,
    ensureContractAvailability,
    buildContractProgress,
    getActiveContract,
    startMercenaryContract,
    finishMercenaryContractObjective,
    rollContractLootPickup,
    completeMercenaryContractTurnIn,
    getContractProgressText,
    registerContractKill,
  };
}

export { createQuestsSystem };
