"use strict";
exports.__esModule = true;
var mqtt = require("mqtt");
var client = mqtt.connect("mqtt://127.0.0.1:1883");
console.log("HELLO");
client.on("connect", function () {
    console.log("HELLO");
    client.subscribe("presence", function (err) {
        if (!err) {
            client.publish("presence", "Hello mqtt");
        }
    });
});
client.on("message", function (topic, message) {
    // message is Buffer
    console.log(message.toString());
});
