let connectedDevice = null;
let writeCharacteristic = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  document.getElementById("scanButton").addEventListener("click", async () => {
    console.log("Scan button clicked");

    try {
      const options = {
        filters: [
          { namePrefix: 'Ticket' },
          { namePrefix: 'KS' }
        ],
        optionalServices: ['battery_service', 'device_information']
      };

      log("Starting device scan...");
      const device = await navigator.bluetooth.requestDevice(options);

      if (device) {
        log(`Device selected: ${device.name} (${device.id})`);

        // Start watching advertisements
        device.addEventListener('advertisementreceived', (event) => {
          handleAdvertisementReceived(event);
        });

        log('Watching advertisements from "' + device.name + '"...');
        await device.watchAdvertisements();

        await connectToDevice(device);
        if (connectedDevice) {
          log(`Successfully connected to device: ${connectedDevice.name} (${connectedDevice.id})`);
        } else {
          log(`Failed to update connectedDevice`);
        }
      }

    } catch (error) {
      if (error.name === 'NotFoundError') {
        log("No devices found. Please make sure your device is in pairing mode.");
      } else if (error.name === 'NotSupportedError') {
        log("Web Bluetooth API is not supported by this browser.");
      } else {
        log("Error: " + error);
      }
    }
  });
});

function handleAdvertisementReceived(event) {
  log('Advertisement received.');
  log('  Device Name: ' + event.device.name);
  log('  Device ID: ' + event.device.id);
  log('  RSSI: ' + event.rssi);
  log('  TX Power: ' + event.txPower);
  log('  UUIDs: ' + event.uuids);

  event.manufacturerData.forEach((valueDataView, key) => {
    logDataView('Manufacturer', key, valueDataView);
  });
  event.serviceData.forEach((valueDataView, key) => {
    logDataView('Service', key, valueDataView);
  });

  const deviceInfo = `
    Device Name: ${event.device.name}\n
    Device ID (MAC Address): ${event.device.id}\n
    RSSI: ${event.rssi}\n
    Payload: N/A
  `;
  addDeviceToList(deviceInfo, event.device);
}

function logDataView(type, key, valueDataView) {
  let hexString = '';
  const byteArray = new Uint8Array(valueDataView.buffer);
  byteArray.forEach((byte) => {
    hexString += ('0' + byte.toString(16)).slice(-2) + ' ';
  });
  log(`  ${type} Data: ${key} - ${hexString}`);
}

async function connectToDevice(device) {
  try {
    log("Connecting to GATT server...");
    const server = await device.gatt.connect();

    device.addEventListener("gattserverdisconnected", onDisconnected);

    log("Getting battery service...");
    const service = await server.getPrimaryService("battery_service");

    log("Getting battery level characteristic...");
    const batteryCharacteristic = await service.getCharacteristic("battery_level");

    if (!batteryCharacteristic.properties.read) {
      log("Battery level characteristic does not support reading");
      return;
    }

    log("Reading battery level...");
    const value = await batteryCharacteristic.readValue();
    const batteryLevel = value.getUint8(0);
    log("Battery level is " + batteryLevel + "%");

    // Attempt to find a writable characteristic in the device information service
    const deviceInfoService = await server.getPrimaryService("device_information");
    writeCharacteristic = await findWritableCharacteristic(deviceInfoService);

    if (!writeCharacteristic) {
      log("No writable characteristic found");
    } else {
      log("Writable characteristic found: " + writeCharacteristic.uuid);
    }

    // Update the connectedDevice variable
    connectedDevice = device;
    log(`Connected to device: ${connectedDevice.name} (${connectedDevice.id})`);

  } catch (error) {
    if (error.name === 'NotFoundError') {
      log("No Services matching the UUID found in the device.");
    } else {
      log("Error: " + error);
    }
  }
}

async function findWritableCharacteristic(service) {
  const characteristics = await service.getCharacteristics();
  for (let char of characteristics) {
    if (char.properties.write || char.properties.writeWithoutResponse) {
      log("Found writable characteristic: " + char.uuid);
      return char;
    }
  }
  return null;
}

function onDisconnected(event) {
  const device = event.target;
  log("Device " + device.name + " is disconnected.");
  connectedDevice = null;
  writeCharacteristic = null;
}

const log = (message) => {
  const logDiv = document.getElementById("log");
  logDiv.innerHTML += message + "\n";
};

const addDeviceToList = (deviceInfo, device) => {
  const deviceList = document.getElementById("deviceList");
  const deviceItem = document.createElement("li");

  deviceItem.textContent = deviceInfo;

  const buttonContainer = document.createElement("div");

  const validateButton = document.createElement("button");
  validateButton.textContent = "Validate";
  validateButton.classList.add("validate-button");
  validateButton.addEventListener("click", async () => {
    await validateTicket(device);
  });

  const rejectButton = document.createElement("button");
  rejectButton.textContent = "Reject";
  rejectButton.classList.add("reject-button");
  rejectButton.addEventListener("click", async () => {
    await rejectTicket(device);
  });

  buttonContainer.appendChild(validateButton);
  buttonContainer.appendChild(rejectButton);
  deviceItem.appendChild(buttonContainer);
  deviceList.appendChild(deviceItem);
};

async function validateTicket(device) {
  try {
    // Add your validation logic here
    log(`Validating ticket for device: ${device.name} (${device.id})`);

    // Assuming validation is successful and we need to send a result back
    if (connectedDevice && writeCharacteristic) {
      const validationResult = new Uint8Array([0x01]); // Example result
      await writeCharacteristic.writeValue(validationResult);
      log("Validation result sent back over BLE.");
      alert('Validation successful and result sent!');

      // Display confirmation next to the validate button
      const validateButton = document.querySelector(`#deviceList li:contains('${device.id}') .validate-button`);
      if (validateButton) {
        validateButton.textContent = "Sent";
        validateButton.disabled = true;
      }
    } else {
      log("No connected device or writable characteristic found.");
    }
  } catch (error) {
    log("Error during ticket validation: " + error);
  }
}

async function rejectTicket(device) {
  try {
    // Add your rejection logic here
    log(`Rejecting ticket for device: ${device.name} (${device.id})`);

    // Assuming rejection is necessary and we need to send a result back
    if (connectedDevice && writeCharacteristic) {
      const rejectionResult = new Uint8Array([0x00]); // Example result
      await writeCharacteristic.writeValue(rejectionResult);
      log("Rejection result sent back over BLE.");
      alert('Rejection successful and result sent!');

      // Display confirmation next to the reject button
      const rejectButton = document.querySelector(`#deviceList li:contains('${device.id}') .reject-button`);
      if (rejectButton) {
        rejectButton.textContent = "Rejected";
        rejectButton.disabled = true;
      }
    } else {
      log("No connected device or writable characteristic found.");
    }
  } catch (error) {
    log("Error during ticket rejection: " + error);
  }
}
