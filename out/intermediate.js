"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var mqtt = require("mqtt");
require("dotenv/config");
var mongodb_1 = require("mongodb");
var url = "mongodb://localhost:27017";
var mongoClient = new mongodb_1.MongoClient(url);
var dbName = "eas";
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var db, samples, devices, client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, mongoClient.connect()];
                case 1:
                    _a.sent();
                    console.log("Connected successfully to database");
                    db = mongoClient.db(dbName);
                    samples = db.collection("samples");
                    devices = db.collection("devices");
                    client = mqtt.connect({
                        servers: [
                            {
                                host: "127.0.0.1",
                                port: 1883
                            },
                        ],
                        username: "eas",
                        password: process.env.PASS
                    });
                    client.on("connect", function () {
                        client.subscribe("devices/+/sample", function (err) {
                            console.log("Subscribed to topic devices/+/sample");
                        });
                        client.subscribe("devices/+/presence", function (err) {
                            console.log("Subscribed to topic devices/+/presence");
                        });
                    });
                    client.on("message", function (topic, message) {
                        try {
                            var _a = topic
                                .toString()
                                .match(/devices\/([a-zA-Z\-0-9]*)\/(sample|presence)/), topicFull = _a[0], deviceName_1 = _a[1], type = _a[2];
                            var msg = JSON.parse(message.toString());
                            if (type === "presence") {
                                devices.updateOne({
                                    name: deviceName_1
                                }, {
                                    $set: {
                                        location: {
                                            lat: msg.lat,
                                            lng: msg.lng
                                        }
                                    },
                                    $setOnInsert: {
                                        created_at: new Date(),
                                        ping: {
                                            latency: null,
                                            last: new Date()
                                        }
                                    }
                                }, {
                                    upsert: true
                                });
                                return;
                            }
                            var samplesReceived = msg.samples;
                            var sentAt = new Date(msg.sent_at);
                            var receivedAt = new Date();
                            receivedAt.setMilliseconds(0);
                            var delay = Math.abs((receivedAt.getTime() - sentAt.getTime()) / 1000);
                            console.log("Received ".concat(samplesReceived.length, " samples."));
                            var mappedSampled = samplesReceived.map(function (sample) {
                                var sum = sample.data.reduce(function (a, b) { return a + b; }, 0);
                                return {
                                    data: sample.data,
                                    sampled_at: new Date(sample.sampled_at),
                                    device: deviceName_1,
                                    db: Math.abs(((sum / sample.data.length) % 100) + 20)
                                };
                            });
                            samples.insertMany(mappedSampled);
                            devices.updateOne({
                                name: deviceName_1
                            }, {
                                $set: {
                                    ping: {
                                        latency: delay,
                                        last: receivedAt
                                    }
                                }
                            });
                        }
                        catch (e) {
                            console.log("unalbe to interpret message");
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
main();
