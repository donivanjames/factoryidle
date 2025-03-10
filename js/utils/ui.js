const ui = (() => {
  const parcelContainer = document.getElementById("parcels");
  const buildingDisplay = document.getElementById("buildings");
  let selectedParcelIndex = 0;
  let createRowCounter = 0;

  class ResourceTable {
    constructor(parcel) {
      this.parcel = parcel;
      this.tableElement = document.getElementById("resourceTable");
      this.eventListeners = new WeakMap();
    }

    update() {
      // If the table is empty, create the header row
      if (this.tableElement.innerHTML === "") {
        this.createHeader();
      }

      // Update the Parcel Name Display
      const parcelTitle = document.getElementById("parcelNameDisplay");
      if (parcels.parcelList[selectedParcelIndex].name) {
        parcelTitle.textContent = parcels.parcelList[selectedParcelIndex].name;
      } else {
        parcelTitle.textContent = parcels.parcelList[selectedParcelIndex].id;
      }

      // Update the header row
      this.updateHeader();

      // Iterate over each resource in the parcel
      for (const category of window.resourceCategories) {
        for (const resource of category.resources) {
          const resourceName = resource.name;
          if (this.parcel.resources.hasOwnProperty(resourceName)) {
            const rowId = `resourceRow-${this.parcel.id}-${resourceName}`;
            let row = document.getElementById(rowId);
            if (!row) {
              // If the row doesn't exist, create it
              row = this.createRow(resourceName);
              this.tableElement.appendChild(row);
            } else {
              // Update the existing row
              this.updateRow(resourceName, row);
            }
          }
        }
      }

      // // Add event listeners to buttons after updating all rows
      // this.addEventListenerToButtons(".buy-building-resource", buyBuilding);
      // this.addEventListenerToButtons(".sell-building-resource", sellBuilding);

      // Add tooltips to the Buy buttons
      this.addTooltipToButtons(".buy-building-resource", this.parcel);

      // Add tooltips to the resource names
      this.addResourceTooltips(this.parcel);
    }

    addEventListenerToButtons(buttonClass, actionFunction, buttonElement = null) {
      const buttons = buttonElement ? [buttonElement] : this.tableElement.querySelectorAll(buttonClass);
      buttons.forEach((button) => {
        // Create a new event listener
        const newListener = (event) => {
          const buildingId = event.target.dataset.buildingId;
          actionFunction(this.parcel, buildingId);
        };

        // Add the new event listener and store it in the WeakMap
        button.addEventListener("click", newListener);
        this.eventListeners.set(button, newListener);

        // Mark the button as having an event listener attached
        button.dataset.listenerAttached = 'true';
      });
    }

    addTooltipToButtons(buttonClass, parcel) {
      const buttons = this.tableElement.querySelectorAll(buttonClass);
      buttons.forEach((button) => {

        // Show tooltip on mouseover for Buy buttons only
        if (buttonClass.includes("buy-building") && button.dataset.tooltipListenerAttached !== 'true') {
          button.addEventListener("mouseover", (event) => {
            const buildingId = event.target.dataset.buildingId;
            const building = buildingManager.getBuilding(buildingId);
            const costText = Object.entries(building.cost)
              .map(([resource, cost]) => `${cost} ${resource}`)
              .join("<br>");
            const buyText = `Cost:<br>${costText}`;

            tooltip.innerHTML = buyText;
            tooltip.style.display = "block";
            tooltip.style.left = event.pageX + 10 + "px";
            tooltip.style.top = event.pageY + 10 + "px";
          });

          // Hide tooltip on mouseout
          button.addEventListener("mouseout", () => {
            tooltip.style.display = "none";
          });

          // Update tooltip position on mousemove
          button.addEventListener("mousemove", (event) => {
            tooltip.style.left = event.pageX + 10 + "px";
            tooltip.style.top = event.pageY + 10 + "px";
          });

          // Mark the button as having tooltip event listeners attached
          button.dataset.tooltipListenerAttached = 'true';
        }
      });
    }

    addResourceTooltips(parcel) {
      const resourceNames = this.tableElement.querySelectorAll(".resource-name");
      resourceNames.forEach((resourceName) => {
        if (resourceName.dataset.tooltipListenerAttached !== 'true') {
            resourceName.addEventListener("mouseover", (event) => {
              const resource = buildingManager.getBuildingByResourceName(event.target.textContent);
              const buildingCount = parcel.buildings[resource.id];
              const buildingCountChecked = buildingCount || 0;

              const inputText = Object.entries(resource.inputs || {})
              .map(([inputResource, amount]) => `${amount} ${inputResource}`)
              .join("<br>");
              const outputText = Object.entries(resource.outputs || {})
              .map(([outputResource, amount]) => `${amount} ${outputResource}`)
              .join("<br>");

              const totalInputText = Object.entries(resource.inputs || {})
              .map(([inputResource, amount]) => `${amount * buildingCountChecked} ${inputResource}`)
              .join("<br>");
              const totalOutputText = Object.entries(resource.outputs || {})
              .map(([outputResource, amount]) => `${amount * buildingCountChecked} ${outputResource}`)
              .join("<br>");

              const productionRateModifier = gameLoop.calculateProductionRateModifier(parcel, resource, buildingCount);
              const consumptionRateModifier = gameLoop.calculateConsumptionRateModifier(parcel, resource, buildingCount);

              const modifiedInputText = Object.entries(resource.inputs || {})
              .map(([inputResource, amount]) => `${(amount * (consumptionRateModifier)).toFixed(2)} ${inputResource}`)
              .join("<br>");
              const modifiedOutputText = Object.entries(resource.outputs || {})
              .map(([outputResource, amount]) => `${(amount * (productionRateModifier)).toFixed(2)} ${outputResource}`)
              .join("<br>");



              const totalModifiedInputText = Object.entries(resource.inputs || {})
              .map(([inputResource, amount]) => `${(amount * buildingCountChecked * (consumptionRateModifier)).toFixed(2)} ${inputResource}`)
              .join("<br>");
              const totalModifiedOutputText = Object.entries(resource.outputs || {})
              .map(([outputResource, amount]) => `${(amount * buildingCountChecked * (productionRateModifier)).toFixed(2)} ${outputResource}`)
              .join("<br>");
              const tooltipText = `
              <table>
              <tbody>

              <thead>
                <tr>
                  <th colspan="3" style="text-align: left;"><b>Total (Modified)</b></th>
                </tr>
              </thead>
              <tr>
                <td>${totalModifiedInputText || "-"}</td>
                <td> &#x2192; </td>
                <td>${totalModifiedOutputText || "-"}</td>
              </tr>

                <thead>
                  <tr>
                    <th colspan="3" style="text-align: left;"><b>Modified</b></th>
                  </tr>
                </thead>

                  <tr>
                    <td>${modifiedInputText || "-"}</td>
                    <td> &#x2192; </td>
                    <td>${modifiedOutputText || "-"}</td>
                  </tr>

                  <tr>
                    <td>${
                      consumptionRateModifier !== undefined
                        ? (consumptionRateModifier > 1 ? "+" : "") + Math.round((consumptionRateModifier-1) * 100) + "%"
                        : ""
                    }</td>
                    <td></td>
                    <td>${
                      productionRateModifier !== undefined
                        ? (productionRateModifier > 1 ? "+" : "") + Math.round((productionRateModifier-1) * 100) + "%"
                        : ""
                    }</td>
                  </tr>

                  <thead>
                    <tr>
                      <th colspan="3" style="text-align: left;"><b>Total (Default)</b></th>
                    </tr>
                  </thead>
                  <tr>
                    <td>${totalInputText || "-"}</td>
                    <td> &#x2192; </td>
                    <td>${totalOutputText || "-"}</td>
                  </tr>

                  <thead>
                    <tr>
                      <th colspan="3" style="text-align: left;"><b>Default</b></th>
                    </tr>
                  </thead>
                    <tr>
                      <td>${inputText || "-"}</td>
                      <td> &#x2192; </td>
                      <td>${outputText || "-"}</td>
                    </tr>
                </tbody>
              </table>`;

              tooltip.innerHTML = tooltipText;
              tooltip.style.display = "block";
              tooltip.style.left = event.pageX + 10 + "px";
              tooltip.style.top = event.pageY + 10 + "px";
            });

            resourceName.addEventListener("mouseout", () => {
              tooltip.style.display = "none";
            });

            resourceName.addEventListener("mousemove", (event) => {
              tooltip.style.left = event.pageX + 10 + "px";
              tooltip.style.top = event.pageY + 10 + "px";
            });
            // Mark the resourceName as having tooltip event listeners attached
            resourceName.dataset.tooltipListenerAttached = 'true';
          }
      });
    }

    updateHeader() {
        // Get the current header elements using a query selector
        let forwardBeltLabel = document.querySelector("[id^='forwardBeltHeader-']");
        let backwardBeltLabel = document.querySelector("[id^='backwardBeltHeader-']");

        if (forwardBeltLabel && backwardBeltLabel) {
        // Set new ids
        forwardBeltLabel.id = `forwardBeltHeader-${this.parcel.id}`;
        backwardBeltLabel.id = `backwardBeltHeader-${this.parcel.id}`;

        // Update forward and backward belt labels
        const forwardBeltCount = this.parcel.beltUsage?.forwardBelt ?? 0;
        const backwardBeltCount = this.parcel.beltUsage?.backwardBelt ?? 0;
        const totalForwardBeltCount = window.parcels.parcelList.reduce((sum, parcel) => sum + (parcel.buildings["beltBus"] || 0), 0);
        const totalBackwardBeltCount = window.parcels.parcelList.reduce((sum, parcel) => sum + (parcel.buildings["beltBus"] || 0), 0);
        forwardBeltLabel.textContent = `Forward ${forwardBeltCount}/${totalForwardBeltCount}`;
        backwardBeltLabel.textContent = `Backward ${backwardBeltCount}/${totalBackwardBeltCount}`;
        }
    }

    createHeader() {
      const headerRow = document.createElement("tr");
      const headerLabels = [
        "Resource",
        "Amount",
        //"Utilization",
        "Ø Production",
        "Count",
        "Building",
        "Backward 0/0",
        "Forward 0/0",
      ];

      headerLabels.forEach((label) => {
        const headerCell = document.createElement("th");
        headerCell.textContent = label;
        headerCell.classList.add("header");
        headerRow.appendChild(headerCell);
      });

      // Function to create an img element with the given src
      const createIcon = (src) => {
        const img = document.createElement("img");
        img.src = src;
        img.style.width = "16px";
        img.style.height = "16px";
        img.style.marginLeft = "4px";
        return img;
      };

      const backwardIcon = createIcon("assets/backwardBelt-48.png");
      const forwardIcon = createIcon("assets/forwardBelt-48.png");

      const backwardHeader = headerRow.children[5];
      const forwardHeader = headerRow.children[6];

      backwardHeader.textContent = "";
      forwardHeader.textContent = "";

      backwardHeader.appendChild(backwardIcon);
      backwardHeader.appendChild(document.createTextNode("Backward 0/0"));

      forwardHeader.appendChild(forwardIcon);
      forwardHeader.appendChild(document.createTextNode("Forward 0/0"));

      headerRow.children[3].id = `countHeader-${this.parcel.id}`; // Add an ID to the Production header

      headerRow.children[4].id = `productionHeader-${this.parcel.id}`; // Add an ID to the Production header
      headerRow.children[6].id = `forwardBeltHeader-${this.parcel.id}`; // Add an ID to the Forward header
      headerRow.children[6].style.display = "none"; // Initially hide the Forward header

      headerRow.children[5].id = `backwardBeltHeader-${this.parcel.id}`; // Add an ID to the Backward header
      headerRow.children[5].style.display = "none"; // Initially hide the Backward header

      // Hide the Production header initially
      const productionHeader = headerRow.children[4];
      const countHeader = headerRow.children[3];

      this.tableElement.appendChild(headerRow);
    }

    createRow(resourceName) {
      const building = buildingManager.getBuildingByResourceName(resourceName);
      const row = document.createElement("tr");
      row.id = `resourceRow-${this.parcel.id}-${resourceName}`;

      // Create the resource name cell
      const nameCell = document.createElement("td");
      nameCell.classList.add("resource-name");
      nameCell.style.whiteSpace = "nowrap";

      const textWrapper = document.createElement("div");

      // Create the icon element
      const resourceData = resourceCategories[resourceName];
      const icon = document.createElement("img");
      icon.src = resourceData.icon48;
      icon.style.width = "24px"; // Adjust the size as needed
      icon.style.height = "24px"; // Adjust the size as needed
      icon.style.verticalAlign = "middle";
      icon.style.marginRight = "5px"; // Add some margin between the icon and the text
      textWrapper.appendChild(icon);

      // Insert the text after the icon
      textWrapper.insertAdjacentText('beforeend', resourceName);

      textWrapper.style.display = "inline-block";
      textWrapper.style.verticalAlign = "-webkit-baseline-middle";
      nameCell.appendChild(textWrapper);

      // Create button inside name cell
      if (building && building.minable) {
        const mineButton = this.createMineButton(resourceName);
        mineButton.style.display = "inline-block";
        mineButton.style.verticalAlign = "-webkit-baseline-middle";
        mineButton.style.float = "right";
        mineButton.style.marginLeft = "1em"
        nameCell.appendChild(mineButton);
      }

      row.appendChild(nameCell);

      //row.appendChild(this.createCell(resourceName));

      // Get the color from getResourceRateColor and apply it to the resource amount cell
      const color = getResourceRateColor(this.parcel, resourceName);
      const resourceCell = this.createCell(Math.round(this.parcel.resources[resourceName] * 10) / 10, color);
      row.appendChild(resourceCell);
      //
      // // Create the utilization cell
      // const utilization = this.parcel.utilization && this.parcel.utilization[building.id] ? this.parcel.utilization[building.id].percentage : 0;
      // const roundedUtilization = Math.ceil(utilization);
      // const utilizationCell = this.createCell(`${roundedUtilization}%`);
      // row.appendChild(utilizationCell);

      // Get a reference to the tooltip element
      const tooltip = document.getElementById("tooltip");

      // Display bottleneck information on mouseover
      resourceCell.addEventListener("mouseover", (event) => {
        if (this.parcel.utilization && this.parcel.utilization[building.id]) {
          const bottleneckInfo = this.parcel.utilization[building.id].bottlenecks;
          const bottleneckText = Object.entries(bottleneckInfo)
            .map(([resource, amount]) => `${resource}: ${amount.toFixed(2)}`)
            .join(", ");

          if(bottleneckText === "") {
            tooltip.innerHTML = `✅`;
          } else {
            tooltip.innerHTML = `⏳: ${bottleneckText}`;
          }

          tooltip.style.display = "block";
          tooltip.style.left = event.pageX + 10 + "px";
          tooltip.style.top = event.pageY + 10 + "px";
        }
      });

      // Hide the tooltip on mouseout
      resourceCell.addEventListener("mouseout", () => {
        tooltip.style.display = "none";
      });

      // Update the tooltip position on mousemove
      resourceCell.addEventListener("mousemove", (event) => {
        tooltip.style.left = event.pageX + 10 + "px";
        tooltip.style.top = event.pageY + 10 + "px";
      });

      //Create productionRate cells
      const productionRateCell = document.createElement("td");
      row.appendChild(productionRateCell);

      const countCell = document.createElement("td"); // Create a new cell for the building count
      if (building) {
        if (
          progressionManager.isUnlocked("ironMiner") &&
          progressionManager.isUnlocked("stoneMiner") &&
          progressionManager.isUnlocked("coalMiner")
        ) {
          countCell.textContent = this.parcel.buildings[building.id] || 0; // Display the number of built buildings
        } else {
          countCell.textContent = ""; // Hide the content if the required buildings are not unlocked
        }
      }
      row.appendChild(countCell);

      const productionCell = document.createElement("td");
      if (building) {
        const buildingCount = this.parcel.buildings[building.id] || 0;
        if (
          buildingCount > 0 &&
          progressionManager.isUnlocked("ironMiner") &&
          progressionManager.isUnlocked("stoneMiner") &&
          progressionManager.isUnlocked("coalMiner")
        ) {
          productionCell.innerHTML = `
            <button data-building-id="${building.id}" class="buy-building-resource">Buy</button>
            <button data-building-id="${building.id}" class="sell-building-resource">Sell</button>
          `;
        } else {
          productionCell.textContent = ""; // Hide the content if the required buildings are not unlocked
        }
      }
      row.appendChild(productionCell);

      // Create input fields for forward and backward belts
      const beltTypes = ["backwardBelt", "forwardBelt"];
      beltTypes.forEach((beltId, index) => {
        const beltController = this.createDirectionInput(beltId, resourceName);
        const beltUsage = this.parcel.beltUsage ? this.parcel.beltUsage[beltId] || 0 : 0;
        const beltCount = window.parcels.parcelList.reduce((sum, parcel) => sum + (parcel.buildings["beltBus"] || 0), 0);
        //const beltCount = this.parcel.buildings[beltId] * 2 || 0;

        const cell = this.createCell(beltController);
        cell.style.display = "none"; // Initially hide the Forward and Backward cells
        row.appendChild(cell);

        if (beltCount > 0) {
          const headerId = `${beltId === "forwardBelt" ? "forward" : "backward"}BeltHeader-${this.parcel.id}`;
          const headerElement = document.getElementById(headerId);
          headerElement.style.display = ""; // Unhide the header if the belt has been built

          const labelId = `${beltId === "forwardBelt" ? "forward" : "backward"}BeltHeader-${this.parcel.id}`;
          const labelElement = document.getElementById(labelId);
          labelElement.textContent = `${beltId === "forwardBelt" ? "Forward" : "Backward"} ${beltUsage}/${beltCount}`;

          cell.style.display = ""; // Unhide the cell if the belt has been built
        }
      });

      return row;
    }

    updateRow(resourceName, row) {
      const building = buildingManager.getBuildingByResourceName(resourceName);
      // Update the resource amount cell
      const color = getResourceRateColor(this.parcel, resourceName);
      const resourceCell = row.cells[1];
      resourceCell.textContent = Math.round(this.parcel.resources[resourceName] * 10) / 10;
      resourceCell.style.backgroundColor = color;
      if (color === "green") {
        resourceCell.style.color = "white";
      } else {
        if (localStorage.getItem('darkMode') === 'true') {
          resourceCell.style.color = "#E8E6E3";
        } else {
          resourceCell.style.color = "black";
        }
      }

      // parcels.parcelList[i].productionHistory[resourceName].getAverage(n)

      // function getAdaptiveInterval(productionRate, minInterval, maxInterval) {
      //   const scalingFactor = 1 / Math.max(productionRate, 0.01); // Avoid dividing by 0
      //   const adaptiveInterval = Math.min(Math.max(minInterval * scalingFactor, minInterval), maxInterval);
      //   return Math.round(adaptiveInterval);
      // }
      //

      // let productionRateValue = this.parcel.productionHistory[resourceName].getAverage(10);
      // let targetInterval = 1;
      // //Determine a good scope for productionRateValue
      //
      // if (this.parcel.productionHistory[resourceName].getZeroCount(60) >= 45) {
      //
      // } else if (this.parcel.productionHistory[resourceName].getAverage(60) >= 30) {
      //
      // } else if (this.parcel.productionHistory[resourceName].getAverage(60) >= 15) {
      //
      // } else {
      //
      // }
      //
      // // this.parcel.productionHistory[resourceName].getAverage(30);
      //
      // const adaptiveInterval = getAdaptiveInterval(productionRateValue, 5, 300);
      //
      // //const averageValue = this.parcel.productionHistory[resourceName].getAverage(adaptiveInterval);

      // Update the productionRateCell
      const productionRateCell = row.cells[2];
      let targetInterval = 7;
      let buildingCount = 0;
      let buildingCountChecked = 0;
      let productionRateModifier = 0;
      let amount = 0;


      if (building) {
        if (building.id === "expansionCenter" || building.id === "researchCenter") {
          targetInterval = 300;
        }

        buildingCount = this.parcel.buildings[building.id];
        buildingCountChecked = buildingCount || 0;
        productionRateModifier = gameLoop.calculateProductionRateModifier(this.parcel, building, buildingCount);
        amount = building.outputs[resourceName];
      }


      const averageValue = this.parcel.productionHistory[resourceName].getAverage(targetInterval);



      const maxValue = amount * buildingCountChecked * productionRateModifier;
      const progressPercentage = Math.min(averageValue / maxValue, 1) * 100;

      // const averageValue = this.parcel.productionHistory[resourceName].getAverage(300);

      if (averageValue) {
        if (averageValue < 0.1) {
          productionRateCell.textContent = "+" + averageValue.toFixed(3) + "/s";
        } else if (averageValue < 1) {
          productionRateCell.textContent = "+" + averageValue.toFixed(2) + "/s";
        } else {
          productionRateCell.textContent = "+" + averageValue.toFixed(1) + "/s";
        }
        productionRateCell.style.background = `linear-gradient(90deg, rgba(0, 128, 0, 0.5) ${progressPercentage}%, transparent ${progressPercentage}%)`;
      } else {
        productionRateCell.textContent = "";
        productionRateCell.style.background = "transparent";
      }

      // Update the building count cell
      const countCell = row.cells[3];
      if (building && progressionManager.isUnlocked("ironMiner") &&
        progressionManager.isUnlocked("stoneMiner") &&
        progressionManager.isUnlocked("coalMiner")) {
        countCell.textContent = this.parcel.buildings[building.id] || 0;
        countCell.style.visibility = "visible"; // Make the cell visible
      } else {
        countCell.textContent = ""; // Hide the content if the required buildings are not unlocked
        countCell.style.visibility = "collapse"; // Make the cell invisible
      }

      // Update the production cell
      const productionCell = row.cells[4];
      if (building) {
        const buildingCount = this.parcel.buildings[building.id] || 0;
        if (buildingCount > 0 &&
          progressionManager.isUnlocked("ironMiner") &&
          progressionManager.isUnlocked("stoneMiner") &&
          progressionManager.isUnlocked("coalMiner")) {
          if (!productionCell.querySelector(".buy-building-resource")) {
            productionCell.innerHTML = `
              <button data-building-id="${building.id}" class="buy-building-resource">Buy</button>
              <button data-building-id="${building.id}" class="sell-building-resource">Sell</button>
            `;
          }
        } else {
          productionCell.textContent = "";
        }
      }

      // Update the buy and sell buttons
      const buyButton = row.querySelector('.buy-building-resource');
      const sellButton = row.querySelector('.sell-building-resource');

      if (buyButton && buyButton.dataset.listenerAttached !== 'true') {
        this.addEventListenerToButtons('.buy-building-resource', buyBuilding, buyButton);
      }

      if (sellButton && sellButton.dataset.listenerAttached !== 'true') {
        this.addEventListenerToButtons('.sell-building-resource', sellBuilding, sellButton);
      }

      // Unhide the belt cells if the belt count is greater than 0
      const beltCount = window.parcels.parcelList.reduce((sum, parcel) => sum + (parcel.buildings["beltBus"] || 0), 0);
      if (beltCount > 0) {
        for (let i = 5; i <= 6; i++) {
          row.cells[i].style.display = ""; // Unhide the Forward and Backward cells
        }

        const forwardBeltUsage = this.parcel.beltUsage ? this.parcel.beltUsage["forwardBelt"] || 0 : 0;
        const backwardBeltUsage = this.parcel.beltUsage ? this.parcel.beltUsage["backwardBelt"] || 0 : 0;

        const forwardLabelId = `forwardBeltHeader-${this.parcel.id}`;
        const forwardLabelElement = document.getElementById(forwardLabelId);
        forwardLabelElement.textContent = `Forward ${forwardBeltUsage}/${beltCount}`;
        forwardLabelElement.style.display = "";

        const backwardLabelId = `backwardBeltHeader-${this.parcel.id}`;
        const backwardLabelElement = document.getElementById(backwardLabelId);
        backwardLabelElement.textContent = `Backward ${backwardBeltUsage}/${beltCount}`;
        backwardLabelElement.style.display = "";
      }
    }

    createDirectionInput(beltId, resourceName) {
      // Create elements
      const beltController = document.createElement("div");
      const minusBtn = document.createElement("div");
      const directionInput = document.createElement("input");
      const plusBtn = document.createElement("div");

      // Set properties and attributes
      beltController.className = "input-controller";

      minusBtn.className = "input-btn";
      minusBtn.innerText = "-";

      directionInput.type = "text";
      directionInput.className = "input-display";
      const inputValue = this.parcel.inputValues && this.parcel.inputValues[resourceName] && this.parcel.inputValues[resourceName][beltId] ? this.parcel.inputValues[resourceName][beltId] : 0;
      directionInput.value = inputValue;
      directionInput.dataset.belt = beltId;
      directionInput.dataset.resource = resourceName;
      directionInput.dataset.currentval = directionInput.value;

      plusBtn.className = "input-btn";
      plusBtn.innerText = "+";

      // Append elements
      beltController.append(minusBtn, directionInput, plusBtn);

      // Function to handle button clicks
      const handleButtonClick = (increment) => {
        const currentVal = parseInt(directionInput.value, 10) || 0;
        const newVal = currentVal + increment;

        directionInput.value = newVal;
        directionInput.dispatchEvent(new Event("input"));
      };

      // Attach event listeners
      minusBtn.addEventListener("click", () => handleButtonClick(-1));
      plusBtn.addEventListener("click", () => handleButtonClick(1));

      directionInput.addEventListener("input", (event) => {
        const inputVal = parseInt(event.target.value, 10) || 0;
        const maxVal = window.parcels.parcelList.reduce((sum, parcel) => sum + (parcel.buildings["beltBus"] || 0), 0);
        const currentVal = parseInt(event.target.dataset.currentval, 10) || 0;
        const beltUsage = parseInt(this.parcel.beltUsage[beltId], 10) || 0;
        const maxCellVal = maxVal - (beltUsage - currentVal);

        if (inputVal > maxCellVal) {
          //Check for the edge case of selling belts where maxCellVal can get negative
          if (maxCellVal < 0) {
            event.target.value = 0;
          } else {
            event.target.value = maxCellVal;
          }
        } else if (inputVal <= 0 || isNaN(inputVal) || inputVal === null || inputVal === "") {
          event.target.value = 0;
        }

        event.target.dataset.currentval = event.target.value;

        // Save the input field value for the parcel, resource, and beltId
        this.updateBeltUsage(beltId, resourceName, event.target.value, true);

        this.update();
      });

      return beltController;
    }

    createMineButton(resourceName) {
      const mineButton = document.createElement("button");
      mineButton.textContent = "Mine";
      mineButton.addEventListener("click", () => {
        this.parcel.resources[resourceName]++;
        this.update();
      });

      return mineButton;
    }

    createCell(content, bgColor = "#eee") {
      const cell = document.createElement("td");

      if (typeof content === "string" || typeof content === "number") {
        cell.textContent = content;
      } else if (content instanceof Node) {
        cell.appendChild(content);
      }

      if (localStorage.getItem('darkMode') === 'true') {

      } else {
        cell.style.backgroundColor = bgColor;
      }



      if (bgColor === "green") {
        cell.style.color = "white";
      }

      return cell;
    }

    updateBeltUsage(beltId, resourceName, value, saveInputValue = false) {
      let totalBeltUsage = 0;
      const beltInputs = this.tableElement.querySelectorAll(`input[data-belt="${beltId}"]`);

      beltInputs.forEach((input) => {
        const inputVal = parseInt(input.value, 10);
        totalBeltUsage += inputVal;
      });

      if (!this.parcel.beltUsage) {
        this.parcel.beltUsage = {};
      }

      this.parcel.beltUsage[beltId] = totalBeltUsage;

      // Save the input field values for the parcel, resource, and beltId
      if (saveInputValue) {
        if (!this.parcel.inputValues) {
          this.parcel.inputValues = {};
        }
        if (!this.parcel.inputValues[resourceName]) {
          this.parcel.inputValues[resourceName] = {};
        }
        this.parcel.inputValues[resourceName][beltId] = parseInt(value, 10) || 0;
      }
    }

    refreshTable() {
      const resourceTable = document.getElementById("resourceTable");
      for (let i = 1; i < resourceTable.rows.length; i++) {
        const row = resourceTable.rows[i];
        const resourceName = row.cells[0].textContent;
        this.updateRow(resourceName, row);
      }
    }

  }

  function addParcelToUI(parcel) {
    const parcelTab = document.createElement("button");
    parcelTab.className = "parcel-tab";
    parcelTab.id = `tab-${parcel.id}`;
    parcelTab.textContent = parcel.id;

    // Add event listener for selecting the parcel
    addParcelClickListener(parcelTab);

    parcelContainer.appendChild(parcelTab);

    // Update the parcel tab with color and name if available
    const parcelIndex = window.parcels.parcelList.findIndex(p => p.id === parcel.id);
    parcelManipulation.updateParcelTab(parcelIndex);
  }

  function addParcelClickListener(parcelTab) {
      parcelTab.addEventListener("click", () => {
          const prevSelected = document.querySelector(".parcel-tab.selected");
          if (prevSelected) {
              prevSelected.classList.remove("selected");
          }
          parcelTab.classList.add("selected");
          selectedParcelIndex = parseInt(parcelTab.id.split("-")[2]) - 1;
          updateResourceDisplay(parcels.getParcel(selectedParcelIndex));
          updateBuildingDisplay(parcels.getParcel(selectedParcelIndex));
      });
  }

  let previousParcel = null;

  function updateResourceDisplay(parcel) {
    const resourceTable = new ResourceTable(parcel);

    // Check if the parcel has changed
    if (previousParcel !== parcel) {
      // Clear the existing rows
      while (resourceTable.tableElement.rows.length > 1) {
        resourceTable.tableElement.deleteRow(-1);
      }

      // Update the previousParcel variable with the new parcel
      previousParcel = parcel;
    }

    // Update the resource table with the given parcel
    resourceTable.update();
    return resourceTable;
  }

    function getTotalBeltUsage(parcel, beltId) {
      let totalBeltUsage = 0;
      for (const resourceName in parcel.resources) {
        const beltUsage = parcel.beltUsage ? parcel.beltUsage[beltId] || {} : {};
        const resourceBeltUsage = beltUsage[resourceName] || 0;
        totalBeltUsage += resourceBeltUsage;
      }
      return totalBeltUsage;
    }

    function updateBuildingDisplay(parcel) {
        buildingDisplay.innerHTML = `
            <tr>
                <th class = "header">Building</th>
                <th class = "header">Count</th>
                <th class = "header">Action</th>
            </tr>
        `;

        for (const [key, value] of Object.entries(parcel.buildings)) {
            const buildingElement = document.createElement("tr");
            const building = buildingManager.getBuilding(key);
            buildingElement.innerHTML = `
                <td data-building-id="${key}" class="building-nameCell">${building.name}</td>
                <td>${value}</td>
                <td>
                    <button data-building-id="${key}" class="buy-building">Buy</button>
                    <button data-building-id="${key}" class="sell-building">Sell</button>
                </td>
            `;
            buildingDisplay.appendChild(buildingElement);
        }

        const totalBuildings = Object.values(parcel.buildings).reduce((a, b) => a + b, 0);
        const buildingHeader = document.getElementById("buildingHeader");
        buildingHeader.textContent = `Buildings (${totalBuildings} / ${parcel.maxBuildings})`;

        // Add Upgrade button
        const upgradeButton = document.createElement("button");
        upgradeButton.textContent = "Upgrade";
        upgradeButton.classList.add("upgrade-button");
        buildingHeader.appendChild(upgradeButton);

        // Get a reference to the tooltip element
        const tooltip = document.getElementById("tooltip");

        // Display upgrade information on mouseover
        upgradeButton.addEventListener("mouseover", (event) => {
            const upgradeType = "maxBuildingLimit";
            const upgradeCost = parcels.getUpgradeCost(parcel, upgradeType);
            const upgradeInfo = parcels.getUpgradeInfo(parcel, upgradeType);
            const costText = Object.entries(upgradeCost)
                .map(([resource, cost]) => `${cost} ${resource}`)
                .join(", ");
            const upgradeText = upgradeInfo
                ? `Upgrade cost: ${costText}. New limit: ${upgradeInfo.maxBuildingLimit}`
                : "Max level reached.";

            tooltip.innerHTML = upgradeText;
            tooltip.style.display = "block";
            tooltip.style.left = event.pageX + 10 + "px";
            tooltip.style.top = event.pageY + 10 + "px";
        });

        // Hide the tooltip on mouseout
        upgradeButton.addEventListener("mouseout", () => {
            tooltip.style.display = "none";
        });

        // Update the tooltip position on mousemove
        upgradeButton.addEventListener("mousemove", (event) => {
            tooltip.style.left = event.pageX + 10 + "px";
            tooltip.style.top = event.pageY + 10 + "px";
        });

        // Add event listener for Upgrade button
        upgradeButton.addEventListener("click", () => {
            parcels.upgradeParcel(parcel, "maxBuildingLimit");
            updateBuildingDisplay(parcel);
        });

        // Add event listeners to buy buttons
        addEventListenerToButtons(parcel, ".buy-building", buyBuilding);

        // Add event listeners to sell buttons
        addEventListenerToButtons(parcel, ".sell-building", sellBuilding);

        // Add tooltips for buildings
        addBuildingTooltips(parcel);
    }

    function addBuildingTooltips(parcel) {
      const buildingNames = buildingDisplay.querySelectorAll("tr td:first-child");
      buildingNames.forEach((buildingName) => {
        buildingName.addEventListener("mouseover", (event) => {
          const buildingId = event.target.dataset.buildingId;
          const building = buildingManager.getBuilding(buildingId);
          const inputText = Object.entries(building.inputs || {})
            .map(([inputResource, amount]) => `${amount} ${inputResource}`)
            .join("<br>");
          const outputText = Object.entries(building.outputs || {})
            .map(([outputResource, amount]) => `${amount} ${outputResource}`)
            .join("<br>");

          const tooltipText = `Input:<br>${inputText || "None"}<br>Output:<br>${outputText || "None"}`;

          tooltip.innerHTML = tooltipText;
          tooltip.style.display = "block";
          tooltip.style.left = event.pageX + 10 + "px";
          tooltip.style.top = event.pageY + 10 + "px";
        });

        buildingName.addEventListener("mouseout", () => {
          tooltip.style.display = "none";
        });

        buildingName.addEventListener("mousemove", (event) => {
          tooltip.style.left = event.pageX + 10 + "px";
          tooltip.style.top = event.pageY + 10 + "px";
        });
      });
    }

    function addEventListenerToButtons(parcel, buttonClass, actionFunction) {
        const buttons = buildingDisplay.querySelectorAll(buttonClass);
        buttons.forEach((button) => {
            button.addEventListener("click", (event) => {
                const buildingId = event.target.dataset.buildingId;
                actionFunction(parcel, buildingId);
                updateBuildingDisplay(parcel);
            });

            // Show tooltip on mouseover for Buy buttons only
            if (actionFunction === buyBuilding) {
                button.addEventListener("mouseover", (event) => {
                    const buildingId = event.target.dataset.buildingId;
                    const building = buildingManager.getBuilding(buildingId);
                    const costText = Object.entries(building.cost)
                        .map(([resource, cost]) => `${cost} ${resource}`)
                        .join("<br>");
                    const buyText = `Cost:<br>${costText}`;

                    tooltip.innerHTML = buyText;
                    tooltip.style.display = "block";
                    tooltip.style.left = event.pageX + 10 + "px";
                    tooltip.style.top = event.pageY + 10 + "px";
                });

                // Hide tooltip on mouseout
                button.addEventListener("mouseout", () => {
                    tooltip.style.display = "none";
                });

                // Update tooltip position on mousemove
                button.addEventListener("mousemove", (event) => {
                    tooltip.style.left = event.pageX + 10 + "px";
                    tooltip.style.top = event.pageY + 10 + "px";
                });
            }
        });
    }

    function buyBuilding(parcel, buildingId) {
        const totalBuildings = Object.values(parcel.buildings).reduce((a, b) => a + b, 0);
        if (totalBuildings < parcel.maxBuildings) {
            const building = buildingManager.getBuilding(buildingId);

            const resourceCost = Object.entries(building.cost);

            let canAfford = true;
            for (const [resourceName, cost] of resourceCost) {
                const totalResource = (parcel.resources[resourceName] || 0) + buildingManager.getResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resourceName);
                if (totalResource < cost) {
                    canAfford = false;
                    break;
                }
            }

            if (canAfford) {
                if (parcel.buildings[buildingId] === undefined) {
                    parcel.buildings[buildingId] = 0;
                }
                parcel.buildings[buildingId]++;

                for (const [resourceName, cost] of resourceCost) {
                    if (parcel.resources[resourceName] >= cost) {
                        parcel.resources[resourceName] -= cost;
                    } else {
                        const parcelResource = parcel.resources[resourceName] || 0;
                        const remainingResource = cost - parcelResource;
                        parcel.resources[resourceName] = 0;
                        buildingManager.deductResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resourceName, remainingResource);
                    }
                }

                buildingManager.initializeResourceOutput(parcel, building);

                if (buildingId === "kiln" && !parcel.resources.coal) {
                    parcel.resources = { coal: 0, ...parcel.resources };
                }

                if (buildingId === "ironSmelter" && !parcel.resources.ironOre) {
                    parcel.resources = { ironOre: 0, ...parcel.resources };
                }

                updateBuildingDisplay(parcel);
              } else {
                const missingResources = resourceCost
                  .filter(([resourceName, cost]) => {
                    const totalResource = (parcel.resources[resourceName] || 0) + buildingManager.getResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resourceName);
                    return totalResource < cost;
                  })
                  .map(([resourceName, cost]) => {
                    const totalResource = (parcel.resources[resourceName] || 0) + buildingManager.getResourcesFromRemoteConstructionFacilities(window.parcels.parcelList, resourceName);
                    return { resourceName, amount: cost - totalResource };
                  });

                showMissingResourceOverlay(missingResources);
              }
        }
    }

    function showMissingResourceOverlay(missingResources) {
      const overlay = document.createElement("div");
      const darkMode = localStorage.getItem('darkMode');

      overlay.id = "missing-resource-overlay";


      const title = document.createElement("h3");
      title.textContent = "Missing Resources";
      overlay.appendChild(title);

      const resourceList = document.createElement("ul");
      missingResources.forEach((resource) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${resource.resourceName}: ${resource.amount}`;
        resourceList.appendChild(listItem);
      });
      overlay.appendChild(resourceList);

      const closeButton = document.createElement("button");
      closeButton.textContent = "Close";
      closeButton.addEventListener("click", () => {
        document.body.removeChild(overlay);
      });
      overlay.appendChild(closeButton);

      document.body.appendChild(overlay);
    }

    function sellBuilding(parcel, buildingId) {
        if (parcel.buildings[buildingId] && parcel.buildings[buildingId] > 0) {
            const building = buildingManager.getBuilding(buildingId);

            // Refund 100% of the cost rounded down
            for (const [resource, cost] of Object.entries(building.cost)) {
                parcel.resources[resource] = (parcel.resources[resource] || 0) + Math.floor(cost * 1);
            }

            // Update building count
            parcel.buildings[buildingId]--;

            if (parcel.buildings[buildingId] === 0) {
                const firstKey = Object.keys(buildingManager.getBuilding(buildingId).outputs)[0];
                if (firstKey) {
                  parcel.productionHistory[firstKey] = new CircularBuffer(300)
                }
                delete parcel.buildings[buildingId];
            }
            // Update building display
            updateBuildingDisplay(parcel);
        }
    }

    function updateParcelBuildingCount(parcelIndex, buildingCount) {
        const selectedParcel = document.getElementById(`parcel-${parcelIndex + 1}`);
        const buildingHeader = document.getElementById("buildingHeader");
        buildingHeader.textContent = `Buildings (${buildingCount} / ${parcels.maxBuildingsPerParcel})`;
    }

    function getSelectedParcelIndex() {
        return selectedParcelIndex;
    }

    function selectParcel(parcelIndex) {
        selectedParcelIndex = parcelIndex;
        const parcelButtons = document.querySelectorAll(".parcel-button");
        parcelButtons.forEach((button, index) => {
            button.classList.toggle("selected", index === parcelIndex);
        });
    }

    const addedToDropdown = new Set();

    function updateBuildingDropdown() {
        const buildNewBuildingSelect = document.getElementById("buildingSelect");

        // Iterate through all unlocked buildings
        for (const buildingId of window.progressionManager.unlockedBuildings) {
            // If the building hasn't been added to the dropdown yet
            if (!addedToDropdown.has(buildingId)) {
                // Add the building to the dropdown
                const building = window.buildingManager.getBuilding(buildingId);
                const optionElement = document.createElement("option");
                const firstChild = buildNewBuildingSelect.firstChild;
                optionElement.value = building.id;

                // Include the building description if it exists
                const buildingDescription = building.description ? ` - ${building.description}` : "";
                optionElement.textContent = `${building.name} - ${formatResourceCost(building.cost)}${buildingDescription}`;

                //buildNewBuildingSelect.appendChild(optionElement);
                buildNewBuildingSelect.insertBefore(optionElement, firstChild);

                // Mark the building as added to the dropdown
                addedToDropdown.add(buildingId);
            }
        }
    }

    function formatResourceCost(cost) {
      return Object.entries(cost)
        .map(([resource, amount]) => `${resource}: ${amount}`)
        .join(", ");
    }

    function getResourceRateColor(parcel, resourceName) {
      const currentResourceCount = parcel.resources[resourceName] || 0;
      const previousResourceCount = parcel.previousResources[resourceName] || 0;
      const productionRate = currentResourceCount - previousResourceCount;
      if (productionRate > 0) {
        return "green";
      } else if (productionRate < 0) {
        return "red";
      } else {
        if (localStorage.getItem('darkMode') === 'true') {
          return "#222426";
        } else {
          return "#eee";
        }
      }
    }

    function updateSectionVisibility(sectionId, shouldBeVisible) {
      const section = document.getElementById(sectionId);
      section.style.display = shouldBeVisible ? "block" : "none";
    }

    function updateParcelsSectionVisibility() {
      const expansionTech = window.gameState.research.expansionTech;

      updateSectionVisibility("parcels-section", expansionTech);
      updateSectionVisibility("global-header", expansionTech);
      updateSectionVisibility("energy-section", gameState.sectionVisibility.energySection);
      updateSectionVisibility("pollution-section", gameState.sectionVisibility.pollutionSection);
      updateSectionVisibility("fight-container", gameState.sectionVisibility.fightSection);
      updateSectionVisibility("project-section", gameState.sectionVisibility.projectSection);
      updateSectionVisibility("research-section", gameState.sectionVisibility.researchSection);
      updateSectionVisibility("copyDropdownItem", gameState.sectionVisibility.blueprints);
      updateSectionVisibility("pasteDropdownItem", gameState.sectionVisibility.blueprints);

      // //Hide Project Section when all projects are done: Object.values(window.projects.projects).every(array => array.length === 0);
      // updateSectionVisibility("project-section", Object.values(window.projects.projects).length != 0);
    }

    function calculateFulfillmentAndModifier(energyDemand, energyProduction) {
      let fulfillment = (energyProduction / energyDemand) * 100;
      let modifier;
      let emoji;

      if (energyDemand === 0 && energyProduction === 0) {
        fulfillment = 100;
        fulfillmentModifier = 0;
      } else if (energyDemand === 0) {
        fulfillment = 100;
        fulfillmentModifier = 0;
      }


      if (fulfillment >= 200) {
        emoji = '🟢';
        modifier = 0;
      } else if (fulfillment > 120) {
        emoji = '🟢';
        modifier = 0;
      } else if (fulfillment >= 100) {
        emoji = '🟢';
        modifier = 0;
      } else {
        emoji = fulfillment < 40 ? '🔴' : '🟠';
        modifier = fulfillment - 100;
      }

      return {
        fulfillment: fulfillment.toFixed(2),
        fulfillmentModifier: `${emoji} ${modifier.toFixed(2)}%`,
      };
    }

    function updateEnergyDisplay() {
      const energyDemandElement = document.getElementById("energy-demand");
      const energyProductionElement = document.getElementById("energy-production");
      const fulfillmentElement = document.getElementById("fulfillment");
      const fulfillmentModifierElement = document.getElementById("fulfillment-modifier");

      const energyDemand = energyManager.calculateGlobalEnergyUsage();
      const energyProduction = energyManager.calculateGlobalEnergyProduction();
      let modifier = 0;
      energyDemandElement.textContent = energyDemand;
      energyProductionElement.textContent = energyProduction;

      const { fulfillment, fulfillmentModifier } = calculateFulfillmentAndModifier(energyDemand, energyProduction);
      fulfillmentElement.textContent = `${fulfillment}%`;
      fulfillmentModifierElement.textContent = fulfillmentModifier;

      if (fulfillment >= 100) {
        modifier = 0;
        if (fulfillment >= 200) {
            modifier = 0
        }
        parcels.globalProductionRateModifiers.energyModifier = modifier;
        parcels.globalConsumptionRateModifiers.energyModifier = modifier;
        // Reset energy modifier for buildings with energyInput > 0
        for (const parcel of window.parcels.parcelList) {
          for (const buildingId in parcel.buildings) {
            const building = window.buildingManager.getBuilding(buildingId);
            if (building.energyInput > 0) {
              if (parcel.buildingProductionRateModifiers[buildingId]) {
                delete parcel.buildingProductionRateModifiers[buildingId].energyModifier;
              }
              if (parcel.buildingConsumptionRateModifiers[buildingId]) {
                delete parcel.buildingConsumptionRateModifiers[buildingId].energyModifier;
              }
            }
          }
        }
      } else {
        // Reset global modifiers for energy
        parcels.globalProductionRateModifiers.energyModifier = 0;
        parcels.globalConsumptionRateModifiers.energyModifier = 0;

        // Apply negative energy modifier to buildings with energyInput > 0
        const energyModifier = Math.max((fulfillment - 100) / 100, -1);
        for (const parcel of window.parcels.parcelList) {
          for (const buildingId in parcel.buildings) {
            const building = window.buildingManager.getBuilding(buildingId);
            if (building.energyInput > 0) {
              parcel.buildingProductionRateModifiers[buildingId] = parcel.buildingProductionRateModifiers[buildingId] || {};
              parcel.buildingProductionRateModifiers[buildingId].energyModifier = energyModifier;

              parcel.buildingConsumptionRateModifiers[buildingId] = parcel.buildingConsumptionRateModifiers[buildingId] || {};
              parcel.buildingConsumptionRateModifiers[buildingId].energyModifier = energyModifier;
            } else {
              // Remove energy modifier for buildings without energy input
              if (parcel.buildingProductionRateModifiers[buildingId]) {
                delete parcel.buildingProductionRateModifiers[buildingId].energyModifier;
              }
              if (parcel.buildingConsumptionRateModifiers[buildingId]) {
                delete parcel.buildingConsumptionRateModifiers[buildingId].energyModifier;
              }
            }
          }
        }
      }
    }

    function addTooltipToBuyParcelButton(buyParcelButton) {
      const tooltip = document.getElementById("tooltip");

      buyParcelButton.addEventListener("mouseover", (event) => {
        const costText = Object.entries(gameState.buyParcelCost)
          .map(([resource, cost]) => `${cost} ${resource}`)
          .join("<br>");
        const parcelText = `Cost:<br>${costText}`;

        tooltip.innerHTML = parcelText;
        tooltip.style.display = "block";
        tooltip.style.left = event.pageX + 10 + "px";
        tooltip.style.top = event.pageY + 10 + "px";
      });

      // Hide tooltip on mouseout
      buyParcelButton.addEventListener("mouseout", () => {
        tooltip.style.display = "none";
      });

      // Update tooltip position on mousemove
      buyParcelButton.addEventListener("mousemove", (event) => {
        tooltip.style.left = event.pageX + 10 + "px";
        tooltip.style.top = event.pageY + 10 + "px";
      });
    }

    return {
        addParcelToUI,
        updateResourceDisplay,
        updateBuildingDisplay,
        updateParcelBuildingCount,
        getSelectedParcelIndex,
        updateBuildingDropdown,
        selectParcel,
        updateParcelsSectionVisibility,
        updateEnergyDisplay,
        updateSectionVisibility,
        buyBuilding,
        sellBuilding,
        addParcelClickListener,
        addTooltipToBuyParcelButton,
        formatResourceCost,
    };
    })();

    window.ui = ui;
