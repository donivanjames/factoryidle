document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    const intro = document.getElementById("intro");
    intro.style.display = "none";
  }, 6000);
});

document.addEventListener("DOMContentLoaded", () => {
    const buyParcelButton = document.getElementById("buyParcel");
    const buyBuildingButton = document.getElementById("buyBuilding");
    const startResearchButton = document.getElementById("startResearch");
    const researchSelect = document.getElementById("researchSelect");

    let firstParcel;

    // Initialize the first parcel if parcels.parcelList is undefined or there's no parcel in the parcelList
    if (parcels.parcelList === undefined || parcels.parcelList.length === 0) {
      firstParcel = parcels.createNewParcel();
      ui.addParcelToUI(firstParcel);
    } else {
      firstParcel = parcels.parcelList[0];
    }

    // Select the first parcel
    const firstParcelTab = document.getElementById(`tab-${firstParcel.id}`);
    firstParcelTab.classList.add("selected");
    ui.updateResourceDisplay(firstParcel);

    // Buy Parcel button event listener
    buyParcelButton.addEventListener("click", () => {
      const highestParcelIndex = parcels.getParcelCount() - 1;
      const highestParcel = parcels.getParcel(highestParcelIndex);
      const highestParcelResourceEP = highestParcel.resources.expansionPoints || 0;
      const highestParcelResourceAA = highestParcel.resources.alienArtefacts || 0;

      const selectedParcel = window.parcels.getParcel(ui.getSelectedParcelIndex());
      const selectedParcelHasRCF = selectedParcel.buildings.remoteConstructionFacility;

      const resourceCounts = {
        expansionPoints: highestParcelResourceEP + (selectedParcelHasRCF ? selectedParcel.resources.expansionPoints : 0) + buildingManager.getResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, 'expansionPoints'),
        alienArtefacts: highestParcelResourceAA + (selectedParcelHasRCF ? selectedParcel.resources.alienArtefacts : 0) + buildingManager.getResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, 'alienArtefacts'),
      };


      console.log("resourceCounts", resourceCounts);
      console.log("parcels.canBuyParcel(resourceCounts)", parcels.canBuyParcel(resourceCounts));
      if (parcels.canBuyParcel(resourceCounts)) {
        const cost = gameState.buyParcelCost;

        for (const [resource, amount] of Object.entries(cost)) {
          // Handle the case where highestParcel.resources[resource] is undefined
          highestParcel.resources[resource] = highestParcel.resources[resource] || 0;

          if (highestParcel.resources[resource] >= amount) {
            highestParcel.resources[resource] -= amount;
          } else {
            const remainingCost = amount - highestParcel.resources[resource];
            highestParcel.resources[resource] = 0;
            buildingManager.deductResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resource, remainingCost);
          }
        }

        const newParcel = parcels.createNewParcel();
        ui.addParcelToUI(newParcel);
        ui.updateResourceDisplay(newParcel);

        // Select the newly bought parcel
        const newIndex = parcels.getParcelCount() - 1;
        ui.selectParcel(newIndex);

        // Increment the costs for the next purchase
        gameState.buyParcelCost.expansionPoints += 0.7;
        gameState.buyParcelCost.alienArtefacts += 0.5;
      }
    });

    // Add tooltip to Buy Parcel button
    ui.addTooltipToBuyParcelButton(buyParcelButton);

    // Buy Building button event listener
    buyBuildingButton.addEventListener("click", () => {
        const selectedParcelIndex = ui.getSelectedParcelIndex();
        const selectedBuildingId = buildingSelect.value;

        if (selectedParcelIndex !== null) {
            const selectedParcel = parcels.getParcel(selectedParcelIndex);

            // Call the buyBuilding function instead of repeating the code
            ui.buyBuilding(selectedParcel, selectedBuildingId);

            // Update the UI
            ui.updateBuildingDisplay(selectedParcel);

            const totalBuildings = Object.values(selectedParcel.buildings).reduce((a, b) => a + b, 0);
            //ui.updateParcelBuildingCount(selectedParcelIndex, totalBuildings);
        }
    });



    //Start Research button event listener
    startResearchButton.addEventListener("click", () => {
      const selectedResearchId = researchSelect.value;
      const selectedResearch = window.researchManager.getResearch(selectedResearchId);
      const resourceCost = Object.entries(selectedResearch.cost);

      const selectedParcel = gameState.parcels[ui.getSelectedParcelIndex()];

      let canAfford = true;
      for (const [resourceName, cost] of resourceCost) {
        const totalResource = (selectedParcel.resources[resourceName] || 0) + buildingManager.getResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resourceName);
        if (totalResource < cost) {
          canAfford = false;
          break;
        }
      }

      if (canAfford) {
        // Deduct the research cost
        for (const [resourceName, cost] of resourceCost) {
          if (selectedParcel.resources[resourceName] >= cost) {
            selectedParcel.resources[resourceName] -= cost;
          } else {
            const parcelResource = selectedParcel.resources[resourceName] || 0;
            const remainingResource = cost - parcelResource;
            selectedParcel.resources[resourceName] = 0;
            buildingManager.deductResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resourceName, remainingResource);
          }
        }

        // Perform the research (update gameState.research or any other relevant data)
        gameState.research[selectedResearchId] = true; // Mark the research as completed
        window.researchManager.completeResearch(selectedResearchId); // Add into research Manager as well as completed

        // Update the UI as needed
        window.researchManager.populateResearchDropdown();
        ui.updateParcelsSectionVisibility();
      }
    });

    gameLoop.start();
    researchManager.populateResearchDropdown();
    ui.updateParcelsSectionVisibility();
    //ui.populateBuildNewBuildingDropdown();
});

function saveGameWithAnimation() {
  const saveButton = document.getElementById('saveButton');
  const saveText = saveButton.querySelector('.save-text');
  const saveCheckmark = saveButton.querySelector('.save-checkmark');

  window.saveGame();

  saveText.style.transform = 'translateY(100%)';
  saveCheckmark.style.transform = 'translateY(0)';

  setTimeout(() => {
    saveText.style.transform = 'translateY(0)';
    saveCheckmark.style.transform = 'translateY(-100%)';
  }, 1000);
}

const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.querySelector('body');

// Check the user's preference when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
  const darkMode = localStorage.getItem('darkMode');

  // Enable dark mode if the user has not set a preference or has set it to 'true'
  if (darkMode === null || darkMode === 'true') {
    body.classList.add('dark-mode');
  }

  // Save the user's preference to localStorage
  localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
});

// Toggle dark mode and save the user's preference
darkModeToggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
});
