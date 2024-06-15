//used to display tooltip at top of graph instead of next to line
import { Tooltip } from "chart.js";

export default Tooltip.positioners.ctt = function(elements, eventPosition) {
  let tooltip = this;
  let x;
  if (tooltip?._active?.length)
    x = tooltip._active[0].element.x;
  return {
    x: x,
    y: -50,
  };
}