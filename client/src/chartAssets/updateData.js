export const addData = (chart, label, newData) => {
  //chart.data.labels.push(label);
  chart.data.datasets[0].data.push(newData);
  chart.update();
}