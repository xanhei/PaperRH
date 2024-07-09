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
import { focusBtn } from "./auxFunctions/functions.js";
import { addData } from './chartAssets/updateData.js';

import { ChartData, ChartClass, defaultOptions, fetchOptions } from "./Data.js" // NEED TO SPECIFY ".js" FOR NAMED EXPORT

//variables to fetch market data
const url = "https://data.alpaca.markets/v2/stocks/bars";
const params = "?sort=asc";

//test parameters to be changed later
const defaultSearch = "SPY";
const arr = ["SPY","AMD","NVDA"];

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

  const [k, setK] = useState(0);

  const doSmth = () => {
    const list = document.querySelectorAll(".wlChart");
    let pick;
    for(let i = 0; i < list.length; i++)
      if(list[i].getAttribute("stock") == "SPY") {
        pick = list[i];
        break;
      }
    const chart = ChartJS.getChart(pick);
    addData(chart, 1, 545);
  }

  //unhover listener (couldn't find out how to import correctly)
  const unHover = {
    id: "unHover",
    beforeEvent(chart, args) {
      const event = args.event;
      if(event.type == "mouseout") {
        setShowPrice(undefined);
      }
    }
  }
  
  //creating chartref for onHover event
  let ops = defaultOptions;
  ops.onHover = (e, arr) => {
    if(arr.length > 0)
      setShowPrice((Number(Math.ceil(arr[0].element.$context.raw * 100) / 100).toFixed(2)));
    else
      setShowPrice(undefined);
  }

  //function for setting chart data parameters
  const focusChart = async (timeframe, goBack, term) => {
    const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=${term}&period=${timeframe}&goBack=${goBack}`);
    const [xData, yData] = await response.json();
    if(xData) {
      const price = prices.map.get(term);
      if(price !== undefined) {
        xData.push(1);
        yData.push(price);
      }
      if(timeframe == "5Min") {
        for(let i = xData.length; i < 193; i++) {
          xData.push(1);
        }
      }
      setCurrPrice((Math.ceil(yData[yData.length - 1] * 100) / 100).toFixed(2));
      setShowPrice((Math.ceil(yData[yData.length - 1] * 100) / 100).toFixed(2));
      setChartData(new ChartClass(xData, yData));
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
    const st = document.querySelector(".searchBar").value.toUpperCase();
    if(st === "")
      return;
    setSearchTerm(st);
    setPortView(false);
    focusChart(frameState, start, st);
  }

  const wlUpdate = (stock) => {
    setSearchTerm(stock);
    setPortView(false);
    focusChart(frameState, start, stock);
  }

  //update with realtime prices
  const update = async (data) => {
    const m = await JSON.parse(data);
    console.log(m);
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

  const init = () => {
    //subscribe to each => onMessage, change price for that stock in prices map
    /*const es = new EventSource(`http://localhost:5000/ws?stocks=${JSON.stringify(arr)}`);
    es.onmessage = (event) => {
      update(event.data);
    }
    es.onerror = () => {
      console.log("Server closed connection");
      es.close();
    }*/
  }

  //initialize chart

  useEffect(() => {focusChart(frameState, start, searchTerm)}, [prices.map.get(searchTerm)]);
  useEffect(() => {init()}, []);

  return (
    <div className="app">
      <div className="head">
        <h1 className="homeBtn" onClick={() => {
          setSearchTerm("SPY");
          focusChart(frameState, start, "SPY");
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
            chartData != undefined ?
            <LineChart name="portChart" stock={searchTerm} chartData={chartData.data} options={options} plugins={[verticalHoverLine, unHover]}></LineChart> :
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
          <button onClick={() => doSmth()}>Click</button>
        </div>
        <div className="SidePanel">
          {
            portView ?
            <>
              <WatchList key={k} title={"Watchlist"} stocks={arr} curr={prices} click={(stock) => wlUpdate(stock)}></WatchList>
            </> :
            <>
              <Exchange></Exchange>
            </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
