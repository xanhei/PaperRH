import { Chart as ChartJS, ArcElement, Tooltip, Legend, Colors } from 'chart.js/auto';

export const ChartData = {
  labels: [1,2,3,4,5,6],
  datasets: [
    {
      label: "",
      data: [0,2,3,5,4,6],
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 1,
      borderColor: "rgb(31, 217, 22)",
    }
  ]
}

export const ChartClass = class {
  constructor(times, prices, width = 2) {
    this.data.labels = times;
    this.data.datasets[0].data = prices;
    this.data.datasets[0].borderWidth = width;
  }
  data = {
    labels: [],
    datasets: [
      {
        label: "",
        data: [],
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        borderColor: "rgb(31, 217, 22)",
      }
    ],
  }
}

export const defaultOptions = {
  aspectRatio: 2.5,
  animation: {
    duration: 0,
  },
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: {
    x: {
      //position: "top",
      display: false,
    },
    y: {
      display: false,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: "index",
      position: "ctt",
      intersect: false,
      yAlign: "bottom",
      animation: {
        duration: 0,
      },
      callbacks: {
        label: function(context) {
          let label = "";
          return label;
        }
      }
    },
  },
}

export const listOptions = {
  aspectRatio: 2,
  animation: {
    duration: 0,
  },
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: {
    x: {
      //position: "top",
      display: false,
    },
    y: {
      display: false,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    }
  }
}

export const fetchOptions = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    "APCA-API-KEY-ID": process.env.REACT_APP_APCA_API_KEY_ID,
    "APCA-API-SECRET-KEY": process.env.REACT_APP_APCA_API_SECRET_KEY,
  },
};