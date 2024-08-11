const chartFunc = require("./auxFunctions/api.js");
require("dotenv").config();
const {MongoClient, ServerApiVersion} = require("mongodb");

const cron = async () => {
  //exit if market is not open
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  const url = "https://paper-api.alpaca.markets/v2/calendar";
  const response = await fetch(`${url}?start=${today}&end=${today}`, chartFunc.fetchOptions);
  const res = await response.json();
  if(!res || res.length === 0 || (now.getHours() === 4 && now.getMinutes() < 15) || (now.getHours() === 8 && now.getMinutes() > 15))
    return;

  //initialize db connection
  const client = new MongoClient(process.env.URI, {serverApi: {version: ServerApiVersion.v1, strict: true, deprecationErrors: true}});
  let db, collection;
  const connect = async() => {
    try {
      await client.connect();
      //send a ping to confirm successful connection
      db = await client.db("paperdb")
      collection = await db.collection("userCollection");
      console.log("Connected to DB");
    } catch(error) {
      console.log(error);
    }
  }

  const updateAcct = async (account) => {
    const user = account.userID;
    const charts = account.charts;
    let acctVal = account.buyingPower, startPrice;
    const owned = account.owned;
    const ownedList = Object.keys(owned);
    if(now.getHours() === 4 && now.getMinutes() === 15) {
      startPrice = account.buyingPower;
      charts["day"] = [];
    }
    for(const stock of ownedList) {
      const response = await getData("5Min", 0, stock);
      const price = response[1][response.length - 1];
      if(startPrice)
        startPrice += response[1][0];
      acctVal += owned[stock] * price;
    }
    if(startPrice)
      charts["day"].push(startPrice);
    charts["day"].push(acctVal);
    if(now.minutes === 0) {
      charts["week"].unshift();
      charts["week"].push(acctVal);
      if(now.getHours() === 16) {
        const params = ["month", "month3", "month6", "year"];
        for(const param of params) {
          charts[param].unshift();
          charts[param].push(acctVal);
        }
      }
    }
    const updates = {$set: {accountValue: acctVal, charts: charts}};
    collection.updateOne({userID: user}, updates);
  }

  collection.find({}).toArray();
  collection.forEach(account => updateAcct(account));
}
