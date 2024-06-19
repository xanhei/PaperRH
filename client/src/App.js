import { useState, useEffect, useRef } from 'react';
import './App.css'
import SearchIcon from "./search.svg";

//components / assets / functions
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js/auto';
import { Line } from 'react-chartjs-2';

//in house assets
import LineChart from "./components/LineChart.jsx";
import WatchList from "./components/WatchList.jsx";
import { verticalHoverLine } from "./chartAssets/verticalLine.js";
import ctt from "./chartAssets/ctt.js";
import { focusBtn } from "./auxFunctions/functions.js";

import { ChartData, ChartClass, defaultOptions, fetchOptions } from "./Data.js" // NEED TO SPECIFY ".js" FOR NAMED EXPORT

//variables to fetch market data
const url = "https://data.alpaca.markets/v2/stocks/bars";
const params = "?sort=asc";

const defaultSearch = "SPY";

const doSmth = async () => {
  const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=spy&period=1Day&goBack=7`);
  const res = await response.json();
  console.log(res);
}


function App() {
  const [chartData, setChartData] = useState(); //data drawn on chart
  const [searchTerm, setSearchTerm] = useState(defaultSearch); //term used to fetch data for correct stock
  const [frameState, setFrameState] = useState(); //bar size that needs to be fetched
  const [start, setStart] = useState(); //least recent day used to fetch data
  const [currPrice, setCurrPrice] = useState(0); //most recent price
  const [showPrice, setShowPrice] = useState(); //display price
  const [portView, setPortView] = useState(true); //whether current view is portfolio (set to true) or a stock (set to false)
  const [options, setOptions] = useState(defaultOptions); //options used for main chart

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
    focusBtn();
    setFrameState(timeframe);
    setStart(goBack);
    focusChart(timeframe, goBack, searchTerm);
  }

  const newSearch = () => {
    const st = document.querySelector(".searchBar").value.toUpperCase();
    if(st == "")
      return;
    setSearchTerm(st);
    focusChart(frameState, start, st);
  }

  const wlUpdate = (stock) => {
    setSearchTerm(stock);
    focusChart(frameState, start, stock);
  }

  //initialize chart
  useEffect(() => {
    focusChart("5Min", 0, searchTerm);
  }, []);

  return (
    <div className="app">
      <div className="head">
        <h1 className="homeBtn">App</h1>
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
            <LineChart className="portChart" chartData={chartData.data} options={options} plugins={[verticalHoverLine, unHover]}></LineChart> :
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
        {
          portView ?
          <>
            <WatchList title={"WatchList"} stocks={["SPY","AMD"]} click={(stock) => wlUpdate(stock)}></WatchList>
          </> :
          <></>
        }
      </div>
    </div>
  );
}

export default App;
