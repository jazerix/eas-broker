import * as mqtt from "mqtt";
import "dotenv/config";
import { MongoClient } from "mongodb";

const url = "mongodb://localhost:27017";
const mongoClient = new MongoClient(url);
const dbName = "eas";

async function main() {
  await mongoClient.connect();
  console.log("Connected successfully to database");
  const db = mongoClient.db(dbName);

  const samples = db.collection("samples");
  const devices = db.collection("devices");

  const client = mqtt.connect({
    servers: [
      {
        host: "127.0.0.1",
        port: 1883,
      },
    ],
    username: "eas",
    password: process.env.PASS,
  });

  client.on("connect", function () {
    client.subscribe("devices/+/sample", function (err) {
      console.log(`Subscribed to topic devices/+/sample`);
    });
    client.subscribe("devices/+/presence", function (err) {
      console.log(`Subscribed to topic devices/+/presence`);
    });
  });

  client.on("message", function (topic, message) {
    try {
      const [topicFull, deviceName, type] = topic
        .toString()
        .match(/devices\/([a-zA-Z\-0-9]*)\/(sample|presence)/);

      let msg = JSON.parse(message.toString());

      if (type === "presence") {
        devices.updateOne(
          {
            name: deviceName,
          },
          {
            $set: {
              location: {
                lat: msg.lat,
                lng: msg.lng,
              },
            },
            $setOnInsert: {
              created_at: new Date(),
              ping: {
                latency: null,
                last: new Date(),
              },
            },
          },
          {
            upsert: true,
          }
        );
        return;
      }

      const samplesReceived = msg.samples;
      const sentAt = new Date(msg.sent_at);
      const receivedAt = new Date();
      receivedAt.setMilliseconds(0);
      let delay = Math.abs((receivedAt.getTime() - sentAt.getTime()) / 1000);

      console.log(
        `Received ${samplesReceived.length} samples from "${deviceName}".`
      );

      let mappedSampled = samplesReceived.map((sample) => {
        let sum = sample.data.reduce((a: number, b: number) => a + b, 0);
        return {
          data: sample.data,
          sampled_at: new Date(sample.time),
          device: deviceName,
          db: Math.abs(((sum / sample.data.length) % 100) + 20),
        };
      });

      samples.insertMany(mappedSampled);

      devices.updateOne(
        {
          name: deviceName,
        },
        {
          $set: {
            ping: {
              latency: delay,
              last: receivedAt,
            },
          },
        }
      );
    } catch (e) {
      console.log("unable to interpret message");
    }
  });
}

main();
