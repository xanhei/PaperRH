export const addData = (chart, label, newData) => {
  //chart.data.labels.push(label);
  chart.data.datasets[0].data.push(newData);
  chart.update();
}

export const changeColor = (chart, color) => {
  if(chart) {
    chart.data.datasets[0].borderColor = color;
    chart.update();
  }
}