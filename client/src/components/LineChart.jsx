import { useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { verticalHoverLine } from "../chartAssets/verticalLine.js";

const LineChart = (props) => {
  return <Line className={props.name} stock={props.stock} list={props.list ? props.list : ""} data={props.chartData} options={props.options} plugins={props.plugins}/>
}

export default LineChart;