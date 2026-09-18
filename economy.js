import { distance } from "./modules/math.js";
import { closeShopBtn, shopPanelEl, shopSellWoodBtn, statusTextEl } from "./modules/dom.js";
import { buildings, hero, player } from "./modules/state.js";

// Cross-system actions are supplied by the coordinator; shared state is imported directly.
function createEconomySystem(services) {
  function updateShopUI() {
    shopPanelEl.classList.toggle("hidden", !player.shopOpen);
    shopSellWoodBtn.disabled = player.wood < 25;
  }

  function getShopBuilding() {
    return buildings.find((building) => building.type === "shop" && building.isPlayer) || null;
  }

  function isHeroNearShop() {
    const shop = getShopBuilding();
    if (!shop) {
      return false;
    }

    const shopCenter = { x: shop.x + shop.w / 2, y: shop.y + shop.h / 2 };
    return distance(hero, shopCenter) <= 280;
  }

  function openShop() {
    if (!isHeroNearShop()) {
      statusTextEl.textContent = "Move closer to the Shop first.";
      return;
    }
    player.shopOpen = true;
    player.weaponDetailsOpen = false;
    updateShopUI();
  }

  function closeShop() {
    player.shopOpen = false;
    updateShopUI();
  }

  function registerShopControls() {
    shopSellWoodBtn.addEventListener("click", () => {
      if (!player.hasSelectedCharacter) {
        return;
      }
      if (!isHeroNearShop()) {
        statusTextEl.textContent = "Move closer to the Shop to sell wood.";
        closeShop();
        return;
      }
      if (player.wood < 25) {
        statusTextEl.textContent = "You need at least 25 wood to sell.";
        return;
      }
      player.wood -= 25;
      player.money += 25;
      services.updateInventoryUI();
      services.updateTrainButton();
      statusTextEl.textContent = "Sold 25 wood for 25 gold.";
      updateShopUI();
    });
    closeShopBtn.addEventListener("click", () => {
      closeShop();
    });
  }

  return {
    updateShopUI,
    getShopBuilding,
    isHeroNearShop,
    openShop,
    closeShop,
    registerShopControls,
  };
}

export { createEconomySystem };
