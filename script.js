
let rawData = [];
let yearData = [];
let districtData = [];
let currentMetric = 'totalIncidents';
let currentXAxis = 'year';

// Path to the CSV file
const csvFile = "arrest_counts.csv"; // Replace with the actual path to your CSV file

// SVG drawing area margin, width and height
const margin = {top: 20, right: 10, bottom: 60, left: 150},
      width = 850 - margin.left - margin.right,
      height = 350 - margin.top - margin.bottom;

// Create tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

function loadData() {
    // Load year data
    d3.csv("arrest_counts.csv", d => ({
        key: d.Year,
        arrest: d.Arrest === "True",
        counts: +d.Counts
    })).then(data => {
        // Process the year data
        yearData = processCsvData(data);

        // Once year data is loaded, load and process district data
        d3.csv("district_arrest_counts.csv", d => ({
            key: d.District,
            arrest: d.Arrest === "True",
            counts: +d.Counts
        })).then(districtRawData => {
            // Process the district data and filter for top 25 districts
            let unsortedDistrictData = processCsvData(districtRawData);
            districtData = unsortedDistrictData.sort((a, b) => b.totalIncidents - a.totalIncidents).slice(0, 20);
            
            // With both datasets loaded, draw the initial chart
            updateChart();
        }).catch(error => console.error("Error loading district CSV file:", error));
    }).catch(error => console.error("Error loading year CSV file:", error));
}

// Function to process the CSV data
function processCsvData(rawData) {
    return Array.from(d3.group(rawData, d => d.key), ([key, values]) => {
        const total = d3.sum(values, d => d.counts);
        const arrests = d3.sum(values, d => d.arrest ? d.counts : 0);
        const notArrests = total - arrests;
        return { key, totalIncidents: total, arrests, notArrests };
    });
}

// Call loadData to start the process
loadData();

// Event listeners for the dropdowns
d3.select('#xAxisSelect').on('change', function(event) {
    currentXAxis = this.value;
    updateChart(); // This will need to call createChart with the correct data and title
});

d3.select('#yAxisSelect').on('change', function(event) {
    currentMetric = this.value;
    updateChart(); // This will need to call createChart with the correct data and title
});

function formatDisplayName(name) {
    const names = {
        notArrests: "Not Arrests",
        arrests: "Arrests",
        district: "Districts",
        totalIncidents: "Crime Counts",
        year: "Year" 
    };
    return names[name] || name; // Default to the name if not found in the map
}


function updateChart() {
    // Choose the correct data based on the current X-axis category
    const data = currentXAxis === 'year' ? yearData : districtData;
    // Choose the correct title based on the current metric and X-axis category
    const title = currentXAxis === 'year' ? `${currentMetric} Over the Years` : `${currentMetric} Over the Districts`;
    createChart(data, currentMetric, title, currentXAxis);
}

function createChart(data, metric, title, xAxisCategory) {
    // Clear the existing chart
    d3.select("#bar-chart").selectAll("*").remove();

    // Create SVG element
    const svg = d3.select("#bar-chart")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.key)) // Use 'year' or 'district' from the key field
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");

    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[metric])])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    // Bars with tooltips
    svg.selectAll(".bar")
        .data(data)
        .join("rect")
            .attr("class", d => "bar" + (metric === 'arrests' ? " arrests" : (metric === 'notArrests' ? " notArrests" : "")))
            .attr("x", d => x(d.key))
            // Start with the bar at the bottom of the chart
            .attr("y", height)
            .attr("width", x.bandwidth())
            // Initially set the bar's height to 0
            .attr("height", 0)
            // Transition the bar's height and y position to its final state
            .on("mouseover", function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(100)
                    .attr("fill", d => (metric === 'arrests') ? "green" : ((metric === 'notArrests') ? "red" : "orange")); // Hover color
                
                let xAxisDisplayName = formatDisplayName(xAxisCategory);
                let metricDisplayName = formatDisplayName(metric);
                let value = d[metric];
                let key = xAxisCategory === 'year' ? d.key : `District ${d.key}`;
                
                let tooltipHtml = `${xAxisDisplayName}: ${key}<br/>${metricDisplayName}: ${value}`;
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(tooltipHtml)
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(100)
                    .attr("fill", d => (metric === 'arrests') ? "steelblue" : ((metric === 'notArrests') ? "lightblue" : "#69b3a2")); // Return to original color
                
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .transition()
            .duration(800) // Control the speed of the animation (in milliseconds)
            .attr("y", d => y(d[metric])) // Move the bar up to the correct position
            .attr("height", d => height - y(d[metric])) // Grow the bar's height accordingly
    
    if (xAxisCategory === 'year') {
        // Generate the line data based on the current metric
        const lineData = data.map(d => ({ key: d.key, value: d[metric] }));

        // Determine the line color based on the metric
        let lineColor;
        switch (metric) {
            case 'totalIncidents':
                lineColor = "orange";
                break;
            case 'arrests':
                lineColor = "green";
                break;
            case 'notArrests':
                lineColor = "red";
                break;
            default:
                lineColor = "black"; // Default line color if none of the cases match
        }
        

        // Line generator function
        const line = d3.line()
            .x(d => x(d.key) + x.bandwidth() / 2) // Center the line in each band
            .y(d => y(d.value)) // Use the current metric for the y value

        // Add the line to the chart
        svg.append("path")
            .datum(lineData) // Bind line data to the path
            .attr("class", "line") // Assign a class for styling
            .attr("fill", "none")
            .attr("stroke", lineColor) // Set line color based on the metric
            .attr("stroke-width", 2) // Line width
            .attr("d", line); // Call the line generator function
        
        function getPeriod(year) {
            if (year == 2020 || year == 2021) {
                return 'Covid lockdown period';
            } else if (year == 2018 || year == 2019) {
                return 'Before Covid';
            } else if (year == 2022 || year == 2023) {
                return 'After Covid';
            } else {
                return ''; // Default case if none of the conditions are met
            }
        }

        // Append circles to the line at specific years
        svg.selectAll(".dot")
        .data(data.filter(d => d.key >= 2018 && d.key <= 2023)) // Filter data for the years 2018-2023
        .enter().append("circle") // Creates new circle for each data point
        .attr("class", "dot")
        .attr("cx", d => x(d.key) + x.bandwidth() / 2)
        .attr("cy", d => y(d[metric]))
        .attr("r", 5) // Radius of the circle
        .attr("fill", "black")
        .on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            let period = getPeriod(d.key); // Get period based on the year
            let metricDisplayName = formatDisplayName(metric); // Use the display name for the metric
            tooltip.html(`Year: ${d.key}<br/>${metricDisplayName}: ${d[metric]}<br/>Period: ${period}`)
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
        
    }

    let formattedTitle = title.replace('year', 'Year').replace('district', 'Districts')
                              .replace('totalIncidents', 'Crime Counts').replace('arrests', 'Arrests')
                              .replace('notArrests', 'Not Arrests');

    // Add dynamic title below the X-axis
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10) // Position below the X-axis
        .attr("text-anchor", "middle")
        .text(formattedTitle);
}