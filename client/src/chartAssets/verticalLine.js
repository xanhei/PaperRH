//used to display vertical line on highlighted point
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, afterDraw } from 'chart.js';

export const verticalHoverLine = {
  id: "verticalHoverLine",
  afterDraw: (chart) => {
    if (chart.tooltip?._active?.length) {
      let x = chart.tooltip._active[0].element.x;
      let yAxis = chart.scales.y;
      let ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, yAxis.top + 30);
      ctx.lineTo(x, yAxis.bottom);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#8c8c8c";
      ctx.stroke();
      //ctx.restore();
    }
  }
}
