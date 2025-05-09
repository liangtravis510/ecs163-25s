const margin = { top: 40, right: 20, bottom: 100, left: 60 };
const width = 600;
const height = 400;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

d3.csv("data/pokemon.csv").then(rawdata => {
    console.log("Raw Data:", rawdata);

    rawdata.forEach(function(d) {
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Type_1 = d.Type_1; 
        d.Legendary = d.Legendary === "True"; 
    });
    
    // Plot 1: Bar Chart
    const typeCounts = {};

    for (const d of rawdata) {
        const type = d.Type_1;
        if (typeCounts[type] === undefined) {
            typeCounts[type] = 1;
        } 
        else {
            typeCounts[type]++;
        }   
    }
    
    const processData = Object.entries(typeCounts).map(([type, count]) => {
        return {
            type: type,
            count: count
        };
    });

    console.log("processedData", processData)
    
    const svg = d3.select("#view1")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(processData.map(d => d.type))
        .range([0, innerWidth])
        .padding(0.1)
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.count)])
        .nice()
        .range([innerHeight, 0]);
    
    
    

});

