class CircularBuffer {
  constructor(capacity) {
    this.buffer = new Array(capacity);
    this.capacity = capacity;
    this.start = 0;
    this.end = 0;
    this.size = 0;
    this.sum = 0;
  }

  insert(value) {
    if (this.size === this.capacity) {
      this.sum -= this.buffer[this.start];
      this.start = (this.start + 1) % this.capacity;
    } else {
      this.size++;
    }

    this.buffer[this.end] = value;
    this.sum += value;
    this.end = (this.end + 1) % this.capacity;
  }

  getAverage(lastNValues) {
    if (lastNValues >= this.size) {
      return this.sum / this.size;
    }

    let sum = 0;
    let index = (this.end - 1 + this.capacity) % this.capacity;
    for (let i = 0; i < lastNValues; i++) {
      sum += this.buffer[index];
      index = (index - 1 + this.capacity) % this.capacity;
    }

    return sum / lastNValues;
  }

  // Add the getSize method
  getSize() {
    return this.size;
  }
}

let currentTable;

const gameLoop = (() => {
    let gameInterval;
    const tickRate = 1000;
    let tickCounter = 0;

    function start() {
        window.loadGame();
        projects.renderProjects();
        ui.updateBuildingDisplay(window.parcels.getParcel(window.ui.getSelectedParcelIndex()));
        // initializeAnalytics();
        gameInterval = setInterval(() => {
            updateResources();
            updateBeltLogistics();
            ui.updateBuildingDropdown();
            ui.updateParcelsSectionVisibility();
            const selectedParcel = window.parcels.getParcel(window.ui.getSelectedParcelIndex());
            currentTable = window.ui.updateResourceDisplay(selectedParcel);
            updateAllParcels();
            updateAmmunitionDisplay(battleOngoing);
            displayArmyCost(factoryUnits);
            updateStartBattleButtonState();
            updatePollutionValues()
            updatePollutionDisplay();
            reduceBiterFactor();
            ui.updateEnergyDisplay();
            window.progressionManager.update(gameState);
            tickCounter++;

        }, tickRate);
    }

    function updateAllParcels() {
      // Iterate through all parcels
      for (const parcel of window.parcels.parcelList) {
        // Update parcel modifiers
        parcel.productionRateModifier = 0;
        parcel.consumptionRateModifier = 0;

        if (parcel.buildings.speedBeaconT1) {
          parcel.productionRateModifier += parcel.buildings.speedBeaconT1 * 0.02;
          parcel.consumptionRateModifier += parcel.buildings.speedBeaconT1 * 0.025;
        }

        if (parcel.buildings.productivityBeaconT1) {
          parcel.productionRateModifier += parcel.buildings.productivityBeaconT1 * 0.01;
          parcel.consumptionRateModifier += parcel.buildings.productivityBeaconT1 * 0.005;
        }

        if (parcel.buildings.speedBeaconT2) {
          parcel.productionRateModifier += parcel.buildings.speedBeaconT2 * 0.04;
          parcel.consumptionRateModifier += parcel.buildings.speedBeaconT2 * 0.05;
        }

        if (parcel.buildings.productivityBeaconT2) {
          parcel.productionRateModifier += parcel.buildings.productivityBeaconT2 * 0.02;
          parcel.consumptionRateModifier += parcel.buildings.productivityBeaconT2 * 0.01;
        }

        if (parcel.buildings.speedBeaconT3) {
          parcel.productionRateModifier += parcel.buildings.speedBeaconT3 * 0.08;
          parcel.consumptionRateModifier += parcel.buildings.speedBeaconT3 * 0.010;
        }

        if (parcel.buildings.productivityBeaconT3) {
          parcel.productionRateModifier += parcel.buildings.productivityBeaconT3 * 0.06;
          parcel.consumptionRateModifier += parcel.buildings.productivityBeaconT3 * 0.03;
        }

        // Call updatePreviousResources method for each parcel
        parcel.updatePreviousResources();
        parcel.updatePreviousResourceHistory();
      }
    }

    function updateResources() {
      // Helper function to calculate bottlenecks
      function calculateBottlenecks(parcel, building, buildingCount, totalConsumptionRateModifier) {
        const bottlenecks = {};
        for (const [key, value] of Object.entries(building.inputs)) {
          const requiredResourcesForFullProduction = value * buildingCount * (totalConsumptionRateModifier);
          const availableResources = parcel.resources[key];
          const missingResources = requiredResourcesForFullProduction - availableResources;

          if (missingResources > 0) {
            bottlenecks[key] = missingResources;
          }
        }
        return bottlenecks;
      }

      // Iterate through all the parcels
      for (const parcel of window.parcels.parcelList) {
        // Iterate through each building type in the current parcel
        for (const buildingId in parcel.buildings) {
          const buildingCount = parcel.buildings[buildingId];

          // Check if there's at least one building of the current type
          if (buildingCount && buildingCount > 0) {
            const building = window.buildingManager.getBuilding(buildingId);

            const totalProductionRateModifier = calculateProductionRateModifier(parcel, building, buildingCount);
            const totalConsumptionRateModifier = calculateConsumptionRateModifier(parcel, building, buildingCount);

            // Check if the building has any input resources required for production
            if (building.inputs && !(building.energyOutput > 0)) {
              let maxProducingBuildings = buildingCount;

              // Check if the parcel has enough resources to meet the input requirements
              for (const [key,value] of Object.entries(building.inputs)) {
                if (parcel.resources[key]) {
                  const availableBuildings = Math.floor(parcel.resources[key] / (value * (totalConsumptionRateModifier)));
                  maxProducingBuildings = Math.min(maxProducingBuildings, availableBuildings);
                } else {
                  maxProducingBuildings = 0;
                  break;
                }
              }

              // Calculate utilization as a percentage
              const utilization = (maxProducingBuildings / buildingCount) * 100;

              // Calculate bottlenecks
              const bottlenecks = calculateBottlenecks(parcel, building, buildingCount, totalConsumptionRateModifier);

              // Store the utilization and bottleneck information in the parcel
              if (!parcel.utilization) {
                parcel.utilization = {};
              }
              parcel.utilization[buildingId] = {
                percentage: utilization,
                bottlenecks: bottlenecks
              };

              // If there are buildings that can produce, consume the input resources and produce output resources
              if (maxProducingBuildings > 0) {
                for (const [key, value] of Object.entries(building.inputs)) {
                  const updatedValue = parcel.resources[key] - value * maxProducingBuildings * building.rate * (totalConsumptionRateModifier);
                  parcel.resources[key] = Math.round(updatedValue * 10) / 10;
                }

                for (const [key, value] of Object.entries(building.outputs)) {
                  if (!parcel.resources[key]) {
                    parcel.resources[key] = 0;
                  }
                  const updatedValue = parcel.resources[key] + value * maxProducingBuildings * building.rate * (totalProductionRateModifier);
                  parcel.resources[key] = Math.round(updatedValue * 10) / 10;
                }
              }

              // Insert the new production rate into the circular buffer for each output resource
              for (const [key, value] of Object.entries(building.outputs)) {
                const productionRate = maxProducingBuildings > 0 ? value * maxProducingBuildings * building.rate * (totalProductionRateModifier) : 0;
                parcel.productionHistory[key].insert(productionRate);
              }

            } else {
              for (const [key, value] of Object.entries(building.outputs)) {
                if (!parcel.resources[key]) {
                  parcel.resources[key] = 0;
                }
                const updatedValue = parcel.resources[key] + value * buildingCount * building.rate * (totalProductionRateModifier);
                parcel.resources[key] = Math.round(updatedValue * 10) / 10;

                // Insert the new production rate into the circular buffer
                parcel.productionHistory[key].insert(value * buildingCount * building.rate * (totalProductionRateModifier));
              }
            }
          }
        }
      }
      // Update the resource display for the currently selected parcel
      const selectedParcel = parcels.getParcel(ui.getSelectedParcelIndex());
      ui.updateResourceDisplay(selectedParcel);
    }

    function calculateProductionRateModifier(parcel, building, buildingCount) {
        const energyBasedModifier = parcel.buildingProductionRateModifiers[building.id] && parcel.buildingProductionRateModifiers[building.id].energyModifier || 0;
        const buildingProductionRateModifier = (parcel.buildingProductionRateModifiers[building.id] && parcel.buildingProductionRateModifiers[building.id].energyModifier) || 0;
        const remoteConstructionFacilityModifier = (parcel.buildings.remoteConstructionFacility && parcel.buildings.remoteConstructionFacility > 0) ? 0.3 : 0;
        const calc = (1 + energyBasedModifier) * (1 + parcels.getGlobalProductionRateModifier() + building.productionRateModifier + parcel.productionRateModifier + buildingProductionRateModifier - remoteConstructionFacilityModifier) || 0;
        return calc
    }

    function calculateConsumptionRateModifier(parcel, building, buildingCount) {
        const energyBasedModifier = parcel.buildingProductionRateModifiers[building.id] && parcel.buildingConsumptionRateModifiers[building.id].energyModifier || 0;
        const buildingConsumptionRateModifier = (parcel.buildingConsumptionRateModifiers[building.id] && parcel.buildingConsumptionRateModifiers[building.id].energyModifier) || 0;
        const remoteConstructionFacilityModifier = (parcel.buildings.remoteConstructionFacility && parcel.buildings.remoteConstructionFacility > 0) ? 0.3 : 0;
        return (1 + energyBasedModifier) * (1 + parcels.getGlobalConsumptionRateModifier() + building.consumptionRateModifier + parcel.consumptionRateModifier + buildingConsumptionRateModifier + remoteConstructionFacilityModifier) || 0;
    }

    function updateBeltLogistics() {
      for (let i = 0; i < parcels.getParcelCount(); i++) {
        const currentParcel = parcels.getParcel(i);
        const nextParcelIndex = (i + 1) % parcels.getParcelCount();
        const previousParcelIndex = (i - 1 + parcels.getParcelCount()) % parcels.getParcelCount();
        const nextParcel = parcels.getParcel(nextParcelIndex);
        const previousParcel = parcels.getParcel(previousParcelIndex);

        for (const resourceName in currentParcel.resources) {
          if (currentParcel.inputValues && currentParcel.inputValues[resourceName]) {
            const forwardValue = currentParcel.inputValues[resourceName].forwardBelt || 0;
            const backwardValue = currentParcel.inputValues[resourceName].backwardBelt || 0;

            // Transfer resources using forward belts
            if (forwardValue > 0) {
              const availableResources = currentParcel.resources[resourceName];
              const transferAmount = Math.min(availableResources, forwardValue);
              currentParcel.resources[resourceName] -= transferAmount;
              nextParcel.resources[resourceName] = (nextParcel.resources[resourceName] || 0) + transferAmount;
            }

            // Transfer resources using backward belts
            if (backwardValue > 0) {
              const availableResources = currentParcel.resources[resourceName];
              const transferAmount = Math.min(availableResources, backwardValue);
              currentParcel.resources[resourceName] -= transferAmount;
              previousParcel.resources[resourceName] = (previousParcel.resources[resourceName] || 0) + transferAmount;
            }
          }
        }
      }
    }

    function stop() {
        clearInterval(gameInterval);
    }

    // function initializeAnalytics() {
    //   // Cookie Consent
    //   var cookieBotScript = document.createElement('script');
    //   cookieBotScript.src = 'https://consent.cookiebot.com/uc.js';
    //   cookieBotScript.setAttribute('data-cbid', 'cc57599e-a483-42fd-9b14-380f6c566317');
    //   cookieBotScript.setAttribute('data-blockingmode', 'auto');
    //   cookieBotScript.type = 'text/javascript';
    //   document.head.appendChild(cookieBotScript);
    //
    //   // Google Analytics
    //   var gaScript = document.createElement('script');
    //   gaScript.async = true;
    //   gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-7EH8S2NR6P';
    //   document.head.appendChild(gaScript);
    //
    //   window.dataLayer = window.dataLayer || [];
    //   function gtag(){dataLayer.push(arguments);}
    //   gtag('consent', 'default', {ad_storage:'denied', analytics_storage:'denied'});
    //   gtag('set', 'ads_data_redaction', true);
    //   gtag('set', 'url_passthrough', true);
    //   gtag('js', new Date());
    //   gtag('config', 'G-7EH8S2NR6P', {'anonymize_ip': true});
    // }

    return {
        start,
        stop,
        calculateProductionRateModifier,
        calculateConsumptionRateModifier,
    };
})();

window.gameLoop = gameLoop;
