//color/bold effect when time button is clicked
export const focusBtn = async (timeframe) => {
  let arr = document.querySelectorAll(".timeButton");
  for(let i = 0; i < arr.length; i++) {
    if(arr[i] == document.activeElement) {
      arr[i].style.color = "rgb(31, 217, 22)";
      arr[i].style.fontWeight = "bold";
    }
    else {
      arr[i].style.color = "";
      arr[i].style.fontWeight = "";
    }
  }
}
