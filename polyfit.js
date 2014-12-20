$(function() {

  // Number of data points
  var NUM_TRAIN_POINTS = 500;
  var NUM_TEST_POINTS = 300;

  var $degree = $('#degree');
  var degree = parseInt($degree.val(), 4);

  var $rangeSlider = $('#range-slider');
  var $meanSquareValue = $('.mean-square-value');

  var width = $('#scatterplot').width();
  var height = width;

  // the chart object, includes all margins
  chart = d3.select('#scatterplot')
    .append('svg:svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'chart')

  // Data
  data = {
    // These will be shown on the plot
    trainPoints : {
      xdata : [], 
      ydata : []
    },
    // These will be for evaluation purposes only
    testPoints : {
      xdata : [],
      ydata : [],
    }
  }

  // Initial noise. This is what the slider is set to.
  // 0 means data is exactly polynomial
  var randomness = 30;

  rangeSlider($rangeSlider[0], {
    value: randomness,
    drag: function(value) {
      // Update the randomness after the user drags the slider
      // and reset the points to be clustered
      randomness = value;
      resetPoints();
    }
  });

  // Parameters shared in generating training and testing data
  // Generate random roots between 0 and 1, and generate a sign
  // Instead of randomly generating the coefficients, generating the roots
  // guarantees that the graph will "look like a polynomial"
  // for our range of training x values (ie. [0, 1])
  function generateParameters(degree) {
    var roots = [];
    for (var t = 0; t < degree; t++) {
      r = Math.random();
      if (Math.random() > 0.9) {
        r *= -1;
      }
      roots.push(r);
    }
    var sign = 1;
    if (Math.random() > 0.5) {
      sign = -1;
    }
    return {
      roots : roots,
      sign : sign,
      // Variance chosen arbitrarily, so the plot looks nice
      variance : Math.sqrt(randomness) / 500 + 0.001
    };
  }

  function generateData(params, numPoints, xmin, xmax) {
    // The split between points following the polynomial and random points
    // is chosen arbitrarily, so the plot looks nice
    xmin = xmin || 0;
    xmax = xmax || 1;
    var numPolynomialPoints = numPoints * (100 - 0.85 * randomness) / 100;
    var numNoisePoints = numPoints - numPolynomialPoints;

    var xdata = [];
    var ydata = [];

    // Generate the points
    for (var i = 0; i < numPolynomialPoints; i++) {
      x = Math.random() * (xmax - xmin) + xmin;
      y = params.sign;
      for (var t = 0; t < degree; t++) {
        y *= x - params.roots[t]
      }
      y += random_normal(0, params.variance);
      xdata.push(x);
      ydata.push(y);
    }

    var ymax = d3.max(ydata);
    var ymin = d3.min(ydata);

    for (var i = 0; i < numNoisePoints; i++) {
      xdata.push(Math.random() * (xmax - xmin) + xmin);
      ydata.push(Math.random() * (ymax - ymin) + ymin);
    }

    return {
      xdata : xdata,
      ydata : ydata
    }
  }

  function resetPoints() {
    // Arbitrarily chosen variance and percentageClusteredPoints
    // There is no signficance behind the constants except that they looked good
    // with the slider.
    var degree = parseInt($degree.val(), 4);
    var params = generateParameters(degree);
    data.trainData = generateData(params, NUM_TRAIN_POINTS);
    data.testData = generateData(params, NUM_TEST_POINTS, -5, 5);

    $meanSquareValue.html('not yet calculated');
    resetPlot(data.trainData.xdata, data.trainData.ydata);
  }

  function resetPlot(xdata, ydata) {
    chart.selectAll('*').remove();

    // x and y scales
    var x = d3.scale.linear()
      .domain([d3.min(xdata), d3.max(xdata)])  // the range of the values to plot
      .range([ 0, width ]);        // the pixel range of the x-axis

    var y = d3.scale.linear()
      .domain([d3.min(ydata), d3.max(ydata)])
      .range([ height, 0 ]);

    // the main object where the chart and axis will be drawn
    var main = chart.append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main')   

    // draw the graph object
    var g = main.append("svg:g"); 

    g.selectAll("scatter-dots")
      .data(ydata)  // using the values in the ydata array
      .enter().append("svg:circle")  // create a new circle for each value
          .attr("cy", function (d) { return y(d); } ) // translate y value to a pixel
          .attr("cx", function (d,i) { return x(xdata[i]); } ) // translate x value
          .attr("r", 2) // radius of circle
          .style("opacity", 1.0); // opacity of circle
  }

  // Helper functions
  $('.new-points').click(function() {
    resetPoints();
  });

  // Normal random
  function random_normal(mean, variance) {
    var normalFn = d3.random.normal(mean, variance);
    return normalFn();
  }
});
