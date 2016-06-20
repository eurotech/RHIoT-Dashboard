# RHIoT-Dashboard
Simple HTML dashboard that uses websockets connection to the EC cloud platform.

## Parameters
The following parameters must be provided in order to have the dashboard correctly working:

 * **MQTTBrokerIP**: Ip Address of the Eurotech Device Cloud (EDC) MQTT Broker (WebSockets);

 * **accountName**: EDC account name; set to that provided in lab instructions;

 * **user**: MQTT User Name; set to that provided in lab instructions;

 * **password**: MQTT Password; set to that provided in lab instructions;

 * **AppId**: RHIoTTagService APP_ID;
 
 * **dataTopic**: RHIoTTagService data Topic;

 * **tagMACAddress**: RHIoTTag MAC address; set XX:XX:XX:XX:XX:XX to your tag BLE address;

 * **GatewayName**: DN2016-GWN of the RHIoTTagServices gateway where N = number of gateway at your table
 
## Dashboard
![dashboard_appearance](https://s3.amazonaws.com/kura-resources/red-hat/dashboard_1.png)
