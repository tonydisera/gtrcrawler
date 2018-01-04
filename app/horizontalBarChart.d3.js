class HorizontalBarChart {

	constructor(container) {
    this.container = container;
    this.data = []
    this.svg = null;
    this.defs = null;
    this.gBrush = null;
    this.brush = null;
    this.main_xScale = null;
    this.mini_xScale = null;
    this.main_yScale = null;
    this.mini_yScale = null;
    this.main_yZoom = null;
    this.main_xAxis = null;
    this.main_yAxis = null;
    this.mini_width = null;
    this.textScale = null;
  }


  init(data) {
    let me = this;

    me.data = data;


    /////////////////////////////////////////////////////////////
    ///////////////// Set-up SVG and wrappers ///////////////////
    /////////////////////////////////////////////////////////////

    //Added only for the mouse wheel
    //var zoomer = d3.behavior.zoom()
     //   .on("zoom", null);

    var w = $(me.container[0]).innerWidth();

    var main_margin = {top: 10, right: 10, bottom: 30, left: 50},
        main_width = w - main_margin.left - main_margin.right,
        main_height = 400 - main_margin.top - main_margin.bottom;

    var mini_margin = {top: 10, right: 10, bottom: 30, left: 10},
        mini_height = 400 - mini_margin.top - mini_margin.bottom;
    me.mini_width = (w/5) - mini_margin.left - mini_margin.right;

    me.container.select("svg").remove();

    me.svg = me.container.append("svg")
        .attr("class", "svgWrapper")
        .attr("width", main_width + main_margin.left + main_margin.right + me.mini_width + mini_margin.left + mini_margin.right)
        .attr("height", main_height + main_margin.top + main_margin.bottom)
        //.call(zoomer)
        //.on("wheel.zoom", scroll)
        //.on("mousewheel.zoom", scroll)
        //.on("DOMMouseScroll.zoom", scroll)
        //.on("MozMousePixelScroll.zoom", scroll)
        //Is this needed?
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null);

    var mainGroup = me.svg.append("g")
            .attr("class","mainGroupWrapper")
            .attr("transform","translate(" + main_margin.left + "," + main_margin.top + ")")
            .append("g") //another one for the clip path - due to not wanting to clip the labels
            .attr("clip-path", "url(#clip)")
            .style("clip-path", "url(#clip)")
            .attr("class","mainGroup")

    var miniGroup = me.svg.append("g")
            .attr("class","miniGroup")
            .attr("transform","translate(" + (main_margin.left + main_width + main_margin.right + mini_margin.left) + "," + mini_margin.top + ")");

    var brushGroup = me.svg.append("g")
            .attr("class","brushGroup")
            .attr("transform","translate(" + (main_margin.left + main_width + main_margin.right + mini_margin.left) + "," + mini_margin.top + ")");

    /////////////////////////////////////////////////////////////
    ////////////////////// Initiate scales //////////////////////
    /////////////////////////////////////////////////////////////

    me.main_xScale = d3.scale.linear().range([0, main_width]);
    me.mini_xScale = d3.scale.linear().range([0, me.mini_width]);

    me.main_yScale = d3.scale.ordinal().rangeBands([0, main_height], 0.4, 0);
    me.mini_yScale = d3.scale.ordinal().rangeBands([0, mini_height], 0.4, 0);

    //Based on the idea from: http://stackoverflow.com/questions/21485339/d3-brushing-on-grouped-bar-chart
    me.main_yZoom = d3.scale.linear()
        .range([0, main_height])
        .domain([0, main_height]);

    //Create x axis object
    me.main_xAxis = d3.svg.axis()
      .scale(me.main_xScale)
      .orient("bottom")
      .ticks(4)
      //.tickSize(0)
      .outerTickSize(0);

    //Add group for the x axis
    d3.select(".mainGroupWrapper").append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + 0 + "," + (main_height + 5) + ")");

    //Create y axis object
    me.main_yAxis = d3.svg.axis()
      .scale(me.main_yScale)
      .orient("left")
      .tickSize(0)
      .outerTickSize(0);

    //Add group for the y axis
    mainGroup.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-5,0)");

    /////////////////////////////////////////////////////////////
    /////////////////////// Update scales ///////////////////////
    /////////////////////////////////////////////////////////////

    //Update the scales
    me.main_xScale.domain([0, d3.max(me.data, function(d) { return d.value; })]);
    me.mini_xScale.domain([0, d3.max(me.data, function(d) { return d.value; })]);
    me.main_yScale.domain(me.data.map(function(d) { return d.name; }));
    me.mini_yScale.domain(me.data.map(function(d) { return d.name; }));

    //Create the visual part of the y axis
    d3.select(".mainGroup").select(".y.axis").call(me.main_yAxis);
    d3.select(".mainGroupWrapper").select(".x.axis").call(me.main_xAxis);

    /////////////////////////////////////////////////////////////
    ///////////////////// Label axis scales /////////////////////
    /////////////////////////////////////////////////////////////

    me.textScale = d3.scale.linear()
      .domain([15,50])
      .range([12,6])
      .clamp(true);

    /////////////////////////////////////////////////////////////
    ///////////////////////// Create brush //////////////////////
    /////////////////////////////////////////////////////////////

    //What should the first extent of the brush become - a bit arbitrary this
    //var brushExtent = Math.max( 1, Math.min( 20, Math.round(me.data.length*0.2) ) );
    var brushExtent = Math.min( 20, me.data.length-1 );

    me.brush = d3.svg.brush()
        .y(me.mini_yScale)
        .extent([me.mini_yScale(me.data[0].name), me.mini_yScale(me.data[brushExtent].name)])
        .on("brush", me.brushmove)
        //.on("brushend", brushend);

    //Set up the visual part of the brush
    me.gBrush = d3.select(".brushGroup").append("g")
      .attr("class", "brush")
      .call(me.brush);

    me.gBrush.selectAll(".resize")
      .append("line")
      .attr("x2", me.mini_width);

    me.gBrush.selectAll(".resize")
      .append("path")
      .attr("d", d3.svg.symbol().type("triangle-up").size(20))
      .attr("transform", function(d,i) {
        return i ? "translate(" + (me.mini_width/2) + "," + 4 + ") rotate(180)" : "translate(" + (me.mini_width/2) + "," + -4 + ") rotate(0)";
      });

    me.gBrush.selectAll("rect")
      .attr("width", me.mini_width);

    //On a click recenter the brush window
    me.gBrush.select(".background")
      .on("mousedown.brush", me.brushcenter)
      .on("touchstart.brush", me.brushcenter);

    ///////////////////////////////////////////////////////////////////////////
    /////////////////// Create a rainbow gradient - for fun ///////////////////
    ///////////////////////////////////////////////////////////////////////////

    me.defs = me.svg.append("defs")

    //Create two separate gradients for the main and mini bar - just because it looks fun
    me.createGradient("gradient-rainbow-main", "60%");
    me.createGradient("gradient-rainbow-mini", "13%");

    //Add the clip path for the main bar chart
    me.defs.append("clipPath")
      .attr("id", "clip")
      .append("rect")
	    .attr("x", -main_margin.left)
      .attr("width", main_width + main_margin.left)
      .attr("height", main_height);

    /////////////////////////////////////////////////////////////
    /////////////// Set-up the mini bar chart ///////////////////
    /////////////////////////////////////////////////////////////

    //The mini brushable bar
    //DATA JOIN
    var mini_bar = d3.select(".miniGroup").selectAll(".bar")
      .data(me.data, function(d) { return d.key; });

    //UDPATE
    mini_bar
      .attr("width", function(d) { return me.mini_xScale(d.value); })
      .attr("y", function(d,i) { return me.mini_yScale(d.name); })
      .attr("height", me.mini_yScale.rangeBand());

    //ENTER
    mini_bar.enter().append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("width", function(d) { return me.mini_xScale(d.value); })
      .attr("y", function(d,i) { return me.mini_yScale(d.name); })
      .attr("height", me.mini_yScale.rangeBand())
      .style("fill", "url(#gradient-rainbow-mini)");

    //EXIT
    mini_bar.exit()
      .remove();

    //Start the brush
    me.gBrush.call(me.brush.event);

  }//init

  //Function runs on a brush move - to update the big bar chart
  update() {
    var me = this;
    /////////////////////////////////////////////////////////////
    ////////// Update the bars of the main bar chart ////////////
    /////////////////////////////////////////////////////////////

    //DATA JOIN
    var bar = d3.select(".mainGroup").selectAll(".bar")
        .data(me.data, function(d) { return d.key; });

    //UPDATE
    bar
      .attr("x", 0)
      .attr("width", function(d) { return me.main_xScale(d.value); })
      .attr("y", function(d,i) { return me.main_yScale(d.name); })
      .attr("height", me.main_yScale.rangeBand());

    //ENTER
    bar.enter().append("rect")
      .attr("class", "bar")
      .style("fill", "url(#gradient-rainbow-main)")
      .attr("x", 0)
      .attr("width", function(d) { return me.main_xScale(d.value); })
      .attr("y", function(d,i) { return me.main_yScale(d.name); })
      .attr("height", me.main_yScale.rangeBand());

    //EXIT
    bar.exit()
      .remove();

  }//update

  /////////////////////////////////////////////////////////////
  ////////////////////// Brush functions //////////////////////
  /////////////////////////////////////////////////////////////

  //First function that runs on a brush move
  brushmove() {
    var me = geneHistogramChart;

    var extent = me.brush.extent();

    //Reset the part that is visible on the big chart
    var originalRange = me.main_yZoom.range();
    me.main_yZoom.domain( extent );

    /////////////////////////////////////////////////////////////
    ///////////////////// Update the axis ///////////////////////
    /////////////////////////////////////////////////////////////

    //Update the domain of the x & y scale of the big bar chart
    me.main_yScale.domain(me.data.map(function(d) { return d.name; }));
    me.main_yScale.rangeBands( [ me.main_yZoom(originalRange[0]), me.main_yZoom(originalRange[1]) ], 0.4, 0);

    //Update the y axis of the big chart
    d3.select(".mainGroup")
      .select(".y.axis")
      .call(me.main_yAxis);

    /////////////////////////////////////////////////////////////
    /////////////// Update the mini bar fills ///////////////////
    /////////////////////////////////////////////////////////////

    //Update the colors within the mini bar chart
    var selected = me.mini_yScale.domain()
      .filter(function(d) { return (extent[0] - me.mini_yScale.rangeBand() + 1e-2 <= me.mini_yScale(d)) && (me.mini_yScale(d) <= extent[1] - 1e-2); });
    //Update the colors of the mini chart - Make everything outside the brush grey
    d3.select(".miniGroup").selectAll(".bar")
      .style("fill", function(d, i) { return selected.indexOf(d.name) > -1 ? "url(#gradient-rainbow-mini)" : "#e0e0e0"; });

    //Update the label size
    d3.selectAll(".y.axis text")
      .style("font-size", me.textScale(selected.length));

    //Update the big bar chart
    me.update();

  }//brushmove

  /////////////////////////////////////////////////////////////
  ////////////////////// Click functions //////////////////////
  /////////////////////////////////////////////////////////////

  //Based on http://bl.ocks.org/mbostock/6498000
  //What to do when the user clicks on another location along the brushable bar chart
  brushcenter() {
    var me = geneHistogramChart;

    var target = d3.event.target,
        extent = me.brush.extent(),
        size = extent[1] - extent[0],
        range = me.mini_yScale.range(),
        y0 = d3.min(range) + size / 2,
        y1 = d3.max(range) + me.mini_yScale.rangeBand() - size / 2,
        center = Math.max( y0, Math.min( y1, d3.mouse(target)[1] ) );

    d3.event.stopPropagation();

    me.gBrush
        .call(me.brush.extent([center - size / 2, center + size / 2]))
        .call(me.brush.event);

  }//brushcenter

  /////////////////////////////////////////////////////////////
  ///////////////////// Scroll functions //////////////////////
  /////////////////////////////////////////////////////////////

  scroll() {
    var me = geneHistogramChart;

    //Mouse scroll on the mini chart
    var extent = me.brush.extent(),
      size = extent[1] - extent[0],
      range = me.mini_yScale.range(),
      y0 = d3.min(range),
      y1 = d3.max(range) + me.mini_yScale.rangeBand(),
      dy = d3.event.deltaY,
      topSection;

    if ( extent[0] - dy < y0 ) { topSection = y0; }
    else if ( extent[1] - dy > y1 ) { topSection = y1 - size; }
    else { topSection = extent[0] - dy; }

    //Make sure the page doesn't scroll as well
    d3.event.stopPropagation();
    d3.event.preventDefault();

    me.gBrush
        .call(me.brush.extent([ topSection, topSection + size ]))
        .call(me.brush.event);

  }//scroll

  /////////////////////////////////////////////////////////////
  ///////////////////// Helper functions //////////////////////
  /////////////////////////////////////////////////////////////

  //Create a gradient
  createGradient(idName, endPerc) {
    var me = this;

    var coloursRainbow = ["#EFB605", "#E9A501", "#E48405", "#E34914", "#DE0D2B", "#CF003E", "#B90050", "#A30F65", "#8E297E", "#724097", "#4F54A8", "#296DA4", "#0C8B8C", "#0DA471", "#39B15E", "#7EB852"];

    me.defs.append("linearGradient")
      .attr("id", idName)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", endPerc).attr("y2", "0%")
      .selectAll("stop")
      .data(coloursRainbow)
      .enter().append("stop")
      .attr("offset", function(d,i) { return i/(coloursRainbow.length-1); })
      .attr("stop-color", function(d) { return d; });
  }//createGradient

}