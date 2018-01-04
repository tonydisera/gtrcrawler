function histogramD3() {
  var dispatch = d3.dispatch("d3click");

  var svg = null;

  var margin = {top: 30, right: 20, bottom: 20, left: 50},
      width = 200,
      height = 100,
      defaults = {outliers: true, averageLine: true},
      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },
      tooltipText = function(d, i) {
        return xValue(d) + ", " + yValue(d);
      },
      x = d3.scale.linear(),
      y = d3.scale.linear();

  var xStart = null;
  var xEnd   = null;

  var tooltip = null;

  var formatXTick = null;

  var xAxisLabel = null;
  var yAxisLabel = null;

  var showXAxis = true;
  var showYAxis = true;

  var widthPercent = null;
  var heightPercent = null;

  function chart(selection, options) {
    // merge options and defaults
    options = $.extend(defaults,options);
    var innerHeight = height - margin.top - margin.bottom;
    var innerWidth = width - margin.left - margin.right;


    selection.each(function(data) {
      // set svg element
      svg = d3.select(this);

      svg.attr("width", widthPercent ? widthPercent : width+margin.left+margin.right)
         .attr("height", heightPercent ? heightPercent : height)
         .attr('viewBox', "0 0 " +
                         (parseInt(width) +  parseInt(margin.left) + parseInt(margin.right)) + " " +
                         parseInt(height))
         .attr("preserveAspectRatio", "none");



      if (xStart && xEnd) {
        x.domain([xStart, xEnd]);
      } else {
        x.domain(d3.extent(data, function(d) { return xValue(d); }));
      }

      x.range([0, width - margin.left - margin.right]);
      var xMin = d3.min(data, function(d,i) {
        return xValue(d);
      })
      var xMax = d3.max(data, function(d,i) {
        return xValue(d);
      })
      var barWidth = Math.max(1, Math.floor( (x(xMax)-x(xMin)) / data.length));


      // Update the y-scale.
      y.domain([0, d3.max(data, function(d) { return yValue(d); })])
      y.range([innerHeight , 0]);



      var xAxis = null;
      if (showXAxis) {
        xAxis = d3.svg.axis().scale(x).orient("bottom");
      }
      var brush = d3.svg.brush().x(x);
      var yAxis = null;
      if (showYAxis) {
        yAxis = d3.svg.axis().scale(y).orient("left").ticks(6);
      }

      if (formatXTick && showXAxis) {
        xAxis.tickFormat(formatXTick);
      }


      // Select the g element, if it exists.
      var g = svg.selectAll("g").data([0]);

      // Otherwise, create the skeletal chart.
      var gEnter = g.enter().append("g");
      gEnter.selectAll("g.x axis").remove();
      if (showXAxis) {
        gEnter.append("g").attr("class", "x axis").attr("transform", "translate(0," + y.range()[0] + ")");
        gEnter.append("g").attr("class", "x brush");
      }

      if (showYAxis) {
        gEnter.selectAll("g.y axis").remove();
        gEnter.append("g").attr("class", "y axis");
      }


      // Add the text label for the x axis
      //gEnter.selectAll("g.xaxis label")
      if (xAxisLabel && showXAxis) {
        gEnter.selectAll("g.x axis label").remove();
        gEnter.append("text")
          .attr("class", "x axis label")
          .attr("transform", "translate(" + (width / 2) + " ," + (y.range()[0]  + margin.bottom) + ")")
          .style("text-anchor", "middle")
          .text(xAxisLabel);
      }

       // Add the text label for the Y axis
       if (yAxisLabel) {
        gEnter.selectAll("g.y axis label").remove();
        gEnter.append("text")
            .attr("class", "y axis label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yAxisLabel);

       }


      // Update the inner dimensions.
      g.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      g.selectAll("g.bar-group").remove();
      var barGroup = g.append("g")
                      .attr("class", "bar-group")
                      .attr("transform", "translate(" + barWidth/2 + ",0)");
      // Add new bars groups.
      var bar = barGroup.selectAll(".bar").data(data)
      var barEnter = bar.enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d,i) {
              return "translate(" +  (Math.floor(x(xValue(d))) - Math.floor(barWidth/2)) + "," + innerHeight + ")";
            });

      // Remove any previous selections
      svg.selectAll(".bar rect").attr("class", "");

      //  Add new bars.
      barEnter.append("rect")
         .attr("x", 1)
         .style("z-index", 5)
         .attr("width", barWidth)
         .attr("height", 0)
         .on("mouseover", function(d, i) {

            tooltip().transition()
               .duration(200)
               .style("opacity", .9);

            tooltip().html( tooltipText(d, i) )
               .style("width", "100px")
               .style("height", "40px")
               .style("left", (d3.event.pageX) - 102 + "px")
               .style("text-align", 'left')
               .style("top", (d3.event.pageY - 42) + "px");
         })
         .on("mouseout", function(d) {
            tooltip().transition()
               .duration(500)
               .style("opacity", 0);
         })
         .on("click", function(d) {
            var on = d3.select(this).attr("class") != "selected";

            svg.selectAll(".bar rect").attr("class", "");
            d3.select(this).classed("selected", on);

            dispatch.d3click(d, on);
         });

      // Remove extra bar groups.
      bar.exit().remove();

      // Update bars groups.
      bar.transition()
         .duration(200)
         .attr("transform", function(d,i) {
            return "translate(" + (Math.floor(x(xValue(d))) - Math.floor(barWidth/2))  + "," + Math.floor(y(yValue(d))) + ")";
         });

      // Update bars.
      bar.select("rect").transition()
         .duration(200)
         .attr("height", function(d) {
            return parseInt(xValue(d)) >= x.domain()[0] ? innerHeight - parseInt(y(yValue(d))) : 0;
         });

      // Update the x-axis.
      if (showXAxis) {
        g.select(".x.axis").transition()
            .duration(200)
            .call(xAxis);
      }

      // Update the y-axis.
      if (showYAxis) {
        g.select(".y.axis").transition()
           .duration(200)
           .call(yAxis);
      }



      // Update brush if event has been set.
      if( brush.on("brushend") || brush.on("brushstart") || brush.on("brush")) {
         g.select(".x.brush").call(brush).call(moveToFront)
             .selectAll("rect")
               .attr("y", -6)
               .attr("height", innerHeight + 6);
      }

    });
    // moves selection to front of svg
    function moveToFront(selection) {
      return selection.each(function(){
         this.parentNode.appendChild(this);
      });
    }

   function removeOutliers(data) {
      var q1 = quantile(data, 0.25);
      var q3 = quantile(data, 0.75);
      var iqr = (q3-q1) * 1.5; //
      return data.filter(function(d) { return (xValue(d)>=(Math.max(q1-iqr,0)) && xValue(d)<=(q3+iqr)) });
   }

   function quantile(arr, p) {
      var length = arr.reduce(function(previousValue, currentValue, index, array){
         return previousValue + currentValue[1];
      }, 0) - 1;
      var H = length * p + 1,
      h = Math.floor(H);

      var hValue, hMinus1Value, currValue = 0;
      for (var i=0; i < arr.length; i++) {
         currValue += arr[i][1];
         if (hMinus1Value == undefined && currValue >= (h-1))
            hMinus1Value = arr[i][0];
         if (hValue == undefined && currValue >= h) {
            hValue = arr[i][0];
            break;
         }
      }
      var v = +hMinus1Value, e = H - h;
      return e ? v + e * (hValue - v) : v;
   }

  }

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xValue = function(_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return chart;
  };

  chart.yValue = function(_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xAxis = function(_) {
    if (!arguments.length) return xAxis;
    xAxis = _;
    return chart;
  };

  chart.yAxis = function(_) {
    if (!arguments.length) return yAxis;
    yAxis = _;
    return chart;
  };

  chart.formatXTick = function(_) {
    if (!arguments.length) return formatXTick;
    formatXTick = _;
    return chart;
  }

  chart.xAxisLabel = function(_) {
    if (!arguments.length) return xAxisLabel;
    xAxisLabel = _;
    return chart;
  }

  chart.yAxisLabel = function(_) {
    if (!arguments.length) return yAxisLabel;
    yAxisLabel = _;
    return chart;
  }

  chart.showXAxis = function(_) {
    if (!arguments.length) return showXAxis;
    showXAxis = _;
    return chart;
  };

  chart.showYAxis = function(_) {
    if (!arguments.length) return showYAxis;
    showYAxis = _;
    return chart;
  };




  chart.xStart = function(_) {
    if (!arguments.length) return xStart;
    xStart = _;
    return chart;
  };

  chart.xEnd = function(_) {
    if (!arguments.length) return xEnd;
    xEnd = _;
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) {
      return tooltip;
    } else {
      tooltip = _;
    }
    return chart;
  }

  chart.brush = function(_) {
    if (!arguments.length) return brush;
    brush = _;
    return chart;
  };

  chart.widthPercent = function(_) {
    if (!arguments.length) return widthPercent;
    widthPercent = _;
    return chart;
  };

  chart.heightPercent = function(_) {
    if (!arguments.length) return heightPercent;
    heightPercent = _;
    return chart;
  };

  chart.tooltipText = function(_) {
    if (!arguments.length) return tooltipText;
    tooltipText = _;
    return chart;
  };

  // This adds the "on" methods to our custom exports
  d3.rebind(chart, dispatch, "on");

  return chart;
}