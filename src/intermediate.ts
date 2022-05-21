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

  const collection = db.collection("samples");

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
  });

  client.on("message", function (topic, message) {
    let deviceName: string = topic
      .toString()
      .match(/devices\/([a-zA-Z\-0-9]*)\/sample/)[1];
    let sample = JSON.parse(message.toString());
    collection.insertOne({
      sampled_at: new Date(sample.time),
      device: deviceName,
      collected_at: new Date(),
      data: sample.data,
    });
  });
}

main();
