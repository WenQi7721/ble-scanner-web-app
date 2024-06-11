let connectedDevice = null;
let writeCharacteristic = null;
let scanning = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  document.getElementById("scanButton").addEventListener("click", async () => {
    console.log("Scan button clicked");

    if (scanning) {
      log("Already scanning...");
      return;
    }

    if (!navigator.bluetooth || !navigator.bluetooth.requestLEScan) {
      log("Error: Bluetooth LE Scan is not supported in this browser.");
      return;
    }

    try {
      const options = {
        acceptAllAdvertisements: true,
      };

      log("Starting BLE scan...");
      scanning = true;

      const scan = await navigator.bluetooth.requestLEScan(options);

      navigator.bluetooth.addEventListener("advertisementreceived", event => {
        const device = event.device;
        const rssi = event.rssi;
        const payload = new TextDecoder().decode(event.manufacturerData.get(0xFFFF));

        log(`Advertisement received from ${device.name} (${device.id})`);
        log(`RSSI: ${rssi}`);
        log(`Payload: ${payload}`);

        // Display device information
        const deviceInfo = `
          Device Name: ${device.name}\n
          Device ID (MAC Address): ${device.id}\n
          RSSI: ${rssi}\n
          Payload: ${payload}
        `;
        addDeviceToList(deviceInfo);

        // Connect to the device when an advertisement is received
        connectToDevice(device);
      });

      // Stop scanning after 30 seconds
      setTimeout(() => {
        log("Stopping BLE scan...");
        scan.stop();
        scanning = false;
        alert('Scanning stopped after 30 seconds');
      }, 30000);

    } catch (error) {
      log("Error: " + error);
      scanning = false;
    }
  });

  document.getElementById('sendButton').addEventListener('click', async () => {
    console.log("Send button clicked");

    try {
      if (!connectedDevice || !writeCharacteristic) {
        alert('No device connected or writable characteristic found. Please scan for a device first.');
        return;
      }

      const payload = document.getElementById('payloadInput').value;
      if (!payload) {
        alert('Please enter a payload to send.');
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      await writeCharacteristic.writeValue(data);

      alert('Custom BLE packet sent!');
    } catch (error) {
      document.getElementById('error').textContent = `Error: ${error.message}`;
    }
  });
});

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

    connectedDevice = device;

  } catch (error) {
    log("Error: " + error);
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
