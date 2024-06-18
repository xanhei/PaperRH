import "../App.css"
import { useState, useEffect } from 'react';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import LineChart from "./LineChart";
import { listOptions, ChartData, ChartClass } from "../Data";



//variables to fetch market data
const url = "https://data.alpaca.markets/v2/stocks/bars";
const params = "?sort=asc";

const getData = async (term) => {
  const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=${term}&period=5Min&goBack=0`);
  const [xData, yData] = await response.json();

  //set chart data if response is ok
  if(xData) {
    return new ChartClass(xData, yData, 1);
  }
  return {data: ChartData}; //return as single item map so that formatting is consistent with ChartClass
}



const WatchList = (props) => {
  const [chartList, setChartList] = useState();

  const getList = async () => {
    let temp = [];
    for(let i = 0; i < props.stocks.length; i++) {
      const a = await getData(props.stocks[i]);
      temp.push(a);
    }
    setChartList(temp);
    return temp;
  }
  
  useEffect(() => {
    getList();
  }, []);
  return (
    <div className="WatchList">
      <h3 className="listHead">{props.title}</h3>
      <hr className="line"></hr>
      {
        props.stocks.map((stock, index) => 
          <div className="listView" key={index} onClick={() => props.click(stock)}>
            <h3 className="watchName">{stock}</h3>
            <div className="watchChart">
              <LineChart chartData={chartList ? chartList[index].data : ChartData} options={listOptions}></LineChart>
            </div>
            <div className="numberPercent">
              <p>${chartList ? (Math.ceil(chartList[index].data.datasets[0].data.slice(-1)[0] * 100) / 100).toFixed(2) : "123.45"}</p>
              <p>+0.00%</p>
            </div>
          </div>
        )
      }
      <hr className="line"></hr>
    </div>
  );
}

export default WatchList;