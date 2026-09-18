import { createCombatSystem } from "../combat.js";
import { createAbilitiesSystem } from "../abilities.js";
import { createEnemiesSystem } from "../enemies.js";
import { createUnitsSystem } from "../units.js";
import { createBuildingsSystem } from "../buildings.js";
import { createInventorySystem } from "../inventory.js";
import { createProgressionSystem } from "../progression.js";
import { createQuestsSystem } from "../quests.js";
import { createWorldSystem } from "../world.js";
import { createGameModesSystem } from "../gameModes.js";
import { createEconomySystem } from "../economy.js";
import { createRenderingSystem } from "../rendering.js";
import { createVehiclesSystem } from "../vehicles.js";
import { createPlayerSystem } from "../player.js";
import { createNpcSystem } from "../npcs.js";
import { clamp, distance } from "./math.js";
import { runtime, tutorialPlots, tutorialSites, shootingRangeTutorial } from "./state.js";

// Factories define their systems without running gameplay. Cross-system calls resolve
// through this one registry after every system has been constructed; no system imports
// another system or the coordinator. Entity state remains in state.js.
function createGameSystems({ getFrameTimestamp }) {
  const systems = {
    get lastTimestamp() { return getFrameTimestamp(); },
    getPlayerBase: () => runtime.playerBase,
  };
  for (const createSystem of [
    createCombatSystem,
    createAbilitiesSystem,
    createEnemiesSystem,
    createUnitsSystem,
    createBuildingsSystem,
    createInventorySystem,
    createProgressionSystem,
    createQuestsSystem,
    createWorldSystem,
    createGameModesSystem,
    createEconomySystem,
    createRenderingSystem,
    createVehiclesSystem,
    createPlayerSystem,
  ]) {
    Object.assign(systems, createSystem(systems));
  }
  Object.assign(systems, createNpcSystem({
    ...systems,
    clamp,
    distance,
    tutorialPlots,
    tutorialSites,
    shootingRangeTutorial,
    getEnemyHero: () => runtime.enemyHero,
  }));
  return systems;
}

export { createGameSystems };
