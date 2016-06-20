
window.onload = function () {
    WebSocketConnect();
};



// Dashboard parameters
// Ip Address of the Eurotech Device Cloud (EDC) MQTT Broker (WebSockets)
var MQTTBrokerIP = "broker-sandbox.everyware-cloud.com";

// EDC account name; set to that provided in lab instructions
var accountName = "Red-Hat";

// MQTT User Name; set to that provided in lab instructions
var user = "s-stark";

// MQTT Password; set to that provided in lab instructions
var password = "********";

// RHIoTTagService APP_ID
var AppId = "org.jboss.rhiot.services.RHIoTTagScanner";

// RHIoTTagService data Topic
var dataTopic = "data";

// RHIoTTag MAC address; set XX:XX:XX:XX:XX:XX to your tag BLE address
var tagMACAddress = "XX:XX:XX:XX:XX:XX";

// DN2016-GWN of the RHIoTTagServices gateway where N = number of gateway at your table
var GatewayName = "DN2016-GW0";



// Initialize Protobuf
var ProtoBuf = dcodeIO.ProtoBuf;
var ByteBuf = dcodeIO.ByteBuffer;
var pbMsg = ProtoBuf.loadProto("package kuradatatypes;option java_package= \"org.eclipse.kura.core.message.protobuf\";option java_outer_classname = \"KuraPayloadProto\";message KuraPayload {message KuraMetric {enum ValueType{DOUBLE = 0;FLOAT = 1;INT64 = 2;INT32 = 3;BOOL = 4;STRING = 5;BYTES = 6;}required string name = 1;required ValueType type = 2;optional double double_value = 3;optional float float_value = 4;optional int64 long_value = 5;optional int32 int_value = 6;optional bool bool_value = 7;optional string string_value = 8;optional bytes bytes_value = 9;}message KuraPosition{required double latitude=1;required double longitude=2;optional double altitude=3;optional double precision=4;optional double heading=5;optional double speed = 6;optional int64 timestamp=7;optional int32 satellites=8;optional int32 status=9;}optional int64 timestamp = 1;optional KuraPosition position  = 2;extensions 3 to 4999;repeated KuraMetric metric=5000;optional bytes body= 5001;}")
        .build("kuradatatypes.KuraPayload");

var client = new Paho.MQTT.Client(MQTTBrokerIP, 8080, "ClientDashboard-" + GatewayName);

var timedFunction;
var previousScore = 0;
var currentScore = 0;
var shotsLeft = 0;
var shootingTimeLeft = 0;
var gameTimeLeft = 0;
var luxVal = 0;
var previousEvent = "NOOP";


function WebSocketConnect() {
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    client.startTrace();
    client.connect({
        userName: user,
        password: password,
        onSuccess: onConnect,
        onFailure: onFailToConnect
        }
    );

    function onConnect() {
        console.log("onConnect");
        var topic = accountName + "/" + GatewayName + "/" + AppId + "/" + dataTopic + "/" + tagMACAddress + "/#";
        client.subscribe(topic);
        console.log("Subscribed to topic: "+topic);
    };

    function onFailToConnect(info) {
        console.log("Failed to connect: code=" + info.errorCode + ", msg=" + info.errorMessage);
    };

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:" + responseObject.errorMessage);
        }
    };

    function onMessageArrived(message) {
        var topic = message.destinationName;
        var topicFragments = topic.split('/');
        //console.log(topicFragments);

        // Get the payload
        var bytes = message.payloadBytes;
        // Check for GZip header
        if (bytes[0] == 31 && bytes[1] == 139 && bytes[2] == 8 && bytes[3] == 0) {
            //if the packet is a GZip buffer, decompress it...

            // Convert the payload to a Base64 string
            var b64 = _arrayBufferToBase64(bytes);
            // Decompress the payload into a string
            var cdecomp = JXG.decompress(b64);
            // Generate a byte array from the decompressed string
            var bytes = new Uint8Array(cdecomp.length);
            for (var i = 0; i < cdecomp.length; ++i) {
                bytes[i] = (cdecomp.charCodeAt(i));
            }
        }

        // Finally decode the packet with Protocol Buffers
        var newMsg = pbMsg.decode(bytes);
        var metrics = newMsg.getMetric();

        //console.log(newMsg);

        for (i = 0; i < metrics.length; i++) {
            var metric = newMsg.getMetric()[i];
            var statusLabel = "";
            var hintLabel = "";
            var seconds = 0;
            var minutes = 0;

            if (metric.name === "rhiotTag.gameScore") {
                currentScore = metric.int_value;
                $("#score").text("Score: " + currentScore);
            }
            if (metric.name === "rhiotTag.lux") {
                luxVal = metric.int_value;
                $("#lux").text("Lux: " + luxVal);
                $("#shotsLeft").text("Shots Left: " + shotsLeft);
            }
            if (metric.name === "rhiotTag.shotsLeft") {
                shotsLeft = metric.int_value;
                $("#lux").text("Lux: " + luxVal);
                $("#shotsLeft").text("Shots Left: " + shotsLeft);
            }
            if (metric.name === "rhiotTag.shootingTimeLeft") {
                shootingTimeLeft = metric.int_value;
                seconds = Math.floor((shootingTimeLeft / 1000) % 60);
                minutes = Math.floor((shootingTimeLeft / (1000 * 60)) % 60);
                $("#lux").text("Lux: " + luxVal);
                $("#sTimeLeft").text("Shooting time left: " + minutes + "m:" + seconds + "s");
            }
            if (metric.name === "rhiotTag.gameTimeLeft") {
                gameTimeLeft = metric.int_value;
                seconds = Math.floor((gameTimeLeft / 1000) % 60);
                minutes = Math.floor((gameTimeLeft / (1000 * 60)) % 60);
                $("#lux").text("Lux: " + luxVal);
                $("#gameTimeLeft").text("Game time left: " + minutes + "m:" + seconds + "s");
            }


            if (metric.name === "rhiotTag.event" && metric.string_value === "HIT_DETECTED") {
                statusLabel = "POINT SCORED!!";
                previousScore = currentScore;
                $("#target_frame").attr("class", "red");
                $("#gameStatusMessages").text(statusLabel);
                previousEvent = "HIT_DETECTED";
            }
            if (metric.name === "rhiotTag.event" && metric.string_value === "LS_RESET") {
                $("#target_frame").attr("class", "green");
                statusLabel = "";
                $("#gameStatusMessages").text(statusLabel);
                previousEvent = "LS_RESET";
            }
            if (metric.name === "rhiotTag.event" &&
                    metric.string_value === "LEFT_RIGHT_PRESSED" &&
                    (previousEvent === "GAME_TIMEOUT" || previousEvent === "NOOP")) {
                $("#target_frame").attr("class", "green");
                hintLabel = "";
                $("#gameHintsMessages").text(hintLabel);
                previousEvent = "LEFT_RIGHT_PRESSED";
            }
            if (metric.name === "rhiotTag.event" && metric.string_value === "WINDOW_TIMEOUT") {
                $("#target_frame").attr("class", "yellowL");
                hintLabel = "Press L for a new round";
                $("#gameHintsMessages").text(hintLabel);
                previousEvent = "WINDOW_TIMEOUT";
            }
            if (metric.name === "rhiotTag.event" && metric.string_value === "LEFT_PRESSED") {
                if (previousEvent !== "GAME_TIMEOUT" && previousEvent !== "NOOP") {
                    $("#target_frame").attr("class", "green");
                    hintLabel = "";
                    $("#gameHintsMessages").text(hintLabel);
                    previousEvent = "LEFT_PRESSED";
                }
            }
            if (metric.name === "rhiotTag.event" && metric.string_value === "RIGHT_PRESSED") {
                if (previousEvent !== "GAME_TIMEOUT" && previousEvent !== "NOOP") {
                    $("#target_frame").attr("class", "green");
                    hintLabel = "";
                    $("#gameHintsMessages").text(hintLabel);
                    previousEvent = "RIGHT_PRESSED";
                }
            }
            if (metric.name === "rhiotTag.event" && metric.string_value === "CLIP_EMPTY") {
                $("#target_frame").attr("class", "yellowR");
                hintLabel = "Press R to reload ammo";
                $("#gameHintsMessages").text(hintLabel);
                previousEvent = "CLIP_EMPTY";
            }
            if (metric.name === "rhiotTag.event" && metric.string_value === "GAME_TIMEOUT") {
                $("#target_frame").attr("class", "yellowLR");
                hintLabel = "Press L+R button to start the game";
                $("#gameHintsMessages").text(hintLabel);
                previousEvent = "GAME_TIMEOUT";
            }

            if (hintLabel !== "") {
                console.log(hintLabel);
            }
            if (statusLabel !== "") {
                console.log(statusLabel);
            }
        }

    };

    function _arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[ i ]);
        }
        return window.btoa(binary);
    };

    function _base64ToArrayBuffer(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            var ascii = binary_string.charCodeAt(i);
            bytes[i] = ascii;
        }
        return bytes.buffer;
    };
}
