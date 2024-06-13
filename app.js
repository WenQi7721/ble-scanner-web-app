let connectedDevice = null;
let writeCharacteristic = null;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  document.getElementById("scanButton").addEventListener("click", async () => {
    console.log("Scan button clicked");

    try {
      const options = {
        acceptAllDevices: true,
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

  document.getElementById('sendButton').addEventListener('click', async () => {
    console.log("Send button clicked");

    try {
      if (!connectedDevice) {
        alert('No connected device found. Please scan and connect to a device first.');
        return;
      }
      if (!writeCharacteristic) {
        alert('No writable characteristic found. Please make sure your device supports writing.');
        return;
      }

      // Prepare payload (example: sending a simple array of bytes)
      const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04]);

      // Write value to characteristic
      await writeCharacteristic.writeValue(payload);

      alert('Custom BLE packet sent!');
    } catch (error) {
      document.getElementById('error').textContent = `Error: ${error.message}`;
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
  addDeviceToList(deviceInfo);
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

const addDeviceToList = (deviceInfo) => {
  const deviceList = document.getElementById("deviceList");
  const deviceItem = document.createElement("li");
  deviceItem.textContent = deviceInfo;
  deviceList.appendChild(deviceItem);
};
