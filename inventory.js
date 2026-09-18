import {combatSession} from './modules/combat-session.js';
import {getPlayerWorldId} from './modules/multiplayer.js';
import { distance } from "./modules/math.js";
import {
  hero,
  inventory,
  inventoryAbilityOrders,
  keys,
  mouse,
  nextId,
  pickups,
  player,
  runtime,
} from "./modules/state.js";
import {
  canvas,
  closeWeaponDetailsBtn,
  equipmentBodyArmorIconEl,
  equipmentBodyArmorMetaEl,
  equipmentBodyArmorNameEl,
  equipmentHelmetIconEl,
  equipmentHelmetMetaEl,
  equipmentHelmetNameEl,
  equipmentWeaponIconEl,
  equipmentWeaponMetaEl,
  equipmentWeaponNameEl,
  healthFillEl,
  healthValueEl,
  inventoryAbilitiesListEl,
  inventoryAbilityDetailsEl,
  inventoryListEl,
  inventoryScreenEl,
  inventoryStatEls,
  inventoryStatsPanelEl,
  inventoryTabEls,
  inventoryTabPanelEls,
  openInventoryBtn,
  playerPortraitEl,
  statusTextEl,
  weaponDetailUpgradeEls,
  weaponDetailsAmmoEffectEl,
  weaponDetailsAmmoEl,
  weaponDetailsBtnEl,
  weaponDetailsDamageEffectEl,
  weaponDetailsDamageEl,
  weaponDetailsFireRateEffectEl,
  weaponDetailsFireRateEl,
  weaponDetailsMetaEl,
  weaponDetailsNameEl,
  weaponDetailsPanelEl,
  weaponDetailsRangeEffectEl,
  weaponDetailsRangeEl,
  weaponDetailsReloadEffectEl,
  weaponDetailsReloadEl,
} from "./modules/dom.js";
import {
  COLORS,
  SOLDIER_BATTLE_MEDICINE_COOLDOWN,
  SOLDIER_BATTLE_MEDICINE_DURATION,
  SOLDIER_BATTLE_MEDICINE_HEAL,
  SOLDIER_BATTLE_MEDICINE_REGEN_BONUS,
  SOLDIER_GRENADE_COOLDOWN,
} from "./modules/constants.js";
import { inputState } from "./inputs.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createInventorySystem(services) {
  const INVENTORY_ABILITY_SLOT_LEVELS = [1, 1, 1, 2, 4, 6];

  const INVENTORY_ABILITY_SLOT_KEYS = ["F", "Q", "G", "1", "2", "3"];

  const INVENTORY_ABILITY_SLOT_POSITIONS = ["left-upper", "left-lower", "top-left", "top-right", "right-upper", "right-lower"];

  function hasInventoryItem(itemType) {
    return inventory.some((item) => item.type === itemType);
  }

  function addInventoryItem(item) {
    if (hasInventoryItem(item.type)) {
      return;
    }
    inventory.push(item);
    updateInventoryUI();
  }

  const equipmentHelmetSlot = document.getElementById("equipmentHelmetSlot");

  function equipBackpackHelmet(index) {
    if (combatSession.active) return combatSession.send?.({kind:'equipHelmet',index,angle:0});
    const helmet = player.backpack[index];
    if (!Number.isInteger(index) || !helmet || !["helmet", "rareHelmet", "goldHelmet", "enemyHelmet"].includes(helmet.type)) return;
    const previousHelmet = hero.equippedHelmetType ? {
      type: hero.equippedHelmetType,
      armorValue: hero.equippedArmorValue,
      radius: 18,
    } : null;
    if (previousHelmet) player.backpack[index] = previousHelmet;
    else player.backpack.splice(index, 1);
    hero.equippedHelmetType = helmet.type;
    hero.equippedArmorValue = helmet.armorValue;
    hero.latestPickup = { ...helmet };
    updateStatsUI();
    updateInventoryUI();
    const confirmation = document.createElement("p");
    const previousArmor = previousHelmet ? previousHelmet.armorValue + player.helmetBonusArmor : 0;
    confirmation.textContent = `${equipmentHelmetNameEl.textContent} equipped. Helmet armor: ${previousArmor} → ${getHelmetArmorValue()}.${previousHelmet ? " Previous helmet returned to your backpack." : " Helmet moved from your backpack."}`;
    document.getElementById("inventoryEquipmentDetails").replaceChildren(confirmation);
    clearTimeout(runtime.helmetSwapFeedbackTimeout);
    equipmentHelmetSlot.classList.remove("helmet-swap-complete");
    // Restart the single pulse for each swap, including rapid clicks.
    void equipmentHelmetSlot.offsetWidth;
    equipmentHelmetSlot.classList.add("helmet-swap-complete");
    runtime.helmetSwapFeedbackTimeout = setTimeout(() => {
      equipmentHelmetSlot.classList.remove("helmet-swap-complete");
    }, 2400);
  }

  function showEquippedHelmetDetails() {
    const description = document.createElement("p");
    description.textContent = equipmentHelmetNameEl.textContent === "None"
      ? "No helmet equipped."
      : `${equipmentHelmetNameEl.textContent} • Armor ${getHelmetArmorValue()}`;
    document.getElementById("inventoryEquipmentDetails").replaceChildren(description);
  }

  function registerInventoryControls() {
    equipmentHelmetSlot.addEventListener("click", showEquippedHelmetDetails);
    equipmentHelmetSlot.addEventListener("keydown", (event) => {
      if (event.target === equipmentHelmetSlot && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        showEquippedHelmetDetails();
      }
    });
    equipmentHelmetSlot.addEventListener("dragover", (event) => {
      if (runtime.draggedBackpackHelmetIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      equipmentHelmetSlot.classList.add("helmet-drop-ready");
    });
    equipmentHelmetSlot.addEventListener("dragleave", (event) => {
      if (!equipmentHelmetSlot.contains(event.relatedTarget)) equipmentHelmetSlot.classList.remove("helmet-drop-ready");
    });
    equipmentHelmetSlot.addEventListener("drop", (event) => {
      event.preventDefault();
      equipmentHelmetSlot.classList.remove("helmet-drop-ready");
      if (runtime.draggedBackpackHelmetIndex === null || !player.inventoryOpen) return;
      const index = runtime.draggedBackpackHelmetIndex;
      runtime.draggedBackpackHelmetIndex = null;
      equipBackpackHelmet(index);
    });
    const inventoryStatsResizeObserver = new ResizeObserver(syncInventoryPanelHeights);
    inventoryStatsResizeObserver.observe(inventoryStatsPanelEl);
    document.querySelectorAll(".inventory-equipment-locked").forEach((slot) => {
      slot.addEventListener("click", () => selectLockedInventorySlot(slot, "equipment"));
    });
    inventoryTabEls.forEach((tab) => {
      tab.addEventListener("click", () => selectInventoryTab(tab.dataset.inventoryTab));
      tab.addEventListener("keydown", (event) => {
        const visibleTabs = Array.from(inventoryTabEls).filter((entry) => !entry.classList.contains("hidden"));
        const index = visibleTabs.indexOf(tab);
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % visibleTabs.length;
        else if (event.key === "ArrowLeft") next = (index + visibleTabs.length - 1) % visibleTabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = visibleTabs.length - 1;
        else return;
        event.preventDefault();
        selectInventoryTab(visibleTabs[next].dataset.inventoryTab);
        visibleTabs[next].focus();
      });
    });
    openInventoryBtn.addEventListener("click", () => {
      if (player.hasSelectedCharacter && !player.inventoryOpen) {
        toggleInventoryScreen();
      }
    });
    weaponDetailsBtnEl.addEventListener("click", () => {
      if (player.weaponDetailsOpen) {
        closeWeaponDetails();
      } else {
        openWeaponDetails();
      }
    });
    closeWeaponDetailsBtn.addEventListener("click", () => {
      closeWeaponDetails();
    });
    weaponDetailUpgradeEls.forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyWeaponDetailUpgrade(element.dataset.weaponUpgrade);
      });
    });
  }

  function updateInventoryUI() {
    inventoryListEl.textContent = "";
    const backpackSlots = document.getElementById("inventoryBackpackSlots");
    const slotCount = player.backpackCapacity;
      backpackSlots.replaceChildren();
      for (let index = 0; index < slotCount; index += 1) {
        const slot = document.createElement("div");
        slot.className = "inventory-backpack-slot";
        slot.setAttribute("role", "listitem");
        slot.setAttribute("aria-label", `Empty backpack slot ${index + 1}`);
        const item = player.backpack[index];
        if (item) {
          const helmets = {
            helmet: ["Helmet", "#9ca7b8", "#edf3ff"],
            rareHelmet: ["Rare Helmet", "#4ea0ff", "#d2efff"],
            goldHelmet: ["Gold Helmet", "#d3a63a", "#fff0b3"],
            enemyHelmet: ["Enemy Helmet", "#78bf6f", "#ecffd8"]
          };
          const [name, fill, stroke] = helmets[item.type];
          const icon = document.createElement("img");
          icon.src = buildHelmetIcon(fill, stroke);
          icon.alt = name;
          icon.draggable = false;
          slot.draggable = true;
          slot.addEventListener("dragstart", (event) => {
            runtime.draggedBackpackHelmetIndex = index;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
          });
          slot.addEventListener("dragend", () => {
            runtime.draggedBackpackHelmetIndex = null;
            equipmentHelmetSlot.classList.remove("helmet-drop-ready");
          });
          slot.title = `${name} • Armor ${item.armorValue} • Click or drag to equip`;
          slot.setAttribute("aria-label", `${name} • Armor ${item.armorValue}`);
          const equipButton = document.createElement("button");
          equipButton.type = "button";
          equipButton.className = "inventory-backpack-equip";
          equipButton.setAttribute("aria-label", `Equip ${name}, armor ${item.armorValue}`);
          equipButton.appendChild(icon);
          equipButton.addEventListener("click", () => {
            if (!player.inventoryOpen || runtime.draggedBackpackHelmetIndex !== null) return;
            const restoreFocus = document.activeElement === equipButton;
            equipBackpackHelmet(index);
            if (restoreFocus) {
              const nextButton = backpackSlots.children[index]?.querySelector("button") || backpackSlots.querySelector("button");
              (nextButton || document.getElementById("inventoryEquipmentPanel")).focus({ preventScroll: true });
            }
          });
          slot.appendChild(equipButton);
        }
        backpackSlots.appendChild(slot);
      }

    const resources = [
      { label: "Wood", value: player.wood },
      { label: "Gold", value: player.money },
      { label: "Seeds", value: player.tutorialResources.seeds },
      { label: "Wheat", value: player.tutorialResources.wheat },
      { label: "Ore", value: player.tutorialResources.ore },
      { label: "Arcane Dust", value: player.tutorialResources.arcaneDust },
    ];

    for (const resource of resources) {
      if (resource.value <= 0 && resource.label !== "Wood" && resource.label !== "Gold") {
        continue;
      }
      const itemEl = document.createElement("div");
      itemEl.className = "inventory-item resource-item";
      itemEl.innerHTML = `<span>${resource.label}</span><strong>${resource.value}</strong>`;
      inventoryListEl.appendChild(itemEl);
    }

    if (!inventory.length) {
      const emptyEl = document.createElement("span");
      emptyEl.className = "inventory-empty";
      emptyEl.textContent = "No items yet";
      inventoryListEl.appendChild(emptyEl);
      return;
    }

    for (const item of inventory) {
      const itemEl = document.createElement("div");
      itemEl.className = "inventory-item";
      itemEl.textContent = `${item.name} • ${item.description}`;
      inventoryListEl.appendChild(itemEl);
    }
  }

  function getInventoryAbilities() {
    const selected = services.getSelectedClassConfig();
    const abilities = [];
    if (selected?.abilityName) {
      const descriptions = {
        engineerBolt: "Damage • Fire a 35-damage metal bolt that ignores 50% of enemy armor. 2s cooldown.",
        mark: "Damage • Mark the enemy under your cursor for 8 seconds. It takes 25% increased damage from you. 12s cooldown.",
        cone: "Strike enemies in an arc in front of you.",
        nova: "Release a blast that damages nearby enemies.",
        burst: `Fire a burst of ${selected.rounds || 7} rounds toward your aim.`,
        projectile: "Fire an arrow toward your aim.",
      };
      abilities.push({ name: selected.abilityName, key: "F", description: descriptions[selected.effect] || "Use your class ability.", cooldown: (!["mark", "engineerBolt"].includes(selected.effect) && !hero.hasRifle && !hero.hasBow && !hero.hasAxe) ? services.getClassWeaponCooldown(selected) : selected.cooldown, remaining: hero.slashTimer });
    }
    if (hero.selectedClass === "soldier") {
      abilities.push(
        { name: "Battle Medicine", key: "Q", description: `Restore ${SOLDIER_BATTLE_MEDICINE_HEAL} HP and gain +${SOLDIER_BATTLE_MEDICINE_REGEN_BONUS} regeneration for ${SOLDIER_BATTLE_MEDICINE_DURATION} seconds.`, cooldown: SOLDIER_BATTLE_MEDICINE_COOLDOWN, remaining: hero.battleMedicineCooldownRemaining },
        { name: "Grenade", key: "G", description: "Hold G to aim, then release to throw a grenade that damages nearby enemies.", cooldown: SOLDIER_GRENADE_COOLDOWN, remaining: hero.grenadeCooldownRemaining }
      );
    }
    if (services.isBountyHunter()) {
      abilities.push(
        { name: "Adrenaline Shot", key: "Q", description: "Support • Restore 30 HP immediately and gain 20% movement speed for 6 seconds.", cooldown: 20, remaining: hero.battleMedicineCooldownRemaining },
        { name: "Explosive Bolt", key: "G", description: "Damage • Hold G to aim, release to fire. Deal 45 damage to the direct target and 25 to other enemies within 80 units. 8s cooldown.", cooldown: 8, remaining: hero.grenadeCooldownRemaining }
      );
    }
    if (services.isEngineer()) {
      abilities.push(
        { name: "Repair Station", key: "Q", description: "Support • Place a station for 12 seconds. Allies within 150 units recover 6 HP/sec; friendly vehicles recover 12 HP/sec. Does not revive destroyed units.", cooldown: 25, remaining: hero.battleMedicineCooldownRemaining },
        { name: "Auto Turret", key: "G", description: "Damage / Support • Place a 100-HP turret at your location. Fires 10-damage bolts every 0.6 seconds at enemies within 320 units. Enemies can destroy it. Only one active; placing another replaces it.", cooldown: 30, remaining: hero.grenadeCooldownRemaining }
      );
    }
    if (hero.selectedClass === "robot") {
      abilities.push({ name: "Dash", key: "Shift", description: "Quickly dash in your movement direction.", cooldown: hero.dashCooldown, remaining: hero.dashCooldownRemaining });
    }
    if (selected && services.getTutorialProfessionState("mercenary").claimedRewardRanks.includes(3)) {
      abilities.push({ name: "Sprint", key: "Sprint", description: `Increase movement speed by 150% (2.5× normal speed) for ${services.SPRINT_DURATION} seconds.`, cooldown: services.SPRINT_COOLDOWN, remaining: hero.sprintCooldownRemaining });
    }
    return abilities;
  }

  function syncInventoryPanelHeights() {
    const height = inventoryStatsPanelEl.getBoundingClientRect().height;
    if (height > 0) {
      inventoryScreenEl.style.setProperty("--inventory-section-height", `${height}px`);
    }
  }

  function selectLockedInventorySlot(slot, type) {
    const isSkill = type === "skill";
    const container = isSkill ? inventoryAbilitiesListEl : document.getElementById("inventoryEquipmentPanel");
    container.querySelectorAll("button[aria-pressed]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button === slot));
    });
    if (isSkill) {
      document.querySelectorAll(".inventory-side-ability").forEach((button) => {
        button.setAttribute("aria-pressed", "false");
      });
    }
    const details = isSkill ? inventoryAbilityDetailsEl : document.getElementById("inventoryEquipmentDetails");
    const description = document.createElement("p");
    description.textContent = isSkill
      ? `Reach level ${slot.dataset.unlockLevel} to unlock this ability slot.`
      : `This ${type} is not yet available. Increase your character level to unlock more skill slots!`;
    details.replaceChildren(description);
  }

  function selectInventoryAbility(ability) {
    runtime.selectedInventoryAbilityName = ability?.name || null;
    inventoryAbilitiesListEl.querySelectorAll(".inventory-ability-locked, .inventory-ability-empty").forEach((slot) => {
      slot.setAttribute("aria-pressed", "false");
    });
    inventoryScreenEl.querySelectorAll("[data-ability-name]").forEach((card) => {
      card.setAttribute("aria-pressed", String(card.dataset.abilityName === runtime.selectedInventoryAbilityName));
    });
    inventoryAbilityDetailsEl.textContent = "";
    const title = document.createElement("h2");
    title.textContent = ability?.name || "Abilities";
    const description = document.createElement("p");
    description.textContent = ability?.description || "This character has no special abilities.";
    inventoryAbilityDetailsEl.append(title, description);
    if (ability) {
      const timing = document.createElement("p");
      timing.className = "inventory-ability-timing";
      timing.textContent = `Control: ${ability.key} • ${ability.cooldown}s cooldown • ${ability.remaining > 0 ? `${ability.remaining.toFixed(1)}s remaining` : "Ready"}`;
      inventoryAbilityDetailsEl.appendChild(timing);
    }
  }

  function getInventoryAbilityIcon(ability) {
    return {
      "Bolt Shot": "./images/bolt-shot.svg",
      "Repair Station": "./images/repair-station.svg",
      "Auto Turret": "./images/auto-turret.svg",
      "Hunter’s Mark": "./images/hunters-mark.svg",
      "Adrenaline Shot": "./images/adrenaline-shot.svg",
      "Explosive Bolt": "./images/explosive-bolt.svg",
      "Grenade": "./images/grenade.png",
      "Battle Medicine": "./images/medkit.png",
    }[ability.name] || null;
  }

  function getInventoryAbilitySlots() {
    const abilities = getInventoryAbilities();
    const savedOrder = inventoryAbilityOrders.get(hero.selectedClass) || [];
    const slots = INVENTORY_ABILITY_SLOT_LEVELS.map((level, index) =>
      player.level >= level && abilities.some((ability) => ability.name === savedOrder[index])
        ? savedOrder[index] : null);
    for (const ability of abilities) {
      if (ability.name === "Sprint" || slots.includes(ability.name)) continue;
      const empty = slots.findIndex((name, index) => !name && player.level >= INVENTORY_ABILITY_SLOT_LEVELS[index]);
      if (empty >= 0) slots[empty] = ability.name;
    }
    return slots;
  }

  function getOrderedInventoryAbilities() {
    const abilities = getInventoryAbilities();
    return getInventoryAbilitySlots().flatMap((name, slotIndex) => {
      if (!name) return [];
      const ability = abilities.find((entry) => entry.name === name);
      const key = INVENTORY_ABILITY_SLOT_KEYS[slotIndex];
      return [{
        ...ability,
        slotIndex,
        actionKey: ability.key,
        key,
        description: ability.key === "G" ? ability.description.replace("Hold G", `Hold ${key}`) : ability.description,
      }];
    });
  }

  function clearInventoryAbilityDrag() {
    runtime.draggedInventoryAbility = null;
    inventoryScreenEl.querySelectorAll(".ability-drop-ready").forEach((slot) => {
      slot.classList.remove("ability-drop-ready");
    });
  }

  function enableInventoryAbilityDrag(slot, ability, slotIndex = ability?.slotIndex) {
    slot.draggable = Boolean(ability);
    slot.addEventListener("dragstart", (event) => {
      if (!ability) return;
      runtime.draggedInventoryAbility = { name: ability.name, classId: hero.selectedClass };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", ability.name);
      // Snapshot a detached copy so grid transforms and scroll containers cannot clip it.
      const preview = slot.cloneNode(true);
      const originals = [slot, ...slot.querySelectorAll("*")];
      const copies = [preview, ...preview.querySelectorAll("*")];
      originals.forEach((original, index) => {
        const computed = getComputedStyle(original);
        for (const property of computed) {
          copies[index].style.setProperty(property, computed.getPropertyValue(property));
        }
        copies[index].removeAttribute("id");
      });
      const bounds = slot.getBoundingClientRect();
      Object.assign(preview.style, {
        position: "relative", inset: "auto", transform: "none", margin: "0",
        width: `${bounds.width}px`, height: `${bounds.height}px`, boxSizing: "border-box",
      });
      const dragImage = document.createElement("div");
      dragImage.setAttribute("aria-hidden", "true");
      Object.assign(dragImage.style, {
        position: "fixed", top: "0", left: "0", padding: "12px",
        width: "max-content", height: "max-content", pointerEvents: "none", zIndex: "2147483647",
      });
      dragImage.appendChild(preview);
      document.body.appendChild(dragImage);
      event.dataTransfer.setDragImage(dragImage, bounds.width / 2 + 12, bounds.height / 2 + 12);
      // Keep the copy rendered until the browser has captured the drag image.
      setTimeout(() => dragImage.remove(), 0);
    });
    const canDrop = () => player.inventoryOpen && runtime.draggedInventoryAbility
      && runtime.draggedInventoryAbility.classId === hero.selectedClass
      && player.level >= INVENTORY_ABILITY_SLOT_LEVELS[slotIndex]
      && runtime.draggedInventoryAbility.name !== ability?.name;
    slot.addEventListener("dragover", (event) => {
      if (!canDrop()) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      slot.classList.add("ability-drop-ready");
    });
    slot.addEventListener("dragleave", (event) => {
      if (!slot.contains(event.relatedTarget)) slot.classList.remove("ability-drop-ready");
    });
    slot.addEventListener("dragend", clearInventoryAbilityDrag);
    slot.addEventListener("drop", (event) => {
      if (!canDrop()) return;
      event.preventDefault();
      const order = getInventoryAbilitySlots();
      const source = order.indexOf(runtime.draggedInventoryAbility.name);
      const draggedName = runtime.draggedInventoryAbility.name;
      const target = slotIndex;
      clearInventoryAbilityDrag();
      if (target < 0) return;
      if (source < 0) order[target] = draggedName;
      else [order[source], order[target]] = [order[target], order[source]];
      inventoryAbilityOrders.set(hero.selectedClass, order);
      updateInventoryAbilities();
    });
  }

  function updateInventoryCharacterImage(image, selected = services.getSelectedClassConfig()) {
    let source = hero.selectedClass === "soldier" ? "./images/soldier-stationary.png" : (selected?.sprite || selected?.portrait);
    if (!source) {
      const shape = hero.selectedClass === "stickman"
        ? `<g fill="none" stroke="${COLORS.hero}" stroke-width="5" stroke-linecap="round"><circle cx="50" cy="24" r="12"/><path d="M50 36v40M28 57l22-12 22 12M50 76l-18 30m18-30 18 30"/></g>`
        : `<circle cx="50" cy="60" r="28" fill="${COLORS.hero}" stroke="${COLORS.heroAccent}" stroke-width="5"/>`;
      source = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">${shape}</svg>`)}`;
    }
    if (image.getAttribute("src") !== source) image.src = source;
    image.alt = selected?.name || "Player character";
    image.draggable = false;
  }

  function updateInventoryAbilities() {
    inventoryAbilitiesListEl.textContent = "";
    const characterImage = document.createElement("img");
    characterImage.className = "inventory-ability-character";
    updateInventoryCharacterImage(characterImage);
    inventoryAbilitiesListEl.appendChild(characterImage);
    const slots = getInventoryAbilitySlots();
    slots.forEach((name, index) => {
      if (name) return;
      const unlockLevel = INVENTORY_ABILITY_SLOT_LEVELS[index];
      const locked = player.level < unlockLevel;
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = locked ? "inventory-ability-locked" : "inventory-ability inventory-ability-empty";
      slot.dataset.position = INVENTORY_ABILITY_SLOT_POSITIONS[index];
      slot.dataset.unlockLevel = unlockLevel;
      slot.setAttribute("aria-pressed", "false");
      slot.setAttribute("aria-controls", "inventoryAbilityDetails");
      slot.setAttribute("aria-label", locked ? `Ability slot unlocks at level ${unlockLevel}` : `Empty ability slot, key ${INVENTORY_ABILITY_SLOT_KEYS[index]}`);
      slot.title = locked ? `Unlocks at level ${unlockLevel}` : "Drag an ability here to equip it";
      if (locked) {
        const lock = document.createElement("span");
        lock.className = "ability-lock-icon";
        lock.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.className = "inventory-ability-unlock-level";
        label.textContent = `Lv. ${unlockLevel}`;
        slot.append(lock, label);
        slot.addEventListener("click", () => selectLockedInventorySlot(slot, "skill"));
      } else {
        const label = document.createElement("span");
        label.className = "inventory-ability-name";
        label.textContent = "Empty";
        const badge = document.createElement("kbd");
        badge.className = "inventory-ability-key";
        badge.textContent = INVENTORY_ABILITY_SLOT_KEYS[index];
        slot.append(label, badge);
        enableInventoryAbilityDrag(slot, null, index);
        slot.addEventListener("click", () => {
          selectInventoryAbility(null);
          inventoryAbilityDetailsEl.querySelector("p").textContent = "Drag an ability onto this unlocked slot to equip it.";
          slot.setAttribute("aria-pressed", "true");
        });
      }
      inventoryAbilitiesListEl.appendChild(slot);
    });
    const abilities = getOrderedInventoryAbilities();
    const sideAbilities = document.getElementById("inventorySideAbilities");
    sideAbilities.replaceChildren();
    for (const available of getInventoryAbilities()) {
      const ability = abilities.find((entry) => entry.name === available.name)
        || { ...available, key: "Unequipped" };
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inventory-side-ability inventory-backpack-slot";
      button.dataset.abilityName = ability.name;
      enableInventoryAbilityDrag(button, ability);
      button.setAttribute("aria-label", `${ability.name} (${ability.key})`);
      button.setAttribute("aria-controls", "inventoryAbilityDetails");
      button.title = `${ability.name} (${ability.key})`;
      const iconPath = getInventoryAbilityIcon(ability);
      if (iconPath) {
        const icon = document.createElement("img");
        icon.src = iconPath;
        icon.alt = "";
        icon.draggable = false;
        button.appendChild(icon);
      } else {
        const name = document.createElement("span");
        name.className = "inventory-ability-name";
        name.textContent = ability.name;
        button.appendChild(name);
      }
      button.addEventListener("click", () => selectInventoryAbility(ability));
      sideAbilities.appendChild(button);
    }
    if (!abilities.length) {
      const empty = document.createElement("p");
      empty.className = "inventory-empty";
      empty.textContent = "No abilities yet.";
      sideAbilities.appendChild(empty);
    }
    if (!abilities.length) {
      const empty = document.createElement("p");
      empty.className = "inventory-empty";
      empty.textContent = "This character has no special abilities.";
      inventoryAbilitiesListEl.appendChild(empty);
      selectInventoryAbility(null);
      return;
    }
    for (const ability of abilities) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "inventory-ability";
      card.dataset.abilityName = ability.name;
      enableInventoryAbilityDrag(card, ability);
      card.setAttribute("aria-controls", "inventoryAbilityDetails");
      card.addEventListener("click", () => selectInventoryAbility(ability));
      card.dataset.position = INVENTORY_ABILITY_SLOT_POSITIONS[ability.slotIndex];
      card.setAttribute("aria-label", `${ability.name} — press ${ability.key} in game`);
      card.title = `Press ${ability.key} in game to use ${ability.name}`;
      const iconPath = getInventoryAbilityIcon(ability);
      if (iconPath) {
        const icon = document.createElement("img");
        icon.className = "inventory-ability-icon";
        icon.src = iconPath;
        icon.alt = "";
        icon.draggable = false;
        card.appendChild(icon);
      } else {
        const heading = document.createElement("span");
        heading.className = "inventory-ability-name";
        heading.textContent = ability.name;
        card.appendChild(heading);
      }
      const keyBadge = document.createElement("kbd");
      keyBadge.className = "inventory-ability-key";
      keyBadge.textContent = ability.key;
      keyBadge.setAttribute("aria-hidden", "true");
      card.appendChild(keyBadge);
      inventoryAbilitiesListEl.appendChild(card);
    }
    selectInventoryAbility(abilities.find((ability) => ability.name === runtime.selectedInventoryAbilityName) || abilities[0]);
  }

  function selectInventoryTab(tabName) {
    if (tabName === "humvee" && !services.getOccupiedHumvee()) tabName = "equipment";
    inventoryTabEls.forEach((tab) => {
      const active = tab.dataset.inventoryTab === tabName;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    inventoryTabPanelEls.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.inventoryPanel !== tabName);
    });
    if (tabName === "abilities") updateInventoryAbilities();
    if (tabName === "humvee") {
      services.updateHumveeInventory();
      document.getElementById("inventoryHumveeDetails").replaceChildren();
      document.querySelectorAll("[data-humvee-slot]").forEach((slot) => slot.setAttribute("aria-pressed", "false"));
    }
  }

  function toggleInventoryScreen() {
    player.inventoryOpen = !player.inventoryOpen;
    keys.clear();
    mouse.leftDown = false;
    services.cancelGrenadeAim();
    services.cancelHarvest();
    if (player.inventoryOpen) {
      services.closeTutorialDialogue();
      services.closeQuestDialogue();
      services.closeShop();
      services.closeTrader();
      closeWeaponDetails();
      player.isPlacingBuilding = false;
      inputState.selectionBox = null;
    }
    if (!player.inventoryOpen) closeWeaponDetails();
    inventoryScreenEl.classList.toggle("hidden", !player.inventoryOpen);
    if (player.inventoryOpen) {
      updateStatsUI();
      services.updateHumveeInventory();
      updateInventoryUI();
      updateInventoryAbilities();
      syncInventoryPanelHeights();
      inventoryScreenEl.focus();
    }
    else canvas.focus();
  }

  function isInterfacePanelOpen() {
    return player.inventoryOpen || player.shopOpen || player.traderOpen || player.weaponDetailsOpen;
  }

  function getWeaponUpgradeRules() {
    return {
      damage: { step: 2 },
      ammo: { step: 5 },
      reload: { step: 0.1 },
      range: { step: 40, meleeStep: 8 },
      fireRate: { rifleStep: 0.005, bowStep: 0.03, axeStep: 0.015, classStep: 0.2 },
    };
  }

  function getCurrentWeaponDetails() {
    const selected = services.getSelectedClassConfig();
    if (!selected) {
      return null;
    }

    if (hero.hasRifle) {
      return {
        type: "rifle",
        name: services.isEngineer() ? "Heavy Nail Gun" : services.isBountyHunter() ? "Trail Pistol" : "M4 Rifle",
        meta: services.isEngineer() ? "Industrial bolt driver" : services.isBountyHunter() ? "Compact precision sidearm" : "Automatic rifle",
        damage: `${services.getRifleDamage()} / shot`,
        ammo: hero.isReloading ? `${hero.ammo}/${hero.maxAmmo} reloading` : `${hero.ammo}/${hero.maxAmmo}`,
        reload: `${hero.reloadDuration.toFixed(1)}s`,
        range: `${services.getRifleRange()}`,
        fireRate: `${(1 / services.getRifleFireInterval()).toFixed(1)} shots/s`,
        upgrades: { damage: true, ammo: true, reload: true, range: true, fireRate: true },
      };
    }

    if (hero.hasBow) {
      const bowRange = Math.round(services.viewport.width * 0.5) + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step;
      const bowFireInterval = Math.max(0.12, 0.45 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.bowStep);
      return {
        type: "bow",
        name: "Bow",
        meta: "Precision ranged weapon",
        damage: `${services.getBasicBowDamage()} / shot`,
        ammo: "Unlimited",
        reload: "None",
        range: `${bowRange}`,
        fireRate: `${(1 / bowFireInterval).toFixed(1)} shots/s`,
        upgrades: { damage: true, ammo: false, reload: false, range: true, fireRate: true },
      };
    }

    if (hero.hasAxe) {
      const axeSwingDuration = Math.max(0.08, 0.22 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.axeStep);
      const axeRange = 64 + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep;
      return {
        type: "axe",
        name: "Axe",
        meta: "Close-range melee weapon",
        damage: `${services.getAxeDamage()} / swing`,
        ammo: "N/A",
        reload: "None",
        range: `${axeRange}`,
        fireRate: `${(1 / axeSwingDuration).toFixed(1)} swings/s`,
        upgrades: { damage: true, ammo: false, reload: false, range: true, fireRate: true },
      };
    }

    const classRange = selected.range && selected.range > 0
      ? selected.range + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.step
      : selected.radius
        ? selected.radius + player.weaponDetailRangeLevel * getWeaponUpgradeRules().range.meleeStep
        : 0;
    const classCooldown = services.getClassWeaponCooldown(selected);
    return {
      type: "class",
      name: selected.name || "Weapon",
      meta: "Class weapon",
      damage: `${services.getAbilityDamage(selected)}`,
      ammo: "N/A",
      reload: "None",
      range: classRange > 0 ? `${Math.round(classRange)}` : "Melee",
      fireRate: `${(1 / classCooldown).toFixed(1)} uses/s`,
      upgrades: { damage: true, ammo: false, reload: false, range: classRange > 0, fireRate: true },
    };
  }

  function syncWeaponDerivedStats() {
    hero.maxAmmo = services.getRifleMaxAmmo();
    hero.reloadDuration = services.getRifleReloadDuration();
    hero.axeSwingDuration = Math.max(0.08, 0.22 - player.weaponDetailFireRateLevel * getWeaponUpgradeRules().fireRate.axeStep);
    if (hero.hasRifle) {
      hero.ammo = Math.min(hero.ammo, hero.maxAmmo);
    }
  }

  function setWeaponDetailEffect(element, text, visible) {
    element.textContent = text;
    element.classList.toggle("hidden", !visible);
  }

  function updateWeaponDetailsUI() {
    weaponDetailsPanelEl.classList.toggle("hidden", !player.weaponDetailsOpen);
    if (!player.weaponDetailsOpen) {
      return;
    }

    const details = getCurrentWeaponDetails();
    if (!details) {
      weaponDetailsNameEl.textContent = "No Weapon";
      weaponDetailsMetaEl.textContent = "Select a character to view weapon stats.";
      weaponDetailsDamageEl.textContent = "-";
      weaponDetailsAmmoEl.textContent = "-";
      weaponDetailsReloadEl.textContent = "-";
      weaponDetailsRangeEl.textContent = "-";
      weaponDetailsFireRateEl.textContent = "-";
      setWeaponDetailEffect(weaponDetailsDamageEffectEl, "", false);
      setWeaponDetailEffect(weaponDetailsAmmoEffectEl, "", false);
      setWeaponDetailEffect(weaponDetailsReloadEffectEl, "", false);
      setWeaponDetailEffect(weaponDetailsRangeEffectEl, "", false);
      setWeaponDetailEffect(weaponDetailsFireRateEffectEl, "", false);
      weaponDetailUpgradeEls.forEach((element) => {
        element.disabled = true;
      });
      return;
    }

    weaponDetailsNameEl.textContent = details.name;
    weaponDetailsMetaEl.textContent = details.meta;
    weaponDetailsDamageEl.textContent = details.damage;
    weaponDetailsAmmoEl.textContent = details.ammo;
    weaponDetailsReloadEl.textContent = details.reload;
    weaponDetailsRangeEl.textContent = details.range;
    weaponDetailsFireRateEl.textContent = details.fireRate;
    setWeaponDetailEffect(
      weaponDetailsDamageEffectEl,
      `+${player.weaponDetailDamageLevel * getWeaponUpgradeRules().damage.step}`,
      player.weaponDetailDamageLevel > 0 && Boolean(details.upgrades?.damage)
    );
    setWeaponDetailEffect(
      weaponDetailsAmmoEffectEl,
      `+${player.weaponDetailAmmoLevel * getWeaponUpgradeRules().ammo.step}`,
      player.weaponDetailAmmoLevel > 0 && Boolean(details.upgrades?.ammo)
    );
    setWeaponDetailEffect(
      weaponDetailsReloadEffectEl,
      `-${(player.weaponDetailReloadLevel * getWeaponUpgradeRules().reload.step).toFixed(1)}s`,
      player.weaponDetailReloadLevel > 0 && Boolean(details.upgrades?.reload)
    );
    setWeaponDetailEffect(
      weaponDetailsRangeEffectEl,
      `+${player.weaponDetailRangeLevel * (details.type === "axe" || details.type === "class" && details.range === "Melee"
        ? getWeaponUpgradeRules().range.meleeStep
        : getWeaponUpgradeRules().range.step)}`,
      player.weaponDetailRangeLevel > 0 && Boolean(details.upgrades?.range)
    );
    const fireRateEffectStep = details.type === "rifle"
      ? getWeaponUpgradeRules().fireRate.rifleStep
      : details.type === "bow"
        ? getWeaponUpgradeRules().fireRate.bowStep
        : details.type === "axe"
          ? getWeaponUpgradeRules().fireRate.axeStep
          : getWeaponUpgradeRules().fireRate.classStep;
    setWeaponDetailEffect(
      weaponDetailsFireRateEffectEl,
      `-${(player.weaponDetailFireRateLevel * fireRateEffectStep).toFixed(1)}s`,
      player.weaponDetailFireRateLevel > 0 && Boolean(details.upgrades?.fireRate)
    );
    weaponDetailUpgradeEls.forEach((element) => {
      const upgradeId = element.dataset.weaponUpgrade;
      const allowed = Boolean(details.upgrades?.[upgradeId]);
      element.disabled = !allowed || player.upgradePoints <= 0;
    });
  }

  function openWeaponDetails() {
    if (!player.hasSelectedCharacter) {
      return;
    }
    services.closeShop();
    services.closeTrader();
    player.weaponDetailsOpen = true;
    updateWeaponDetailsUI();
  }

  function closeWeaponDetails() {
    player.weaponDetailsOpen = false;
    updateWeaponDetailsUI();
  }

  function applyWeaponDetailUpgrade(upgradeId) {
    const details = getCurrentWeaponDetails();
    if (!details || !details.upgrades?.[upgradeId]) {
      return;
    }
    if (player.upgradePoints <= 0) {
      statusTextEl.textContent = "You need an upgrade point.";
      return;
    }

    if (upgradeId === "damage") {
      player.weaponDetailDamageLevel += 1;
    } else if (upgradeId === "ammo") {
      player.weaponDetailAmmoLevel += 1;
    } else if (upgradeId === "reload") {
      player.weaponDetailReloadLevel += 1;
    } else if (upgradeId === "range") {
      player.weaponDetailRangeLevel += 1;
    } else if (upgradeId === "fireRate") {
      player.weaponDetailFireRateLevel += 1;
    } else {
      return;
    }

    player.upgradePoints -= 1;
    syncWeaponDerivedStats();
    services.updateUpgradeUI();
    updateStatsUI();
    updateWeaponDetailsUI();
    statusTextEl.textContent = `Weapon upgraded: ${upgradeId}.`;
  }

  function getBaseArmor(selected = services.getSelectedClassConfig()) {
    return selected?.stats?.armor || 0;
  }

  function getHelmetArmorValue() {
    if (hero.equippedArmorValue > 0) {
      return hero.equippedArmorValue + player.helmetBonusArmor;
    }

    return player.helmetBonusArmor;
  }

  function getTotalArmor(selected = services.getSelectedClassConfig()) {
    return Math.max(getBaseArmor(selected) + player.bonusArmor, getHelmetArmorValue());
  }

  function updateStatsUI() {
    const selected = services.getSelectedClassConfig();
    const stats = selected?.stats || { armor: 0, health: 0, weapon: 0, regen: 0 };
    const maxHealth = hero.maxHp || stats.health;
    const currentHealth = Math.max(0, Math.round(hero.hp || 0));
    const inventoryStats = {
      level: player.level,
      health: `${Math.round(maxHealth)}`,
      armor: Math.round(getTotalArmor(selected)),
      damage: Math.round(services.getHeroAttackDamage(selected)),
      speed: Math.round(services.getHeroSpeed(selected) * services.getRoadSpeedMultiplier()),
      regen: services.getHeroRegen(selected).toFixed(1),
      headshotChance: `${Number((services.getHeroHeadshotChance(selected) * 100).toFixed(1))}%`,
      headshotDamage: services.getHeroHeadshotDamage(selected),
      gold: player.money,
    };
    inventoryStatEls.forEach((element) => {
      element.textContent = String(inventoryStats[element.dataset.inventoryStat]);
    });

    const portraitSrc = hero.hp < maxHealth / 2
      ? "./images/soldier-damage.png"
      : "./images/soldier-mugshot.png";
    if (playerPortraitEl.getAttribute("src") !== portraitSrc) {
      playerPortraitEl.src = portraitSrc;
      playerPortraitEl.alt = hero.hp < maxHealth / 2 ? "Injured soldier portrait" : "Soldier portrait";
    }

    healthValueEl.textContent = `${currentHealth}/${Math.round(maxHealth)}`;
    healthFillEl.style.width = maxHealth > 0 ? `${Math.min(100, Math.max(0, (hero.hp / maxHealth) * 100))}%` : "0%";
    updateEquipmentUI(selected, stats);
    updateWeaponDetailsUI();
  }

  function buildHelmetIcon(fill, stroke) {
    const detailStroke = stroke === "#000000" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.35)";
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M16 31c0-10 7-18 16-18s16 8 16 18v8c0 2-2 4-4 4H20c-2 0-4-2-4-4z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M23 43v6h18v-6" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 29h16" stroke="${detailStroke}" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function buildBodyArmorIcon(fill, stroke) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M22 14h20l6 8-4 26H20l-4-26 6-8z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M26 14l6 8 6-8" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 30h16" stroke="rgba(255,255,255,0.2)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function buildWeaponOutlineIcon(stroke) {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="rgba(10,18,14,0.88)"/>
      <path d="M20 45l8-8 3 3-8 8h-7v-7l8-8 3 3" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M31 34l14-14 4 4-14 14" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M47 18l3-3 1 1-3 3" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 41l-5 5" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function updateEquipmentUI(selected, stats) {
    updateInventoryCharacterImage(document.querySelector(".inventory-equipment-character"), selected);
    const equippedWeaponType = hero.hasBow
      ? "bow"
      : hero.hasRifle
        ? "rifle"
        : hero.hasAxe
          ? "axe"
          : null;

    if (equippedWeaponType === "bow") {
      equipmentWeaponIconEl.src = "./images/bow.png";
      equipmentWeaponNameEl.textContent = "Bow";
      equipmentWeaponMetaEl.textContent = "Ranged weapon";
    } else if (equippedWeaponType === "rifle") {
      equipmentWeaponIconEl.src = services.isEngineer() ? "./images/nail-gun.svg" : services.isBountyHunter() ? "./images/trail-pistol.svg" : "./images/rifle.png";
      equipmentWeaponNameEl.textContent = services.isEngineer() ? "Heavy Nail Gun" : services.isBountyHunter() ? "Trail Pistol" : "M4 Rifle";
      equipmentWeaponMetaEl.textContent = services.isEngineer() ? "Industrial bolt driver" : services.isBountyHunter() ? "Compact precision sidearm" : "Automatic rifle";
    } else if (equippedWeaponType === "axe") {
      equipmentWeaponIconEl.src = "./images/sword.jpg";
      equipmentWeaponNameEl.textContent = "Axe";
      equipmentWeaponMetaEl.textContent = "Melee weapon";
    } else {
      equipmentWeaponIconEl.src = buildWeaponOutlineIcon("#000000");
      equipmentWeaponNameEl.textContent = "";
      equipmentWeaponMetaEl.textContent = "";
    }

    equipmentWeaponIconEl.style.opacity = equippedWeaponType ? "1" : "0.35";

    const equippedHelmetType = hero.latestPickup?.type === "helmet" ||
      hero.latestPickup?.type === "rareHelmet" ||
      hero.latestPickup?.type === "goldHelmet" ||
      hero.latestPickup?.type === "enemyHelmet"
      ? hero.latestPickup.type
      : hero.equippedHelmetType || (player.helmetBonusArmor > 0 ? "helmet" : null);

    const helmetArmorValue = getHelmetArmorValue();

    if (equippedHelmetType === "rareHelmet") {
      equipmentHelmetIconEl.src = buildHelmetIcon("#4ea0ff", "#d2efff");
      equipmentHelmetNameEl.textContent = "Rare Helmet";
      equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
    } else if (equippedHelmetType === "goldHelmet") {
      equipmentHelmetIconEl.src = buildHelmetIcon("#d3a63a", "#fff0b3");
      equipmentHelmetNameEl.textContent = "Gold Helmet";
      equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
    } else if (equippedHelmetType === "enemyHelmet") {
      equipmentHelmetIconEl.src = buildHelmetIcon("#78bf6f", "#ecffd8");
      equipmentHelmetNameEl.textContent = "Enemy Helmet";
      equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
    } else if (equippedHelmetType === "helmet") {
      equipmentHelmetIconEl.src = buildHelmetIcon("#9ca7b8", "#edf3ff");
      equipmentHelmetNameEl.textContent = "Helmet";
      equipmentHelmetMetaEl.textContent = `Armor ${helmetArmorValue}`;
    } else {
      equipmentHelmetIconEl.src = buildHelmetIcon("rgba(0,0,0,0)", "#000000");
      equipmentHelmetNameEl.textContent = "None";
      equipmentHelmetMetaEl.textContent = "No helmet equipped";
    }

    equipmentHelmetIconEl.style.opacity = equippedHelmetType ? "1" : "0.35";

    if (selected && stats.armor > 0) {
      equipmentBodyArmorIconEl.src = buildBodyArmorIcon("#87a8bf", "#eef6ff");
      equipmentBodyArmorNameEl.textContent = "Standard Armor";
      equipmentBodyArmorMetaEl.textContent = `Base armor ${stats.armor + player.bonusArmor}`;
      equipmentBodyArmorIconEl.style.opacity = "1";
    } else {
      equipmentBodyArmorIconEl.src = buildBodyArmorIcon("rgba(0,0,0,0)", "#111111");
      equipmentBodyArmorNameEl.textContent = "";
      equipmentBodyArmorMetaEl.textContent = "";
      equipmentBodyArmorIconEl.style.opacity = "0.9";
    }
  }

  function spawnRareHelmetDrop(x, y) {
    pickups.push({
      id: nextId(),
      type: "rareHelmet",
      x,
      y,
      radius: 18,
      collected: false,
      armorValue: 85,
    });
  }

  function spawnPickupDrop(pickup, x, y) {
    pickups.push({
      id: nextId(),
      type: pickup.type,
      x,
      y,
      radius: pickup.radius ?? 18,
      collected: false,
      pickupDelay: 0.3,
      armorValue: pickup.armorValue,
      healthValue: pickup.healthValue,
      damageValue: pickup.damageValue,
    });
  }

  function dropLatestPickupFromHero() {
    if (!hero.latestPickup) {
      return;
    }

    spawnPickupDrop(hero.latestPickup, hero.x, hero.y);
    hero.latestPickup = null;
  }

  function isManualPickupType(type) {
    return type === "helmet" ||
      type === "rareHelmet" ||
      type === "goldHelmet" ||
      type === "enemyHelmet" ||
      type === "axe" ||
      type === "rifle" ||
      type === "bow" ||
      type === "tutorialScroll";
  }

  function getWorldPickups() {
    return combatSession.active ? (combatSession.snapshot?.pickups || []).filter(p=>p.worldId===getPlayerWorldId(player)) : pickups;
  }
  function getNearbyPickup() {
    const pickup = getWorldPickups().find(
      (pickup) => !pickup.collected &&
        !pickup.pickupDelay &&
        isManualPickupType(pickup.type) &&
        distance(hero, pickup) <= hero.radius + pickup.radius + 16
    ) || null;
    // E marks the supplied record collected; never mutate the authoritative snapshot.
    return combatSession.active && pickup ? {...pickup} : pickup;
  }

  function equipPickup(pickup) {
    if (combatSession.active) return combatSession.send?.({kind:'collect',pickupId:pickup.id,angle:0});
    if (pickup.type === "tutorialScroll") {
      player.tutorialPathsUnlocked = true;
      statusTextEl.textContent = "Quest started: Tutorial Paths.";
      services.spawnTextPopup(pickup.x, pickup.y - 24, "Quest: Tutorial Paths", "rgba(255, 236, 184, 1)", 1.2);
      services.updateQuestUI();
      return;
    }

    if (pickup.type === "helmet" || pickup.type === "rareHelmet" || pickup.type === "goldHelmet" || pickup.type === "enemyHelmet") {
      const previousArmor = getTotalArmor();
      if (hero.equippedHelmetType) {
        if (player.backpack.length >= player.backpackCapacity) {
          pickup.collected = false;
          statusTextEl.textContent = "Backpack full. Make room before picking up another helmet.";
          return;
        }
        player.backpack.push({
          type: hero.equippedHelmetType,
          armorValue: hero.equippedArmorValue,
          radius: 18,
        });
      }
      hero.equippedArmorValue = pickup.armorValue;
      hero.equippedHelmetType = pickup.type;
      hero.latestPickup = {
        type: pickup.type,
        armorValue: pickup.armorValue,
        radius: pickup.radius,
      };
      const armorDelta = getTotalArmor() - previousArmor;
      updateStatsUI();
      updateInventoryUI();
      if (pickup.type === "rareHelmet") {
        services.spawnTextPopup(pickup.x, pickup.y - 22, "Rare Helmet picked up!", "rgba(120, 196, 255, 1)", 1.8);
        services.spawnTextPopup(pickup.x, pickup.y + 4, `Rare Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(120, 196, 255, 1)", 1.8);
      } else if (pickup.type === "goldHelmet") {
        services.spawnTextPopup(pickup.x, pickup.y - 22, "Gold Helmet equipped!", "rgba(255, 226, 148, 1)", 1.8);
        services.spawnTextPopup(pickup.x, pickup.y + 4, `Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(255, 244, 196, 1)", 1.8);
      } else if (pickup.type === "enemyHelmet") {
        services.spawnTextPopup(pickup.x, pickup.y - 22, "Enemy Helmet picked up!", "rgba(170, 255, 170, 1)", 1.8);
        services.spawnTextPopup(pickup.x, pickup.y + 4, `Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(170, 255, 170, 1)", 1.8);
      } else {
        services.spawnTextPopup(pickup.x, pickup.y - 22, "Helmet equipped!", "rgba(196, 234, 255, 1)", 1.8);
        services.spawnTextPopup(pickup.x, pickup.y + 4, `Armor ${armorDelta >= 0 ? "+" : ""}${armorDelta}`, "rgba(156, 245, 164, 1)", 1.8);
      }
      return;
    }

    if (pickup.type === "axe") {
      if (hero.weaponPickupCooldown > 0) {
        pickup.collected = false;
        return;
      }
      swapHeroWeaponPickup("axe", pickup.x, pickup.y, pickup.radius);
      hero.hasAxe = true;
      hero.weaponPickupCooldown = 0.8;
      syncWeaponDerivedStats();
      hero.latestPickup = {
        type: "axe",
        radius: pickup.radius,
      };
      updateStatsUI();
      services.spawnTextPopup(pickup.x, pickup.y - 12, "Axe equipped!", "rgba(255, 214, 164, 1)", 1.8);
      services.spawnTextPopup(pickup.x, pickup.y + 12, "Click to swing", "rgba(255, 236, 201, 1)", 1.8);
      return;
    }

    if (pickup.type === "rifle") {
      if (hero.weaponPickupCooldown > 0) {
        pickup.collected = false;
        return;
      }
      swapHeroWeaponPickup("rifle", pickup.x, pickup.y, pickup.radius);
      hero.hasRifle = true;
      hero.rifleFireMode = "automatic";
      hero.weaponPickupCooldown = 0.8;
      syncWeaponDerivedStats();
      hero.ammo = hero.maxAmmo;
      hero.isReloading = false;
      hero.reloadTimer = 0;
      hero.latestPickup = {
        type: "rifle",
        radius: pickup.radius,
      };
      updateStatsUI();
      services.spawnTextPopup(pickup.x, pickup.y - 12, "M4 equipped!", "rgba(196, 234, 255, 1)", 1.8);
      services.spawnTextPopup(pickup.x, pickup.y + 12, "Left-click to fire", "rgba(196, 234, 255, 1)", 1.8);
      return;
    }

    if (pickup.type === "bow") {
      if (hero.weaponPickupCooldown > 0) {
        pickup.collected = false;
        return;
      }
      swapHeroWeaponPickup("bow", pickup.x, pickup.y, pickup.radius);
      hero.hasBow = true;
      hero.bowCooldown = 0;
      hero.weaponPickupCooldown = 0.8;
      syncWeaponDerivedStats();
      hero.latestPickup = {
        type: "bow",
        radius: pickup.radius,
      };
      updateStatsUI();
      services.spawnTextPopup(pickup.x, pickup.y - 12, "Bow equipped!", "rgba(214, 200, 154, 1)", 1.8);
      services.spawnTextPopup(pickup.x, pickup.y + 12, "Hold left-click to fire", "rgba(245, 234, 196, 1)", 1.8);
    }
  }

  function swapHeroWeaponPickup(nextWeaponType, x, y, radius) {
    if (nextWeaponType === "axe" && hero.hasRifle) {
      spawnPickupDrop({ type: "rifle", radius }, x + 18, y);
      hero.hasRifle = false;
      hero.ammo = 0;
      hero.isReloading = false;
      hero.reloadTimer = 0;
    }

    if (nextWeaponType === "bow" && hero.hasRifle) {
      spawnPickupDrop({ type: "rifle", radius }, x + 18, y);
      hero.hasRifle = false;
      hero.ammo = 0;
      hero.isReloading = false;
      hero.reloadTimer = 0;
    }

    if (nextWeaponType === "bow" && hero.hasAxe) {
      spawnPickupDrop({ type: "axe", radius }, x - 18, y);
      hero.hasAxe = false;
      hero.axeSwingTimer = 0;
    }

    if ((nextWeaponType === "axe" || nextWeaponType === "rifle") && hero.hasBow) {
      spawnPickupDrop({ type: "bow", radius }, x, y + 18);
    }

    if ((nextWeaponType === "axe" || nextWeaponType === "rifle" || nextWeaponType === "bow") && hero.hasBow) {
      hero.hasBow = false;
      hero.bowCooldown = 0;
    }

    if (nextWeaponType === "rifle" && hero.hasAxe) {
      spawnPickupDrop({ type: "axe", radius }, x - 18, y);
      hero.hasAxe = false;
      hero.axeSwingTimer = 0;
    }
  }

  function updateAutomaticPickups(dt) {
    if (combatSession.active) {
      const pickup=getWorldPickups().find(p=>!p.pickupDelay && ['healthBuff','weaponBuff'].includes(p.type) && distance(hero,p)<=hero.radius+p.radius);
      if(pickup && !hero.isDead) combatSession.send?.({kind:'collect',pickupId:pickup.id,angle:0});
      return;
    }
    for (const pickup of pickups) {
      if (pickup.pickupDelay) {
        pickup.pickupDelay = Math.max(0, pickup.pickupDelay - dt);
      }

      if (!pickup.collected && !pickup.pickupDelay && distance(hero, pickup) <= hero.radius + pickup.radius) {
        if (isManualPickupType(pickup.type)) {
          continue;
        }

        pickup.collected = true;
        if (pickup.type === "healthBuff") {
          player.bonusHealth += pickup.healthValue;
          hero.maxHp += pickup.healthValue;
          hero.hp = hero.maxHp;
          updateStatsUI();
          services.spawnTextPopup(pickup.x, pickup.y - 12, "Health Buff!", "rgba(255, 172, 172, 1)", 1.8);
          services.spawnTextPopup(pickup.x, pickup.y + 12, `Max HP +${pickup.healthValue}`, "rgba(255, 210, 210, 1)", 1.8);
        } else if (pickup.type === "weaponBuff") {
          player.bonusDamage += pickup.damageValue;
          updateStatsUI();
          services.spawnTextPopup(pickup.x, pickup.y - 12, "Weapon Buff!", "rgba(255, 218, 140, 1)", 1.8);
          services.spawnTextPopup(pickup.x, pickup.y + 12, `Damage +${pickup.damageValue}`, "rgba(255, 238, 196, 1)", 1.8);
        }
      }
    }

  }

  return {
    INVENTORY_ABILITY_SLOT_LEVELS,
    INVENTORY_ABILITY_SLOT_KEYS,
    INVENTORY_ABILITY_SLOT_POSITIONS,
    hasInventoryItem,
    addInventoryItem,
    equipmentHelmetSlot,
    equipBackpackHelmet,
    showEquippedHelmetDetails,
    registerInventoryControls,
    updateInventoryUI,
    getInventoryAbilities,
    syncInventoryPanelHeights,
    selectLockedInventorySlot,
    selectInventoryAbility,
    getInventoryAbilityIcon,
    getInventoryAbilitySlots,
    getOrderedInventoryAbilities,
    clearInventoryAbilityDrag,
    enableInventoryAbilityDrag,
    updateInventoryCharacterImage,
    updateInventoryAbilities,
    selectInventoryTab,
    toggleInventoryScreen,
    isInterfacePanelOpen,
    getWeaponUpgradeRules,
    getCurrentWeaponDetails,
    syncWeaponDerivedStats,
    setWeaponDetailEffect,
    updateWeaponDetailsUI,
    openWeaponDetails,
    closeWeaponDetails,
    applyWeaponDetailUpgrade,
    getBaseArmor,
    getHelmetArmorValue,
    getTotalArmor,
    updateStatsUI,
    buildHelmetIcon,
    buildBodyArmorIcon,
    buildWeaponOutlineIcon,
    updateEquipmentUI,
    spawnRareHelmetDrop,
    spawnPickupDrop,
    dropLatestPickupFromHero,
    isManualPickupType,
    getNearbyPickup,
    getWorldPickups,
    equipPickup,
    swapHeroWeaponPickup,
    updateAutomaticPickups,
  };
}

export { createInventorySystem };
