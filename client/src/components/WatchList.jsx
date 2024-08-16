import "../App.css"
import { useState, useEffect } from 'react';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import LineChart from "./LineChart";
import { listOptions, ChartData, ChartClass } from "../Data";
import { percentFormat, formatDailyChart } from "../auxFunctions/functions.js";
import { changeColor } from "../chartAssets/updateData.js";
import { commaFormat } from "../auxFunctions/functions.js";

//let basePrices;

//variables to fetch market data
const url = "https://data.alpaca.markets/v2/stocks/bars";
const params = "?sort=asc";

const getData = async (term) => {
  const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=${term}&period=5Min&goBack=0`);
  const [xData, yData] = await response.json();
  //set chart data if response is ok
  if(xData) {
    return new ChartClass(xData, yData, "rgb(31, 217, 22)", 1);
  }
  return {data: ChartData}; //return as single item map so that formatting is consistent with ChartClass
}

const WatchList = (props) => {
  const [chartList, setChartList] = useState();
  const [basePrices, setBasePrices] = useState();
  const [percents, setPercents] = useState();

  const getList = async () => {
    let temp = [];
    for(let i = 0; i < props.stocks.length; i++) {
      const a = await getData(props.stocks[i]);
      formatDailyChart(a.data.labels);
      temp.push(a);
    }
    setChartList(temp);
  }

  const getPercents = async () => {
    if(!chartList || chartList.length !== props.stocks.length) //second condition is for edge case where stock is added to "stocks" list while user is on the home screen
      return;                                                  //function does not run if chartData has not been fetched for the added stock
    let bp = [];
    if(!basePrices || basePrices.length !== props.stocks.length) { //see three lines above (both 2nd conditions are necessary bc chartList and basePrices are independent)
      for(let i = 0; i < props.stocks.length; i++) {
        const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}percent?stock=${props.stocks[i]}`);
        const res = await response.json();
        if(res[0].bars)
          bp.push(res[0].bars[props.stocks[i]][0].c);
      }
      setBasePrices(bp);
    }
    let per = [];
    const use = bp.length === 0 ? basePrices : bp; //not my best work :(
    for(let i = 0; i < props.stocks.length; i++) {
      let curr = percentFormat(use[i], chartList[i].data.datasets[0].data[chartList[i].data.datasets[0].data.length - 1]);
      const color = curr[0] === "+" ? "rgb(31, 217, 22)" : "rgb(242, 80, 5)";
      const focusElement = document.querySelector(`.percent#${props.stocks[i]}[list='${props.title}']`);
      if(focusElement)
        focusElement.style.color = color;
      changeColor(ChartJS.getChart(document.querySelector(`.wlChart[stock='${props.stocks[i]}'][list='${props.title}']`)), color)
      per.push(curr);
    }
    setPercents(per);
  }
  
  useEffect(() => {getList()}, [props.stocks]);

  useEffect(() => {getPercents()}, [chartList]);
  return (
    <div>
      <h3 className="listHead">{props.title}</h3>
      <hr className="line"></hr>
      {
        props.stocks.map((stock, index) => 
          <div className="listView" key={index} onClick={() => props.click(stock)}>
            <div className="watchNameDiv">
              <h3 className="watchName">{stock}</h3>
              {props.count ? <h3 style={{fontWeight: "normal", marginTop: "-15%"}}>
                {props.count[stock] % 1 ? commaFormat(props.count[stock]) : props.count[stock]} Share{props.count[stock] !== 1 ? "s" : ""}</h3> : <></>}
            </div>
            <div className="watchChart">
              <LineChart name="wlChart" list={props.title} stock={stock} chartData={chartList && chartList[index] ? chartList[index].data : ChartData} options={listOptions}></LineChart>
            </div>
            <div className="numberPercent">
              <p>${chartList && chartList[index] ? (Math.ceil(chartList[index].data.datasets[0].data.slice(-1)[0] * 100) / 100).toFixed(2) : "123.45"}</p>
              <p className="percent" id={stock} list={props.title} change={percents}>{basePrices && chartList && percents ? percents[index] : "+0.00"}%</p>
            </div>
          </div>
        )
      }
      <hr className="line"></hr>
    </div>
  );
}

export default WatchList;
