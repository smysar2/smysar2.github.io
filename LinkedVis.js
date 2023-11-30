

// Set the dimensions for the bar chart container
const barMargin = { top: 10, right: 50, bottom: 50, left: 200 },
      barWidth = 800 - barMargin.left - barMargin.right,
      barHeight = 350 - barMargin.top - barMargin.bottom;

// Set the dimensions for the dot chart container
const dotMargin = { top: 5, right: 80, bottom: 50, left: 200 },
      dotWidth = 700 - dotMargin.left - dotMargin.right,
      dotHeight = 200 - dotMargin.top - dotMargin.bottom;

// Define SVG containers for the bar and dot charts
const barSvg = d3.select("#bar-chart1")
  .append("svg")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
  .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

const dotSvg = d3.select("#dot-chart")
  .append("svg")
    .attr("width", dotWidth + dotMargin.left + dotMargin.right)
    .attr("height", dotHeight + dotMargin.top + dotMargin.bottom)
  .append("g")
    .attr("transform", `translate(${dotMargin.left},${dotMargin.top})`);

// Load the data
let communityData = [];
d3.csv("crime_counts_bar.csv").then(function(data) {
  console.log(data);
  createBarChart(data);
});

d3.select("#dataTypeSelect").on("change", function(event) {
  // Get the selected value
  const selectedType = event.target.value;

  // Update the bar chart based on the selected type
  updateBarChart(selectedType);

  // Update the dot chart based on the selected type
  // Passing an empty string to represent all data
  updateDotChart(null,selectedType === "all" ? "" : selectedType);
});

// Function to get the title for the dot chart based on the current selection
function getDotChartTitle() {
  switch (currentDataType) {
      case "True":
          return "Top Community Areas for Selected Crime with highest arrests";
      case "False":
          return "Top Community Areas for Selected Crime with highest Not-arrests";
      default:
          return "Top Communities for Selected Crime with Total Crime Counts";
  }
}

// Function to get the title for the bar chart based on the current selection
function getBarChartTitle() {
  switch (currentDataType) {
      case "True":
          return "Crime Types with most Arrests";
      case "False":
          return "Crime Types with most Not-Arrests";
      default:
          return "Top Crime Types";
  }
}

currentDataType = "all";
function updateBarChart(selectedType) {
  currentDataType = selectedType;
  d3.csv("community_crime_arrest_counts.csv").then(function(data) {
    // If the selected type is not 'all', filter the data
    console.log("total data");
    console.log(data);
    // If the selected type is not 'all', filter the data
    if (selectedType !== "all") {
      data = data.filter(d => d["Arrest"].toString() === selectedType);
    }
    
    // Map over the data and convert 'Counts' to number
    const processedData = data.map(d => ({
      "Primary Type": d["Primary Type"],
      "Counts": +d["Counts"]  // Convert the Counts to a number
    }));

    // Group by 'Primary Type' and sum 'Counts' for each group
    const rollupData = d3.rollup(processedData, 
      v => d3.sum(v, d => d["Counts"]), 
      d => d["Primary Type"]);

    // Convert the Map object to an array and sort by total crime count in descending order
    const groupedData = Array.from(rollupData, ([key, value]) => ({
      "Primary Type": key, 
      "Crime Count": value
    }))
    .sort((a, b) => b["Crime Count"] - a["Crime Count"])  // Sort by crime count descending
    .slice(0, 15);  // Take only the top 15

    console.log("Updated bar data");
    console.log(groupedData);
    // Proceed with creating the bar chart
    createBarChart(groupedData);
  }).catch(function(error) {
    console.error("Error loading bar chart data:", error);
  });
}


function createBarChart(data) {
  // Clear existing content in the chart
  barSvg.selectAll(".chart-title").remove();
  barSvg.selectAll(".bar").remove();
  barSvg.selectAll(".axis").remove();

  // Create scales
  const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => +d["Crime Count"])])
      .range([0, barWidth]);

  const y = d3.scaleBand()
      .domain(data.map(d => d["Primary Type"]))
      .padding(0.1)
      .range([0, barHeight]);

  // Define tooltip
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  // Add bars with initial width 0 for animation
  const bars = barSvg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", d => "bar " + getBarClass())
      .attr("y", d => y(d["Primary Type"]))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", 0) // Start with width 0
      .attr("fill", "#69b3a2");

  // Apply transition to animate bar width
  bars.transition()
      .duration(800)
      .attr("width", d => x(d["Crime Count"]));

  // Event handlers
  bars.on("mouseover", function(event, d) {
      tooltip.transition()
          .duration(200)
          .style("opacity", .9);
      let tooltipContent = `Primary Type: ${d["Primary Type"]}<br/>`;
      if (currentDataType === "all") {
          tooltipContent += `Crime Count: ${d["Crime Count"]}`;
      } else if (currentDataType === "True") {
          tooltipContent += `Arrests: ${d["Crime Count"]}`;
      } else if (currentDataType === "False") {
          tooltipContent += `Not Arrests: ${d["Crime Count"]}`;
      }
      tooltip.html(tooltipContent)
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", function(d) {
      tooltip.transition()
          .duration(500)
          .style("opacity", 0);
  })
  .on("click", function(event, d) {
      updateDotChart(d["Primary Type"], currentDataType);
  });

  // Add title
  barSvg.append("text")
      .attr("class", "chart-title")
      .attr("x", barWidth / 2)
      .attr("y", barHeight + barMargin.bottom - 10)
      .attr("text-anchor", "middle")
      .text(getBarChartTitle());

  // Add axes
  barSvg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0, ${barHeight})`)
      .call(d3.axisBottom(x).ticks(5));

  barSvg.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y));
}



  const dotTooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);


function createDotChart(data) {
  // Remove existing dots and axes
  dotSvg.selectAll(".dot").remove();
  dotSvg.selectAll(".axis").remove(); // Clear existing axes
  dotSvg.selectAll(".chart-title").remove();
  

  // Define the scales
  const xScale = d3.scalePoint()
      .domain(data.map(d => d["Community Area"]))
      .range([0, dotWidth])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => +d["Counts"])])
      .range([dotHeight, 0]);

     const colorScale = d3.scaleSequential(d3.interpolateOrRd)
     .domain([0, d3.max(data, d => d["Counts"])]); // Assuming 'data' is your data array

  // Add the x-axis
  dotSvg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${dotHeight})`)
    .call(d3.axisBottom(xScale)
        .tickFormat(d3.format("d"))); // Format as integer

  // Add the y-axis
  dotSvg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5));

      dotSvg.append("text")
        .attr("class", "chart-title")
        .attr("x", dotWidth / 2)
        .attr("y", dotHeight + dotMargin.bottom - 10)
        .attr("text-anchor", "middle")
        .text(getDotChartTitle());

    // Add dots to the dot chart
    dotSvg.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d["Community Area"]))
      .attr("cy", d => yScale(d["Counts"]))
      .attr("r", 5)
      .attr("fill", d => colorScale(d["Counts"])) // Set the fill based on the color scale
      .on("mouseover", function(event, d) {
        dotTooltip.transition()
          .duration(200)
          .style("opacity", .9);
          let tooltipContent = `Community Area: ${d["Community Area"]}<br/>Primary Type: ${d["Primary Type"]}<br/>`;
          if (currentDataType === "all") {
              tooltipContent += `Crime Counts: ${d["Counts"]}`;
          } else if (currentDataType === "True") {
              tooltipContent += `Arrests: ${d["Counts"]}`;
          } else if (currentDataType === "False") {
              tooltipContent += `Not Arrests: ${d["Counts"]}`;
          }
          dotTooltip.html(tooltipContent)
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
        dotTooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

      // Create a gradient for the legend
    const gradient = dotSvg.append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "100%")
      .attr("y2", "0%");

    gradient.selectAll("stop")
      .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    // Append the legend
    const legendWidth = 20;
    const legendHeight = 80;

    const legend = dotSvg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${dotWidth + dotMargin.right / 4}, ${dotHeight - legendHeight})`);

    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#gradient)");

    // Legend scale
    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([legendHeight, 0]);

    // Legend axis
    legend.append("g")
      .attr("class", "axis")
      .call(d3.axisRight(legendScale).ticks(5))
      .attr("transform", `translate(${legendWidth}, 0)`);
      
  }

// Function to display initial message on the dot chart
function initializeDotChartWithMessage() {
  dotSvg.selectAll("*").remove(); // Clear any existing content

  dotSvg.append("text")
      .attr("class", "chart-title") // Using the same class as the dynamic title
      .attr("x", dotWidth / 2)
      .attr("y", dotHeight / 2)
      .attr("text-anchor", "middle")
      .text("Select a bar to see the Top Community Areas for Selected Crime Type");
}

// Call this function initially instead of createDotChart
initializeDotChartWithMessage();


function updateDotChart(crimeType, selectedType) {
  if(crimeType==null){
    initializeDotChartWithMessage();
  }
  else{
        console.log("crimeType:", crimeType);
        console.log("selectedType:", selectedType);

        d3.csv("community_crime_arrest_counts.csv").then(function(data) {
          // Filter data based on the crimeType
          let filteredData = data.filter(d => d["Primary Type"] === crimeType);

          // If the selected type is 'all', sum 'true' and 'false' counts
          if (selectedType === "all") {
              // Group by Community Area and sum counts for each group
              const summedData = Array.from(d3.rollup(filteredData, 
                  v => d3.sum(v, d => +d["Counts"]), 
                  d => d["Community Area"]))
                  .map(([key, value]) => ({
                      "Community Area": key,
                      "Counts": value,
                      "Primary Type": crimeType
                  }));
              filteredData = summedData;
          } else if (selectedType) {
              // Filter by Arrest type ('true' or 'false')
              filteredData = filteredData.filter(d => d["Arrest"].toString() === selectedType);
          }

          // Sort by 'Counts' and take the top 20
          filteredData = filteredData.sort((a, b) => b["Counts"] - a["Counts"]).slice(0, 20);

          console.log("Filtered dot chart data:", filteredData);

          // Proceed with creating the dot chart
          createDotChart(filteredData);
      }).catch(function(error) {
          console.error("Error loading dot chart data:", error);
      });
    }
}

// Function to determine the CSS class for the bars based on the currentDataType
function getBarClass() {
  switch (currentDataType) {
      case "True":
          return "arrests";
      case "False":
          return "notArrests";
      default:
          return "crimeCounts";
  }
}

// const testData = data.filter(d => d["Primary Type"] === "Theft");
//     console.log("test"+testData);