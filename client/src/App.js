import { useState, useEffect, useRef } from 'react';
import './App.css'
import SearchIcon from "./search.svg";

//components / assets / functions
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js/auto';
import { Line } from 'react-chartjs-2';

//in house assets
import LineChart from "./components/LineChart.jsx";
import WatchList from "./components/WatchList.jsx";
import Exchange from './components/buySell.jsx';
import { verticalHoverLine } from "./chartAssets/verticalLine.js";
import ctt from "./chartAssets/ctt.js";
import { focusBtn, commaFormat, percentFormat, chartSubHeader, unSubCheck, getPortData, loginUpdate } from "./auxFunctions/functions.js";
import { addData, changeColor } from './chartAssets/updateData.js';
//import { baseline } from './chartAssets/baseline.js';

import { ChartData, ChartClass, defaultOptions, fetchOptions, defaultAccount } from "./Data.js" // NEED TO SPECIFY ".js" FOR NAMED EXPORT

//variables to fetch market data
const url = "https://data.alpaca.markets/v2/stocks/bars";
const params = "?sort=asc";
let ws;
let focus = ""; //used for case where exchange of stock occurs when user does not have that stock in focus (state is not updated in the handler function)

//test parameters to be changed later
const defaultSearch = "SPY";
let arr = []; //watchlist
let subs = []; //subs list
let owned = {}; //stocks list
let tempSub = ""; //used to correctly unsub from a stock when user unloads while on individual stock screen that is not in subs list
let account;

//const doSmth = async () => {
  /*const es = new EventSource(`http://localhost:5000/ws?stocks=${JSON.stringify(arr)}`);
  es.onmessage = (message) => {console.log(message.data)};
  es.onerror = () => {es.close()};*/
  //const chart = document.querySelectorAll(".wlChart").forEach(chart => console.log(chart.getAttribute("stock")));
//}

function App() {
  const [chartData, setChartData] = useState(); //data drawn on chart
  const [searchTerm, setSearchTerm] = useState(defaultSearch); //term used to fetch data for correct stock
  const [frameState, setFrameState] = useState("5Min"); //bar size that needs to be fetched
  const [start, setStart] = useState(0); //least recent day used to fetch data
  const [currPrice, setCurrPrice] = useState(0); //most recent price
  const [showPrice, setShowPrice] = useState(); //display price
  const [prices, setPrices] = useState({map: new Map()}); //websocket prices
  const [portView, setPortView] = useState(true); //whether current view is portfolio (set to true) or a stock (set to false)
  const [options, setOptions] = useState(defaultOptions); //options used for main chart
  const [basePrice, setBasePrice] = useState(); //used for price change calculation
  const [loggedIn, setLoggedIn] = useState(false);
  const [buyPower, setBuyPower] = useState(100000);
  const [av, setAV] = useState();

  const doSmth = async () => {
    /*const message = await fetch("/quotes?stock=SBUX");
    const m = await message.json();
    m.sort();
    if(m.length > 0)
      console.log(m[Math.floor(m.length / 2)]);
    else
      console.log(m);*/
    //baseline(ChartJS.getChart(document.querySelector(".portChart")), 560);
    /*const compTime = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=NVDA&period=1Day&goBack=6`);
    const [compX, compY] = await compTime.json();
    console.log(compX, compX[0].length);*/
   
    /*const result = await getPortData("5Min", 0, account);
    console.log(result);
    console.log(account);*/
    const result = await fetch("/temp");
    const res = await result.json();
    console.log(res.data);
    //console.log(ChartJS.getChart(document.querySelector(".portChart")).data.datasets[0].data);
    /*const result = await getPortData("5Min", 0, account);
    console.log(result);
    console.log(account);*/
  }

  //unhover listener (couldn't find out how to import correctly)
  const unHover = {
    id: "unHover",
    beforeEvent(chart, args) {
      const event = args.event;
      if(event.type === "mouseout")
        setShowPrice(undefined);
    }
  }
 
  //creating chartref for onHover event
  let ops = defaultOptions;
  ops.onHover = (e, arr) => {
    if(arr.length > 0)
      setShowPrice(commaFormat(arr[0].element.$context.raw));
  }

  //function for setting chart data parameters
  const focusChart = async (timeframe, goBack, term, pv = portView) => {
    tempSub = term;
    let xData, yData;
    /*if(pv && account) {
      console.log("getPortData");
      [xData, yData] = await getPortData(timeframe, goBack, account);
      setSearchTerm("Portfolio");
    }
    else {*/
      const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=${term}&period=${timeframe}&goBack=${goBack}`);
      [xData, yData] = await response.json();
    //}
    if(xData && xData.length > 0) {
      const price = prices.map.get(term);
      if(price !== undefined) {
        xData.push(1);
        yData.push(price);
      }
      if(timeframe === "5Min") {
        for(let i = xData.length; i < 193; i++) {
          xData.push(1);
        }
      }
      let bp;
      if(timeframe == "5Min") {
        if(loggedIn && pv)
          bp = av;
        else {
          const a = await fetch(`${process.env.REACT_APP_EXPRESS_URL}percent?stock=${term}`);
          const res = await a.json();
          bp = res[0].bars[term][0].c;
        }
        //draw a horizontal line at baseprice
        //baseline(ChartJS.getChart(document.querySelector(".portChart")), bp);
      }
      else
        bp = yData[0];
      const color = yData[yData.length - 1] >= bp ? "rgb(31, 217, 22)" : "rgb(242, 80, 5)";
      setBasePrice(bp);
      setCurrPrice(commaFormat(yData[yData.length - 1]));
      setShowPrice(commaFormat(yData[yData.length - 1]));
      setChartData(new ChartClass(xData, yData, color));
    }
    else {
      setChartData(undefined);
      setShowPrice("0.00")
    }
  }

  //functions that change chart and state variables
  const btnClick = (timeframe, goBack) => {
    focusBtn(".timeButton", true);
    setFrameState(timeframe);
    setStart(goBack);
    focusChart(timeframe, goBack, searchTerm);
  }

  const newSearch = () => {
    //unSubCheck(subs, searchTerm, ws);
    const st = document.querySelector(".searchBar").value.toUpperCase();
    if(st === "")
      return;
    focus = st;
    setSearchTerm(st);
    setPortView(false);
    //if(!subs.includes(st))
      //ws.send(JSON.stringify({action: "s", stocks: [st]}));
    focusChart(frameState, start, st, false);
  }

  const wlUpdate = (stock) => {
    focus = stock;
    setSearchTerm(stock);
    setPortView(false);
    focusChart(frameState, start, stock, false);
  }

  const updatePort = (shares, price, buy, stock) => {
    if(buy) {
      const bp = Number((Number(buyPower) - shares * price).toFixed(2));
      setBuyPower(bp);
      fetch(`${process.env.REACT_APP_EXPRESS_URL}owned?user=test&action=add&change=${JSON.stringify([[stock, shares]])}&bp=${JSON.stringify(bp)}`);
      if(owned[stock] === undefined) {
        owned[stock] = shares;
        if(!subs.includes(stock)) { //add to subs if stock is not currently on watchlist
          subs.push(stock);
          if(stock !== focus) //stock has been purchased, but user has clicked home / search
            ws.send(JSON.stringify({action: "s", stocks: [stock]}))
        }
      }
      else
        owned[stock] += shares;
    }
    else {
      const bp = Number((Number(buyPower) + shares * price).toFixed(2));
      setBuyPower(bp);
      owned[stock] -= shares;
      fetch(`${process.env.REACT_APP_EXPRESS_URL}owned?user=test&action=remove&change=${JSON.stringify([[stock, shares]])}&bp=${bp}`, options);
      if(owned[stock] === 0) {
        delete owned[stock];
        if(!arr.includes(stock)) { //remove from subs if stock is not currently on watchlist
          subs.splice(subs.indexOf(stock), 1);
          if(stock !== focus) //stock has been sold, but user has clicked home /search
            unSubCheck(subs, stock, ws);
        }
      }
    }
  }

  //update with realtime prices
  const update = async (data) => {
    const m = await JSON.parse(data);
    setPrices((prices) => {
      prices.map.set(m.S, m.c);
      return {map: prices.map};
    });
    const list = document.querySelectorAll(".wlChart");
    let pick;
    for(let i = 0; i < list.length; i++) {
      if(list[i].getAttribute("stock") === m.S) {
        pick = list[i];
        break;
      }
    }
    if(pick)
      addData(ChartJS.getChart(pick), 1, m.c);
    //if(m.S === searchTerm)
        //addData(ChartJS.getChart(".portChart"), 1, m.c);
    //use setPrices to change prices map to include latest stock/price
  }

  const init = async () => {
    //fetch account data from database
    const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}users?action=read&user=test`);
    const res = await response.json();
    account = res.data;
    //update portData for each chart type on login
    //loginUpdate(account);
    setBuyPower(account.buyingPower);
    setAV(account.accountValue);
    console.log(account);
    [arr, subs, owned] = [account.wl, account.subs, account.owned];
    //subscribe to each => onMessage, change price for that stock in prices map
    /*ws = new WebSocket(process.env.REACT_APP_WS);//new EventSource(`http://localhost:5000/ws?stocks=${JSON.stringify(arr)}`);
    ws.onmessage = async (event) => {
      if(event.data === "open") {
        console.log(event.data);
        ws.send(JSON.stringify({action: "s", stocks: subs}));
      }
      else
        update(event.data);
    }
    ws.onerror = () => {
      console.log("Server closed connection");
      ws.close();
    }
    window.onbeforeunload = () => {
      if(tempSub !== "" && !subs.includes(tempSub))
        subs.push(tempSub);
      ws.send(JSON.stringify({action: "u", stocks: subs}));
    }*/
  }

  //initialize chart
  useEffect(() => {focusChart(frameState, start, searchTerm)}, [prices.map.get(searchTerm)]);
  useEffect(() => {init()}, []);

  return (
    <div className="app">
      <div className="head">
        <h1 className="homeBtn" onClick={() => {
          //unSubCheck(subs, searchTerm, ws);
          focus = "";
          setSearchTerm("SPY");
          focusChart(frameState, start, defaultSearch, true);
          setPortView(true);
        }}>App</h1>
        <div className="search">
          <input
            className="searchBar"
            placeholder="Search">
          </input>
          <img
            className="searchIcon"
            src={SearchIcon}
            alt="search"
            onClick={() => newSearch()}>
          </img>
        </div>
      </div>
      <div className="main">
        <div className="chartDiv">
          <h1 className="chartText">{searchTerm}</h1>
          <h1 className="chartText">${showPrice ? showPrice : currPrice}</h1>
          {
            chartData !== undefined ?
            <>
            {
              basePrice ? <p className="chartSubHead">{chartSubHeader(basePrice, showPrice ? showPrice : currPrice)}</p> : <></>
            }
              <LineChart name="portChart" stock={searchTerm} chartData={chartData.data} options={options} plugins={[verticalHoverLine, unHover]}></LineChart>
            </> :
            <h2>Chart data not found for ${searchTerm}</h2>
          }
          <div className="buttonDiv">
            <button className="timeButton" autoFocus onFocus={() => btnClick("5Min", 0)}>1D</button>
            <button className="timeButton" onFocus={() => btnClick("1Hour", 7)}>1W</button>
            <button className="timeButton" onFocus={() => btnClick("1Day", 1)}>1M</button>
            <button className="timeButton" onFocus={() => btnClick("1Day", 3)}>3M</button>
            <button className="timeButton" onFocus={() => btnClick("1Day", 6)}>6M</button>
            <button className="timeButton" onFocus={() => btnClick("1Day", 12)}>1Y</button>
          </div>
          <hr className="line"></hr>
          {portView ? <h3>Buying Power: ${commaFormat(buyPower)}</h3> : <h3>Shares: {owned[searchTerm] || 0}</h3>}
          <button onClick={() => doSmth()}>Click</button>
        </div>
        <div className="SidePanel">
          {
            portView ?
            <>
              {
                Object.keys(owned).length > 0 ?
                  <WatchList title="Stocks" stocks={Object.keys(owned)} curr={prices} count={owned} click={(stock) => wlUpdate(stock)}></WatchList> :
                  <></>
              }
              {<WatchList title="Watchlist" stocks={arr} curr={prices} click={(stock) => wlUpdate(stock)}></WatchList>}
            </> :
            <>
            {
              chartData !== undefined ?
              <Exchange className="Exchange" stock={searchTerm} marketPrice={currPrice} contains={arr.includes(searchTerm)} stake={owned[searchTerm] || 0} bp={buyPower}
                        action={(shares, price, buy, stock) => updatePort(shares, price, buy, stock)} wlChange={() => {
                //remove if wl contains stock
                if(arr.includes(searchTerm)) {
                  arr.splice(arr.indexOf(searchTerm), 1);
                  if(owned[searchTerm] === undefined) //remove from permanent subs if user does not own stock
                    subs.splice(subs.indexOf(searchTerm), 1);
                  //remove from database
                  fetch(`${process.env.REACT_APP_EXPRESS_URL}watchlist?user=test&action=remove&change=${JSON.stringify([searchTerm])}`);
                }
                //add if wl does not contain stock
                else {
                  if(subs.length < 25) {
                    arr.push(searchTerm);
                    if(owned[searchTerm] === undefined) //add to permanent subs if user does not own stock
                      subs.push(searchTerm);
                    //add to database
                    fetch(`${process.env.REACT_APP_EXPRESS_URL}watchlist?user=test&action=add&change=${JSON.stringify([searchTerm])}`);
                  }
                  else {
                    alert("Max Watchlist size is 25");
                    return false;
                  }
                }
                return true;
              }}></Exchange> :
              <></>
             }
            </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
