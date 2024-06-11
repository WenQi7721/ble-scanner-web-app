// document.getElementById('scanButton').addEventListener('click', async () => {
//     try {
//       const options = {
//         acceptAllDevices: true,
//       };
      
//       log("Requesting Bluetooth device...");
//       const device = await navigator.bluetooth.requestDevice(options);

//       log("Connecting to GATT server...");
//       const server = await device.gatt.connect();

//       navigator.bluetooth.addEventListener('advertisementreceived', (event) => {
//         const deviceName = device.name
//         const macAddress = event.device.id;
//         const rssi = event.rssi;
//         const payload = new TextDecoder().decode(event.manufacturerData.get(0xFFFF));
  
//         const resultDiv = document.getElementById('result');
//         const result = `
//           <p>Device Name: ${deviceName}</p>
//           <p>MAC Address: ${macAddress}</p>
//           <p>RSSI: ${rssi}</p>
//           <p>Advertising Payload: ${payload}</p>
//           <hr>
//         `;
  
//         resultDiv.innerHTML += result;
//       });
  
//       setTimeout(() => {
//         device.stop();
//         alert('Scanning stopped after 30 seconds');
//       }, 30000);
  
//     } catch (error) {
//       console.error('Error:', error);
//     }
//   });


async function onButtonClick() {
    try {
      const options = {
        acceptAllDevices: true,
        optionalServices: ["battery_service"], // You can add more services as needed
      };

      log("Requesting Bluetooth device...");
      const device = await navigator.bluetooth.requestDevice(options);

      log("Connecting to GATT server...");
      const server = await device.gatt.connect();

      device.addEventListener("gattserverdisconnected", onDisconnected);

      log("Getting battery service...");
      const service = await server.getPrimaryService("battery_service");

      log("Getting battery level characteristic...");
      const characteristic = await service.getCharacteristic(
        "battery_level"
      );

      log("Reading battery level...");
      const value = await characteristic.readValue();
      const batteryLevel = value.getUint8(0);
      log("Battery level is " + batteryLevel + "%");

      // Log additional device information
      log("Device Name: " + device.name);
      log("Device ID (MAC Address): " + device.id);

      // Poll RSSI every 30 seconds
      setInterval(async () => {
        log("Reading RSSI...");
        const rssi = await device.gatt.readRSSI();
        log("RSSI: " + rssi);
      }, 30000);
    } catch (error) {
      log("Error: " + error);
    }
  }

  function onDisconnected(event) {
    const device = event.target;
    log("Device " + device.name + " is disconnected.");
  }

  const log = (message) => {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += message + "\n";
  };
document.getElementById("scan").addEventListener("click", onButtonClick);






document.getElementById('sendButton').addEventListener('click', async () => {
    try {
      const payload = document.getElementById('payloadInput').value;
      if (!payload) {
        alert('Please enter a payload to send.');
        return;
      }
  
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      });
  
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('device_information'); // Example service
      const characteristic = await service.getCharacteristic('model_number_string'); // Example characteristic
  
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      await characteristic.writeValue(data);
  
      alert('Custom BLE packet sent!');
    } catch (error) {
      document.getElementById('error').textContent = `Error: ${error.message}`;
    }
});
  