$(function() {

  // Number of data points
  var NUM_TRAIN_POINTS = 500;
  var NUM_TEST_POINTS = 300;

  var $degree = $('#degree');
  var degree = parseInt($degree.val(), 4);

  var $modelDegree = $('#degree');
  var modelDegree = parseInt($modelDegree.val(), 4);

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

  // the main object where the chart and axis will be drawn
  var main = chart.append('g')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main')   

  // Data
  var data = {
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
      // TODO: The y values span over a different range, so the variance doesn't
      // always look the same when it's scaled to fit the plot. Should we keep it
      // like this (for the sake of error), or should we scale for image
      // consistency?
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
    var randomness = parseInt($rangeSlider.val(), 30);
    var params = generateParameters(degree);
    data.trainPoints = generateData(params, NUM_TRAIN_POINTS);
    data.testPoints = generateData(params, NUM_TEST_POINTS, -5, 5);

    $meanSquareValue.html('not yet calculated');
    resetPlot(data.trainPoints.xdata, data.trainPoints.ydata);
  }

  function resetPlot(xdata, ydata) {
    main.selectAll('*').remove();

    // x and y scales
    var x = d3.scale.linear()
      .domain([d3.min(xdata), d3.max(xdata)])  // the range of the values to plot
      .range([ 0, width ]);        // the pixel range of the x-axis

    var y = d3.scale.linear()
      .domain([d3.min(ydata), d3.max(ydata)])
      .range([ height, 0 ]);

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

  function generateFit() {
    console.log('generateFit');
    var modelDegree = parseInt($modelDegree.val(), 4);
    var A = getVandermonde(data.trainPoints.xdata, modelDegree);
    console.log(data.trainPoints.xdata[0]);
    console.log(A[0]);
    var coefficients = backslash(A, data.trainPoints.ydata);
    console.log(coefficients);
    plotFit(coefficients);
  }

  function plotFit(coefficients) {
    console.log('plotFit');
    var xmin = d3.min(data.trainPoints.xdata);
    var xmax = d3.max(data.trainPoints.xdata);
    xdata = [];
    ydata = [];
    for (var x = xmin; x < xmax; x += 0.01) {
      var y = 0;
      for (var i = 0; i < coefficients.length; i++) {
        y += coefficients[0] * Math.pow(x, i);
      }
      xdata.push(x);
      ydata.push(y);
    }
    // x and y scales
    var x = d3.scale.linear()
      .domain([d3.min(xdata), d3.max(xdata)])  // the range of the values to plot
      .range([ 0, width ]);        // the pixel range of the x-axis

    var y = d3.scale.linear()
      .domain([d3.min(ydata), d3.max(ydata)])
      .range([ height, 0 ]);
    
    var lineFunction = d3.svg.line()
        .x(function(d, i) { return x(xdata[i]); })
        .y(function(d, i) { return y(ydata[i]); })
        .interpolate("linear");
    var lineGraph = main.append('path')
        .attr('d', lineFunction(ydata))
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("fill", "none");
  }

  function getVandermonde(xdata, degree) {
    var A = [];
    for (var i = 0; i < xdata.length; i++) {
      var row = [];
      for (var j = 0; j <= degree; j++) {
        row.push(Math.pow(xdata[i], j));
      }
      A.push(row);
    }
    return A;
  }

  function backslash(A, b) {
    // TODO: error checking (A is tall? no other types to rely on...)
    var Atrans = numeric.transpose(A);
    var gram = numeric.dot(Atrans, numeric.transpose(A));
    var pseudoInv = numeric.dot(gram, numeric.transpose(A));
    return numeric.dot(pseudoInv, b);
  }


  // Helper functions
  $('.new-points').click(function() {
    resetPoints();
  });

  $('.generate-fit').click(function() {
    generateFit();
  });

  // Normal random
  function random_normal(mean, variance) {
    var normalFn = d3.random.normal(mean, variance);
    return normalFn();
  }
});
