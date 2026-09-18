import {
  TUTORIAL_WORLD,
  VILLAGE_WORLD,
} from "./modules/constants.js";
import {
  buyWeaponUpgradeBtn,
  closeTraderBtn,
  ctx,
  minimapCtx,
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
  statusTextEl,
  traderPanelEl,
  traderStatusEl,
} from "./modules/dom.js";
import {
  buildings,
  enemies,
  hero,
  nextId,
  player,
  quest,
  trader,
  villager,
} from "./modules/state.js";

// World and combat actions are injected to avoid a circular dependency on game.js.
function createNpcSystem({
  getContractConfig,
  getContractProgressText,
  getActiveContract,
  hasCompletedContract,
  hasDiscoveredCamp,
  startMercenaryContract,
  completeMercenaryContractTurnIn,
  TUTORIAL_PROFESSIONS,
  getTutorialProfessionState,
  awardTutorialProfessionProgress,
  buildProfessionProgressView,
  getProfessionXpRequired,
  awardPlayerXp,
  clamp,
  createUnit,
  distance,
  drawEntityCircle,
  drawNameplate,
  fireHumveeWeapon,
  getCharacterStatus,
  getEntityTargetPoint,
  getShootingLine,
  getShootingRangeConfig,
  getSmartMissileTarget,
  resetShootingRangeTutorial,
  spawnPickupDrop,
  spawnTextPopup,
  updateAbilityUI,
  updateInventoryAbilities,
  updateInventoryUI,
  updateQuestUI,
  updateStatsUI,
  HUMVEE_WEAPONS,
  tutorialPlots,
  tutorialSites,
  shootingRangeTutorial,
  SHOOTING_RANGE_TUTORIAL_XP,
  getEnemyHero,
}) {
  const npcState = { trainingDriver: null };

  const MAIN_WORLD_TRADER_POSITION = { x: trader.x, y: trader.y };

  const tutorialNpcs = [];

  const driverTriggerTile = { x: TUTORIAL_WORLD.spawnX - 300, y: TUTORIAL_WORLD.spawnY + 130, size: 96, triggered: false };

  const tutorialDialogue = {
    npcId: null,
    text: "",
    options: [],
    progressView: null,
    taskOffered: false,
    lineIndex: 0,
  };

  const SHOOTING_INSTRUCTOR_ID = "shootingInstructor";

  const SHOOTING_RANGE_DIALOGUE = [
    "Welcome to the shooting range. You can practice your aim on the two targets here.",
    "Stand behind the thick brown firing line. Keep your weapon pointed toward the targets and leave space for other shooters.",
    "Use the mouse to aim and left-click to fire. In semi-automatic mode, each click fires one round. Release the trigger before firing again.",
    "Stop firing before anyone goes downrange. Reload when needed, and keep your shots inside the target area.",
    "That covers the range rules. You are free to practice now. I will wait behind the bottom end of the firing line.",
  ];

  function renderProfessionRewards(progressView) {
    dialogueProgressUnlockEl.replaceChildren();
    if (!progressView.rankRewards) {
      dialogueProgressUnlockEl.textContent = progressView.unlockText;
      return;
    }

    const heading = document.createElement("div");
    heading.textContent = "Reputation Rewards";
    const rewards = document.createElement("div");
    rewards.className = "profession-rewards";
    for (const reward of progressView.rankRewards) {
      const tile = document.createElement("div");
      tile.className = "profession-reward";
      const badge = document.createElement("span");
      badge.className = "profession-reward-rank";
      badge.textContent = `Rep ${reward.rank}`;
      tile.appendChild(badge);

      if (reward.gold !== undefined) {
        const coin = document.createElement("img");
        coin.className = "profession-reward-coin";
        coin.src = "./images/coin.png";
        coin.alt = "Gold";
        const amount = document.createElement("span");
        amount.className = "profession-reward-amount";
        amount.textContent = String(reward.gold);
        const gold = document.createElement("span");
        gold.className = "profession-reward-gold";
        gold.append(coin, amount);
        tile.appendChild(gold);
      } else {
        const ability = document.createElement("span");
        ability.className = "profession-reward-ability";
        ability.textContent = reward.ability;
        const note = document.createElement("span");
        note.className = "profession-reward-note";
        note.textContent = reward.ability === "Sprint" ? "+150% speed" : "Coming soon";
        tile.append(ability, note);
      }
      if (reward.claimed) {
        const check = document.createElement("img");
        check.className = "profession-reward-check";
        check.src = "./images/check-mark.png";
        check.alt = "Claimed";
        tile.appendChild(check);
      }
      rewards.appendChild(tile);
    }
    dialogueProgressUnlockEl.append(heading, rewards);
  }

  function createTutorialNpc(professionId, x, y) {
    const profession = TUTORIAL_PROFESSIONS[professionId];
    tutorialNpcs.push({
      id: professionId,
      professionId,
      name: profession.label,
      x,
      y,
      radius: 22,
      color: profession.color,
      speed: 92,
      kind: "professionGuide",
    });
  }

  function createSpecialTutorialNpc(npcConfig) {
    tutorialNpcs.push({
      radius: 22,
      speed: 92,
      ...npcConfig,
    });
  }

  function initializeShootingRange() {
    createSpecialTutorialNpc({
      id: SHOOTING_INSTRUCTOR_ID,
      professionId: null,
      kind: "shootingInstructor",
      name: "Shooting Instructor",
      x: getShootingRangeConfig().instructorStartX,
      y: getShootingRangeConfig().instructorStartY,
      color: "#d88444",
      targetX: getShootingRangeConfig().instructorStartX,
      targetY: getShootingRangeConfig().instructorStartY,
    });
    resetShootingRangeTutorial();
  }

  function restoreMercenaryTrainingTask() {
    const task = getTutorialProfessionState("mercenary").activeTask;
    if (task?.status !== "active") return;
    const raider = createUnit("skeleton",
      player.inVillageWorld ? 940 + VILLAGE_WORLD.offset.x : TUTORIAL_WORLD.spawnX + 400,
      player.inVillageWorld ? 1500 + VILLAGE_WORLD.offset.y : TUTORIAL_WORLD.spawnY + 10, false);
    raider.displayName = "Training Raider";
    raider.tutorialProfessionId = "mercenary";
    task.enemyId = raider.id;
  }

  function startTutorialProfessionTask(professionId) {
    const state = getTutorialProfessionState(professionId);
    if (state.activeTask && state.activeTask.status !== "completed") {
      return false;
    }

    if (professionId === "farmer") {
      player.tutorialResources.seeds += 1;
      const plot = tutorialPlots.find((entry) => entry.id === "farmerPlot");
      if (plot) {
        plot.active = true;
        plot.state = "empty";
        plot.timer = 0;
      }
      state.activeTask = { id: "farmerStarter", status: "active" };
    } else if (professionId === "mercenary") {
      state.activeTask = { id: "mercenaryStarter", status: "active" };
      restoreMercenaryTrainingTask();
    } else if (professionId === "explorer") {
      const site = tutorialSites.find((entry) => entry.id === "explorerWaypoint");
      if (site) {
        site.active = true;
        site.discovered = false;
      }
      state.activeTask = { id: "explorerStarter", status: "active" };
    } else if (professionId === "merchant") {
      state.activeTask = { id: "merchantStarter", status: "active" };
    } else if (professionId === "craftsman") {
      const site = tutorialSites.find((entry) => entry.id === "craftsmanOre");
      if (site) {
        site.active = true;
        site.collected = false;
      }
      state.activeTask = { id: "craftsmanStarter", status: "active" };
    } else if (professionId === "scholar") {
      const site = tutorialSites.find((entry) => entry.id === "scholarShard");
      if (site) {
        site.active = true;
        site.collected = false;
      }
      state.activeTask = { id: "scholarStarter", status: "active" };
    }

    return true;
  }

  function isHeroNearVillager() {
    return !player.inWaveWorld && !player.inVillageWorld && distance(hero, villager) <= 80;
  }

  function isDialogueOpen() {
    return Boolean(quest.activeDialogue || tutorialDialogue.npcId);
  }

  function getNearbyTutorialNpc() {
    let closest = null;
    let closestDistance = Infinity;

    for (const npc of tutorialNpcs) {
      const dist = distance(hero, npc);
      if (dist <= 90 && dist < closestDistance) {
        closest = npc;
        closestDistance = dist;
      }
    }

    return closest;
  }

  function getShootingInstructor() {
    return getTutorialNpcById(SHOOTING_INSTRUCTOR_ID);
  }

  function closeTutorialDialogue() {
    tutorialDialogue.npcId = null;
    tutorialDialogue.text = "";
    tutorialDialogue.options = [];
    tutorialDialogue.progressView = null;
    tutorialDialogue.taskOffered = false;
    tutorialDialogue.lineIndex = 0;
  }

  function getTutorialNpcById(npcId) {
    return tutorialNpcs.find((npc) => npc.id === npcId) || null;
  }

  function buildTutorialDialogueOptions(npc) {
    if (npc.kind === "shootingInstructor") {
      return [];
    }

    const state = getTutorialProfessionState(npc.professionId);
    const options = [
      { id: "work", label: "1. Ask About Work" },
      { id: "progress", label: "3. View Progress" },
      { id: "leave", label: "4. Leave" },
    ];

    if (state.activeTask) {
      options.splice(1, 0, {
        id: "turnIn",
        label: "2. Turn In Task",
        disabled: state.activeTask.status !== "readyToTurnIn",
      });
    } else if (tutorialDialogue.taskOffered && !state.activeTask) {
      options.splice(1, 0, { id: "accept", label: "2. Accept Task" });
    }

    return options;
  }

  function openTutorialNpcMenu(npc, text = null, taskOffered = false, progressView = null) {
    if (npc.kind === "shootingInstructor") {
      tutorialDialogue.npcId = npc.id;
      tutorialDialogue.lineIndex = 0;
      tutorialDialogue.text = SHOOTING_RANGE_DIALOGUE[0];
      tutorialDialogue.progressView = null;
      tutorialDialogue.taskOffered = false;
      tutorialDialogue.options = [];
      shootingRangeTutorial.introSeen = true;
      shootingRangeTutorial.started = true;
      if (!shootingRangeTutorial.completed) shootingRangeTutorial.state = "briefing";
      updateQuestUI();
      updateDialogueUI();
      return;
    }

    const profession = TUTORIAL_PROFESSIONS[npc.professionId];
    const state = getTutorialProfessionState(npc.professionId);
    tutorialDialogue.npcId = npc.id;
    tutorialDialogue.text = text ?? (!state.introSeen ? profession.intro : profession.workText);
    tutorialDialogue.progressView = progressView;
    tutorialDialogue.taskOffered = taskOffered;
    tutorialDialogue.options = buildTutorialDialogueOptions(npc);
    state.introSeen = true;
    updateDialogueUI();
  }

  function completeTutorialProfessionTask(professionId) {
    const state = getTutorialProfessionState(professionId);
    if (!state.activeTask || state.activeTask.status !== "active") {
      return;
    }
    state.activeTask.status = "readyToTurnIn";
    spawnTextPopup(hero.x, hero.y - 26, `${TUTORIAL_PROFESSIONS[professionId].label} task ready`, "rgba(255, 238, 196, 1)", 1.1);
    updateQuestUI();
  }

  function turnInTutorialProfessionTask(professionId) {
    const state = getTutorialProfessionState(professionId);
    const profession = TUTORIAL_PROFESSIONS[professionId];
    if (!state.activeTask || state.activeTask.status !== "readyToTurnIn") {
      return false;
    }

    if (professionId === "farmer" && player.tutorialResources.wheat > 0) {
      player.tutorialResources.wheat -= 1;
      player.tutorialResources.seeds += 2;
    } else if (professionId === "merchant") {
      player.wood = Math.max(0, player.wood - 25);
      player.money += 35;
    } else if (professionId === "craftsman" && player.tutorialResources.ore > 0) {
      player.tutorialResources.ore -= 1;
      player.weaponBonusStat += 4;
    } else if (professionId === "scholar" && player.tutorialResources.arcaneDust > 0) {
      player.tutorialResources.arcaneDust -= 1;
      player.bonusAbilityDamage += 2;
    } else if (professionId === "mercenary") {
      player.money += 30;
    } else if (professionId === "explorer") {
      player.money += 15;
    }

    awardPlayerXp(profession.taskXp || 0);
    awardTutorialProfessionProgress(professionId, 12, `${profession.label}: ${profession.rewardText}`);
    state.activeTask.status = "completed";
    state.activeTask = null;
    updateInventoryUI();
    updateStatsUI();
    updateQuestUI();
    return true;
  }

  function advanceShootingInstructorDialogue() {
    const npc = getTutorialNpcById(tutorialDialogue.npcId);
    if (npc?.kind !== "shootingInstructor") return;
    if (tutorialDialogue.lineIndex < SHOOTING_RANGE_DIALOGUE.length - 1) {
      tutorialDialogue.lineIndex += 1;
      tutorialDialogue.text = SHOOTING_RANGE_DIALOGUE[tutorialDialogue.lineIndex];
      updateDialogueUI();
      return;
    }
    const shootingLine = getShootingLine();
    npc.targetX = shootingLine.x - npc.radius - 12;
    npc.targetY = shootingLine.y + shootingLine.h - npc.radius;
    closeTutorialDialogue();
    updateDialogueUI();
    completeShootingRangeTutorial();
  }

  function handleTutorialNpcOption(optionId) {
    const npc = getTutorialNpcById(tutorialDialogue.npcId);
    if (!npc) {
      return;
    }

    if (npc.kind === "shootingInstructor") {
      if (optionId === "next") advanceShootingInstructorDialogue();
      return;
    }

    const profession = TUTORIAL_PROFESSIONS[npc.professionId];
    const state = getTutorialProfessionState(npc.professionId);
    if (optionId === "leave") {
      closeTutorialDialogue();
      updateDialogueUI();
      statusTextEl.textContent = getCharacterStatus();
      return;
    }

    if (optionId === "work") {
      openTutorialNpcMenu(npc, `${profession.workText} Task available: ${profession.taskTitle}.`, !state.activeTask);
      return;
    }

    if (optionId === "progress") {
      openTutorialNpcMenu(
        npc,
        "",
        false,
        buildProfessionProgressView(npc.professionId)
      );
      return;
    }

    if (optionId === "turnIn") {
      if (turnInTutorialProfessionTask(npc.professionId)) {
        openTutorialNpcMenu(npc, `Good work. ${profession.rewardText}`);
      } else {
        openTutorialNpcMenu(npc, `You still need to finish: ${profession.taskTitle}.`);
      }
      return;
    }

    if (!state.activeTask) {
      startTutorialProfessionTask(npc.professionId);
      closeTutorialDialogue();
      updateDialogueUI();
      statusTextEl.textContent = `Task accepted: ${profession.taskTitle}.`;
    } else if (npc.professionId === "merchant" && player.wood >= 25) {
      completeTutorialProfessionTask("merchant");
      openTutorialNpcMenu(npc, "You have the wood. Ask about work again to turn it in.");
    } else {
      openTutorialNpcMenu(npc, `Current task: ${profession.taskTitle}.`);
    }
    updateInventoryUI();
    updateQuestUI();
  }

  function getQuestDialogueLines(dialogueKey, contractId = null) {
    const contract = contractId ? getContractConfig(contractId) : null;
    if (dialogueKey === "offerContract" && contract) {
      return contract.offerLines;
    }
    if (dialogueKey === "contractProgress" && contract) {
      const progressText = quest.activeContractStage === "active"
        ? getContractProgressText(contract).replace(/\n/g, ". ")
        : "Return to me for payment.";
      return [...contract.progressLines, progressText];
    }
    if (dialogueKey === "completeContract" && contract) {
      return contract.completionLines;
    }
    if (dialogueKey === "discoverHidden") {
      return [
        "You cleared the first camp, but there is nothing else on my board yet.",
        "Scout off the road. If you uncover another nest, I will post the harder contract.",
      ];
    }
    return [
      "The forest is quiet for the moment.",
      "Check back after you discover another threat.",
    ];
  }

  function openQuestDialogue(dialogueKey, action = null, contractId = null) {
    quest.activeDialogue = dialogueKey;
    quest.dialogueIndex = 0;
    quest.dialogueAction = action;
    quest.dialogueContractId = contractId;
    updateDialogueUI();
  }

  function closeQuestDialogue() {
    quest.activeDialogue = null;
    quest.dialogueIndex = 0;
    quest.dialogueAction = null;
    quest.dialogueContractId = null;
    updateDialogueUI();
  }

  function updateDialogueUI() {
    const open = isDialogueOpen();
    dialoguePanelEl.classList.toggle("hidden", !open);
    if (!open) {
      dialogueProgressEl.classList.add("hidden");
      dialogueOptionsEl.classList.add("hidden");
      dialogueOptionsEl.textContent = "";
      return;
    }

    if (tutorialDialogue.npcId) {
      const npc = getTutorialNpcById(tutorialDialogue.npcId);
      dialogueSpeakerEl.textContent = npc?.professionId === "mercenary" && tutorialDialogue.progressView
        ? "Progress"
        : npc?.name || "Guide";
      dialogueTextEl.textContent = tutorialDialogue.text;
      if (npc?.kind === "shootingInstructor") {
        dialogueProgressEl.classList.add("hidden");
        dialogueHintEl.textContent = "Press Space or click Next";
        dialogueHintEl.classList.remove("hidden");
        dialogueOptionsEl.textContent = "";
        dialogueOptionsEl.classList.remove("hidden");
        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "dialogue-option";
        nextButton.style.gridColumn = "1 / -1";
        nextButton.textContent = "Next";
        nextButton.addEventListener("click", advanceShootingInstructorDialogue);
        dialogueOptionsEl.appendChild(nextButton);
        return;
      }
      dialogueHintEl.textContent = "";
      dialogueHintEl.classList.add("hidden");
      if (tutorialDialogue.progressView) {
        dialogueProgressLabelEl.textContent = tutorialDialogue.progressView.label;
        dialogueProgressValueEl.textContent = tutorialDialogue.progressView.value;
        dialogueProgressFillEl.style.width = `${Math.round(tutorialDialogue.progressView.percent * 100)}%`;
        dialogueProgressReputationEl.textContent = tutorialDialogue.progressView.reputationText;
        renderProfessionRewards(tutorialDialogue.progressView);
        dialogueProgressEl.classList.remove("hidden");
      } else {
        dialogueProgressEl.classList.add("hidden");
        dialogueProgressFillEl.style.width = "0%";
      }
      dialogueOptionsEl.textContent = "";
      dialogueOptionsEl.classList.remove("hidden");
      const optionSlots = new Array(4).fill(null);
      for (const option of tutorialDialogue.options) {
        const match = option.label.match(/^(\d+)\./);
        const slotIndex = match ? Number(match[1]) - 1 : -1;
        if (slotIndex >= 0 && slotIndex < optionSlots.length) {
          optionSlots[slotIndex] = option;
        }
      }
      for (const option of optionSlots) {
        if (!option) {
          const spacer = document.createElement("div");
          spacer.className = "dialogue-option-spacer";
          spacer.setAttribute("aria-hidden", "true");
          dialogueOptionsEl.appendChild(spacer);
          continue;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dialogue-option";
        if (option.id === "leave") {
          button.classList.add("dialogue-option-leave");
        } else if (option.id === "turnIn") {
          button.classList.add(option.disabled ? "dialogue-option-turn-in-disabled" : "dialogue-option-turn-in-ready");
        }
        if (option.disabled) {
          button.disabled = true;
        }
        button.textContent = option.label;
        if (!option.disabled) {
          button.addEventListener("click", () => {
            handleTutorialNpcOption(option.id);
          });
        }
        dialogueOptionsEl.appendChild(button);
      }
      return;
    }

    const lines = getQuestDialogueLines(quest.activeDialogue, quest.dialogueContractId);
    dialogueProgressEl.classList.add("hidden");
    dialogueOptionsEl.classList.add("hidden");
    dialogueOptionsEl.textContent = "";
    dialogueHintEl.classList.remove("hidden");
    dialogueSpeakerEl.textContent = villager.name;
    dialogueTextEl.textContent = lines[quest.dialogueIndex] || "";
    const isLastLine = quest.dialogueIndex >= lines.length - 1;
    if (quest.dialogueAction === "acceptContract" && isLastLine) {
      dialogueHintEl.textContent = "Press Space to accept contract";
    } else if (quest.dialogueAction === "turnInContract" && isLastLine) {
      dialogueHintEl.textContent = "Press Space to claim reward";
    } else {
      dialogueHintEl.textContent = "Press Space to continue";
    }
  }

  function beginVillagerInteraction() {
    if (!isHeroNearVillager()) {
      return false;
    }

    const activeContract = getActiveContract();
    if (activeContract && quest.activeContractStage === "readyToTurnIn") {
      openQuestDialogue("completeContract", "turnInContract", activeContract.id);
    } else if (activeContract) {
      openQuestDialogue("contractProgress", null, activeContract.id);
    } else if (quest.availableContractIds.length > 0) {
      openQuestDialogue("offerContract", "acceptContract", quest.availableContractIds[0]);
    } else if (hasCompletedContract("knownCamp") && !hasDiscoveredCamp("hiddenCamp")) {
      openQuestDialogue("discoverHidden");
    } else {
      openQuestDialogue("noContract");
    }

    return true;
  }

  function beginTutorialNpcInteraction() {
    const npc = getNearbyTutorialNpc();
    if (!npc) {
      return false;
    }

    openTutorialNpcMenu(npc);
    return true;
  }

  function advanceQuestDialogue() {
    if (!isDialogueOpen()) {
      return false;
    }

    const lines = getQuestDialogueLines(quest.activeDialogue, quest.dialogueContractId);
    const isLastLine = quest.dialogueIndex >= lines.length - 1;
    if (!isLastLine) {
      quest.dialogueIndex += 1;
      updateDialogueUI();
      return true;
    }

    if (quest.dialogueAction === "acceptContract" && quest.dialogueContractId) {
      startMercenaryContract(quest.dialogueContractId);
      statusTextEl.textContent = `Contract accepted: ${getContractConfig(quest.dialogueContractId)?.title || "Mercenary contract"}.`;
    } else if (quest.dialogueAction === "turnInContract" && quest.dialogueContractId) {
      completeMercenaryContractTurnIn(quest.dialogueContractId);
    }

    closeQuestDialogue();
    return true;
  }

  function updateTraderUI() {
    traderPanelEl.classList.toggle("hidden", !player.traderOpen);
    buyWeaponUpgradeBtn.disabled = player.money < 50;
    traderStatusEl.textContent = `Current bonus: +${player.weaponBonusStat} weapon`;
  }

  function isHeroNearTrader() {
    return !player.inWaveWorld && distance(hero, trader) <= 190;
  }

  function moveTutorialNpcToward(npc, x, y, dt) {
    const dx = x - npc.x;
    const dy = y - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 2) {
      npc.x = x;
      npc.y = y;
      return true;
    }
    const step = Math.min(dist, npc.speed * dt);
    npc.x += (dx / dist) * step;
    npc.y += (dy / dist) * step;
    return false;
  }

  function completeShootingRangeTutorial() {
    if (shootingRangeTutorial.completed) {
      return;
    }

    shootingRangeTutorial.completed = true;
    shootingRangeTutorial.state = "completed";
    awardPlayerXp(SHOOTING_RANGE_TUTORIAL_XP);
    statusTextEl.textContent = getCharacterStatus();
    updateQuestUI();
  }

  function openTrader() {
    if (!isHeroNearTrader()) {
      statusTextEl.textContent = "Move closer to the Trader first.";
      return;
    }
    player.traderOpen = true;
    player.weaponDetailsOpen = false;
    updateTraderUI();
  }

  function closeTrader() {
    player.traderOpen = false;
    updateTraderUI();
  }

  function releaseDriverVehicle() {
    if (!npcState.trainingDriver) return;
    for (const vehicle of buildings) {
      if (vehicle.reservedDriverId === npcState.trainingDriver.id) vehicle.reservedDriverId = null;
      if (vehicle.driverId === npcState.trainingDriver.id) {
        vehicle.driverId = null;
        vehicle.isPlayer = npcState.trainingDriver.previousVehicleTeam ?? false;
        npcState.trainingDriver.x = vehicle.x + vehicle.w / 2;
        npcState.trainingDriver.y = vehicle.y + vehicle.h + npcState.trainingDriver.radius + 8;
      }
    }
    npcState.trainingDriver.vehicleId = null;
    npcState.trainingDriver.destinationId = null;
    npcState.trainingDriver.target = null;
  }

  function resetDriverTrigger() {
    releaseDriverVehicle();
    npcState.trainingDriver = null;
    driverTriggerTile.triggered = false;
  }

  function updateTrainingDriver(dt) {
    if (!player.inTutorialWorld) return;
    const tile = driverTriggerTile;
    if (!tile.triggered && hero.vehicleId === null && hero.hp > 0 && !hero.isDead
      && hero.x >= tile.x && hero.x <= tile.x + tile.size
      && hero.y >= tile.y && hero.y <= tile.y + tile.size) {
      tile.triggered = true;
      npcState.trainingDriver = { id: nextId(), name: "Driver", x: tile.x + tile.size / 2,
        y: tile.y + tile.size + 24, radius: 16, speed: 110,
        vehicleId: null, destinationId: null, target: null, searchTimer: 0 };
      spawnTextPopup(npcState.trainingDriver.x, npcState.trainingDriver.y - 30, "Driver", "rgba(170, 225, 255, 1)", 1.2);
    }
    const driver = npcState.trainingDriver;
    if (!driver) return;
    let vehicle = buildings.find((entry) => entry.id === driver.vehicleId);
    if (driver.vehicleId !== null && (!vehicle || vehicle.hp <= 0 || vehicle.driverId !== driver.id)) {
      releaseDriverVehicle();
      vehicle = null;
    }
    if (!vehicle) {
      const available = buildings.filter((entry) => entry.type === "humvee" && entry.hp > 0
        && entry.id !== hero.vehicleId && !entry.driverId
        && (!entry.reservedDriverId || entry.reservedDriverId === driver.id));
      const nearest = available.reduce((best, entry) => !best
        || distance(driver, getEntityTargetPoint(entry)) < distance(driver, getEntityTargetPoint(best)) ? entry : best, null);
      if (driver.destinationId !== nearest?.id) {
        for (const entry of buildings) if (entry.reservedDriverId === driver.id) entry.reservedDriverId = null;
        driver.destinationId = nearest?.id ?? null;
      }
      if (!nearest) return;
      nearest.reservedDriverId = driver.id;
      const point = getEntityTargetPoint(nearest);
      moveTutorialNpcToward(driver, point.x, point.y, dt);
      const edgeDistance = Math.hypot(driver.x - clamp(driver.x, nearest.x, nearest.x + nearest.w),
        driver.y - clamp(driver.y, nearest.y, nearest.y + nearest.h));
      if (edgeDistance > driver.radius + 6) return;
      nearest.driverId = driver.id;
      nearest.reservedDriverId = null;
      driver.previousVehicleTeam = nearest.isPlayer;
      nearest.isPlayer = true;
      driver.vehicleId = nearest.id;
      driver.destinationId = null;
      driver.searchTimer = 0;
      vehicle = nearest;
      spawnTextPopup(point.x, nearest.y - 30, "Driver aboard", "rgba(170, 225, 255, 1)", 1.2);
    }
    driver.x = vehicle.x + vehicle.w / 2;
    driver.y = vehicle.y + vehicle.h / 2;
    vehicle.gunCooldown = Math.max(0, vehicle.gunCooldown - dt);
    const origin = { x: driver.x, y: vehicle.y + vehicle.h * 0.2 };
    const range = HUMVEE_WEAPONS[vehicle.mountedWeapon].range;
    const target = driver.target;
    const valid = target && target.hp > 0 && target.active !== false
      && (enemies.includes(target) || (target === getEnemyHero() && getEnemyHero().active)
        || (buildings.includes(target) && !target.isPlayer && target.hp > 0))
      && distance(origin, getEntityTargetPoint(target)) <= range;
    driver.searchTimer -= dt;
    if ((target && !valid) || driver.searchTimer <= 0) {
      driver.target = getSmartMissileTarget(origin, vehicle.id, range, false);
      driver.searchTimer = 0.25;
    }
    if (driver.target) {
      const point = getEntityTargetPoint(driver.target);
      vehicle.facingLeft = point.x < origin.x;
      fireHumveeWeapon(vehicle, point.x, point.y);
    }
  }

  function drawTrainingDriver() {
    if (!player.inTutorialWorld) return;
    const tile = driverTriggerTile;
    ctx.save();
    ctx.fillStyle = tile.triggered ? "#555f56" : "#3e7290";
    ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
    ctx.strokeStyle = "#bfe5ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x, tile.y, tile.size, tile.size);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 14px Chakra Petch";
    ctx.textAlign = "center";
    ctx.fillText("DRIVER", tile.x + tile.size / 2, tile.y + 40);
    ctx.font = "12px Chakra Petch";
    ctx.fillText(tile.triggered ? "ACTIVATED" : "WALK HERE", tile.x + tile.size / 2, tile.y + 62);
    if (npcState.trainingDriver && npcState.trainingDriver.vehicleId === null) {
      const driver = npcState.trainingDriver;
      drawEntityCircle(driver, "#6b91b0", "#e9d5ad");
      drawNameplate(driver.x, driver.y - 32, "Driver", "rgba(15, 33, 24, 0.9)");
    }
    ctx.restore();
  }

  function drawTrader() {
    if (player.inWaveWorld) return;
    ctx.beginPath();
    ctx.fillStyle = "#c8a15e";
    ctx.arc(trader.x, trader.y, trader.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#5c3416";
    ctx.arc(trader.x, trader.y - 6, trader.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff1cf";
    ctx.font = "700 14px Chakra Petch";
    ctx.textAlign = "center";
    if (isHeroNearTrader()) {
      ctx.fillText("TRADER", trader.x, trader.y - 34);
    }
  }

  function drawVillager() {
    if (player.inWaveWorld || player.inVillageWorld) return;
    ctx.beginPath();
    ctx.fillStyle = "#c45d44";
    ctx.arc(villager.x, villager.y, villager.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#472216";
    ctx.arc(villager.x, villager.y - 7, villager.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff1cf";
    ctx.font = "700 14px Chakra Petch";
    ctx.textAlign = "center";
    if (isHeroNearVillager()) {
      ctx.fillText("MERCENARY CAPTAIN", villager.x, villager.y - 34);
    }
  }

  function drawTutorialNpcs() {
    for (const npc of tutorialNpcs) {
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f3ead0";
      ctx.beginPath();
      ctx.arc(npc.x, npc.y - 8, npc.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
      if (distance(hero, npc) <= 90) {
        drawNameplate(npc.x, npc.y - 40, npc.name, "rgba(15, 33, 24, 0.9)");
      }
      if (npc.kind === "shootingInstructor") {
        continue;
      }

      const professionState = getTutorialProfessionState(npc.professionId);
      const xpRequired = getProfessionXpRequired(professionState.reputation);
      const reputationProgress = clamp(professionState.xp / xpRequired, 0, 1);
      if (distance(hero, npc) <= 90) {
        drawNameplate(
          npc.x,
          npc.y - 88,
          `${professionState.xp}/${xpRequired} XP`,
          "rgba(33, 24, 15, 0.9)"
        );
        drawNameplate(
          npc.x,
          npc.y - 64,
          `Reputation ${professionState.reputation}`,
          "rgba(33, 24, 15, 0.9)",
          reputationProgress,
          npc.color
        );
      }
    }
  }

  function registerNpcControls() {
    buyWeaponUpgradeBtn.addEventListener("click", () => {
      if (!player.hasSelectedCharacter) {
        return;
      }
      if (!isHeroNearTrader()) {
        closeTrader();
        statusTextEl.textContent = "Move closer to the Trader first.";
        return;
      }
      if (player.money < 50) {
        statusTextEl.textContent = "You need 50 gold for a weapon enhancement.";
        return;
      }
      player.money -= 50;
      player.weaponBonusStat += 10;
      player.weaponBonusDamage += 5;
      updateInventoryUI();
      updateStatsUI();
      updateTraderUI();
      statusTextEl.textContent = "Weapon enhanced. +10 weapon, +5 ability damage.";
    });

    closeTraderBtn.addEventListener("click", () => {
      closeTrader();
    });
  }

  function updateShootingInstructor(dt) {
    const instructor = getShootingInstructor();
    if (instructor && shootingRangeTutorial.completed && distance(hero, instructor) <= 220) {
      moveTutorialNpcToward(instructor, instructor.targetX, instructor.targetY, dt);
    }
  }

  function drawTutorialNpcMinimap(toMapX, toMapY) {
      for (const npc of tutorialNpcs) {
        minimapCtx.fillStyle = npc.color;
        minimapCtx.fillRect(toMapX(npc.x) - 2, toMapY(npc.y) - 2, 4, 4);
      }
  }

  function drawMainNpcMinimap(toMapX, toMapY) {
    minimapCtx.fillStyle = "#f6e1a8";
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(trader.x), toMapY(trader.y), 3, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.fillStyle = "#ffd87c";
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(villager.x), toMapY(villager.y), 3, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  function drawTutorialNpcHint() {
    const nearbyTutorialNpc = getNearbyTutorialNpc();
    if (nearbyTutorialNpc && !isDialogueOpen()) {
      ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
      ctx.fillRect(nearbyTutorialNpc.x - 58, nearbyTutorialNpc.y + 34, 116, 26);
      ctx.fillStyle = "#fff5d2";
      ctx.font = "600 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("Press Space", nearbyTutorialNpc.x, nearbyTutorialNpc.y + 52);
      return true;
    }

    return false;
  }

  function drawVillagerHint() {
    if (isHeroNearVillager() && !isDialogueOpen()) {
      ctx.fillStyle = "rgba(15, 33, 24, 0.82)";
      ctx.fillRect(villager.x - 58, villager.y + 34, 116, 26);
      ctx.fillStyle = "#fff5d2";
      ctx.font = "600 16px Chakra Petch";
      ctx.textAlign = "center";
      ctx.fillText("Press Space", villager.x, villager.y + 52);
      return true;
    }

    return false;
  }

  function populateTutorialNpcs() {
    tutorialNpcs.length = 0;
    createTutorialNpc("explorer", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY - 280);
    createTutorialNpc("scholar", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY - 170);
    createTutorialNpc("farmer", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY - 60);
    createTutorialNpc("merchant", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY + 50);
    createTutorialNpc("craftsman", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY + 160);
    createTutorialNpc("mercenary", TUTORIAL_WORLD.spawnX - 520, TUTORIAL_WORLD.spawnY + 270);
    initializeShootingRange();
    restoreMercenaryTrainingTask();
  }

  return {
    populateTutorialNpcs,
    drawVillagerHint,
    drawTutorialNpcHint,
    drawMainNpcMinimap,
    drawTutorialNpcMinimap,
    MAIN_WORLD_TRADER_POSITION,
    advanceQuestDialogue,
    advanceShootingInstructorDialogue,
    beginTutorialNpcInteraction,
    beginVillagerInteraction,
    closeQuestDialogue,
    closeTrader,
    closeTutorialDialogue,
    completeShootingRangeTutorial,
    completeTutorialProfessionTask,
    createTutorialNpc,
    drawTrader,
    drawTrainingDriver,
    drawTutorialNpcs,
    drawVillager,
    getNearbyTutorialNpc,
    getTutorialNpcById,
    handleTutorialNpcOption,
    initializeShootingRange,
    isDialogueOpen,
    isHeroNearTrader,
    isHeroNearVillager,
    npcState,
    openTrader,
    releaseDriverVehicle,
    restoreMercenaryTrainingTask,
    tutorialDialogue,
    tutorialNpcs,
    updateDialogueUI,
    updateShootingInstructor,
    updateTraderUI,
    updateTrainingDriver,
    registerNpcControls,
  };
}

export { createNpcSystem };
