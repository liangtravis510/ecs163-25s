const pokemonTypeColors = {
    "Normal": "#A8A77A", "Fire": "#EE8130", "Water": "#6390F0", "Electric": "#F7D02C",
    "Grass": "#7AC74C", "Ice": "#96D9D6", "Fighting": "#C22E28", "Poison": "#A33EA1",
    "Ground": "#E2BF65", "Flying": "#A98FF3", "Psychic": "#F95587", "Bug": "#A6B91A",
    "Rock": "#B6A136", "Ghost": "#735797", "Dragon": "#6F35FC", "Dark": "#705746",
    "Steel": "#B7B7CE", "Fairy": "#D685AD", "None": "#D3D3D3"
};

d3.csv("pokemon.csv").then(function(data) {
	data.forEach(d => {
    d.Total = +d.Total;
    d.HP = +d.HP;
		d.Attack = +d.Attack;
		d.Defense = +d.Defense;
		d["Sp. Atk"] = +d["Sp. Atk"];
		d["Sp. Def"] = +d["Sp. Def"];
		d.Speed = +d.Speed || 0;
		d.Generation = +d.Generation;
		d.Legendary = d.Legendary === "True";
	});
  console.log("Cleaned Data Preview:", data.slice(0, 5));
  console.log(Object.keys(data[0]))

  
	createBarChart(data);
	createRadarChart(data);
	createParallelCoordinates(data);

	d3.select("#loading-overlay").style("display", "none");
});

/**
 * Creates a stacked bar chart showing Pokémon type distribution per generation.
 * @param {Array} data - The loaded Pokémon data.
 */
function createBarChart(data) {
    const svg = d3.select("#overview").append("svg");
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    const margin = { top: 20, right: 200, bottom: 70, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Extract all unique types from both Type_1 and Type_2
    const types = Array.from(new Set(
        data.flatMap(d => [d.Type_1, d.Type_2])
    )).filter(d => d && d !== "None").sort();

    // Color scale using pokemonTypeColors or fallback
    const colorScale = d3.scaleOrdinal()
        .domain(types)
        .range(types.map(type => pokemonTypeColors[type] || "#ccc"));

    // Count by Generation and Type_1
    const grouped = d3.rollup(data, v => v.length, d => d.Generation, d => d.Type_1);

    const generations = Array.from(grouped.keys()).sort();
    const stackData = generations.map(gen => {
        const entry = { Generation: gen };
        const typeMap = grouped.get(gen) || new Map();
        types.forEach(type => {
            entry[type] = typeMap.get(type) || 0;
        });
        return entry;
    });

    const stackGenerator = d3.stack()
        .keys(types);

    const stackSeries = stackGenerator(stackData);

    const xScale = d3.scaleBand()
        .domain(generations)
        .range([0, innerWidth])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(stackData, d => d3.sum(types, t => d[t]))])
        .range([innerHeight, 0]);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip reference
    const tooltip = d3.select("#tooltip");

    // Draw stacked bars with hover tool
    chart.selectAll(".serie")
        .data(stackSeries)
        .enter()
        .append("g")
        .attr("fill", d => colorScale(d.key))
        .each(function(series) {
            d3.select(this).selectAll("rect")
                .data(series)
                .enter()
                .append("rect")
                .attr("x", d => xScale(d.data.Generation))
                .attr("y", d => yScale(d[1]))
                .attr("height", d => yScale(d[0]) - yScale(d[1]))
                .attr("width", xScale.bandwidth())
                .on("mouseover", function(event, d) {
                    const type = series.key;
                    const count = d[1] - d[0];

                    tooltip
                        .style("display", "block")
                        .html(`<strong>${type}</strong><br>Generation ${d.data.Generation}<br>Count: ${count}`);
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("display", "none");
                });
        });

    // Axes
    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d => "Gen " + d));

    chart.append("g")
        .call(d3.axisLeft(yScale));

    // X-axis label
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Generations");

    // Y-axis label
    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Count");

    // Legend 
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);

    legend.selectAll("g")
        .data(types)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${(i % 2) * 100}, ${Math.floor(i / 2) * 20})`)
        .each(function(d) {
            d3.select(this).append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colorScale(d));

            d3.select(this).append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(d);
        });
}

/**
 * Creates an interactive radar chart for viewing a Pokémon's stats.
 * It will dynamically scale based off the Pokémon's highest stat
 * @param {Array} data - The loaded Pokémon data.
 */
function createRadarChart(data) {
	const svg = d3.select("#view1").select("svg");
	const width = svg.node().clientWidth;
	const height = svg.node().clientHeight;

	// Setup margin and chart area
	const margin = { top: 10, right: 50, bottom: 50, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;
	const centerX = margin.left + innerWidth / 2;
	const centerY = margin.top + innerHeight / 2;
	const radius = Math.min(innerWidth, innerHeight) / 2 - 20;

	const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

	// Create the dropdown
	const select = d3.select("#pokemon-select");
	select.selectAll("option")
		.data(data)
		.enter()
		.append("option")
		.text(d => d.Name);

	// Defaults to Bulbasaur
	updateChart(data[0]);

	// Update chart on selection
	select.on("change", function() {
		const selectedName = this.value;
		const selectedPokemon = data.find(d => d.Name === selectedName);
		updateChart(selectedPokemon);
	});

	/**
     * Updates the radar chart for the given Pokémon.
     * Scales the chart to the Pokémon's highest stat.
     * @param {Object} pokemon - The selected Pokémon data object.
     */
	function updateChart(pokemon) {
		svg.selectAll("*").remove();

		const radarData = stats.map(stat => +pokemon[stat] || 0);
		const maxStat = d3.max(radarData) + 5 

		const angleSlice = (Math.PI * 2) / stats.length;
		const scale = d3.scaleLinear().domain([0, maxStat]).range([0, radius]);

		// Draw axis lines, labels, and stat values
		stats.forEach((stat, i) => {
			const angle = angleSlice * i - Math.PI / 2;
			const labelX = centerX + (scale(maxStat) + 20) * Math.cos(angle);
			const labelY = centerY + (scale(maxStat) + 20) * Math.sin(angle);

			// Axis line
			svg.append("line")
				.attr("x1", centerX)
				.attr("y1", centerY)
				.attr("x2", centerX + scale(maxStat) * Math.cos(angle))
				.attr("y2", centerY + scale(maxStat) * Math.sin(angle))
				.attr("stroke", "#ccc");

			// Axis label 
			svg.append("text")
				.attr("x", labelX)
				.attr("y", labelY)
				.attr("text-anchor", "middle")
				.attr("dominant-baseline", "middle")
				.attr("font-weight", "bold")
				.style("font-size", "12px")
				.text(stat.replace("_", " "));

			// Stat numbers
			svg.append("text")
				.attr("x", labelX)
				.attr("y", labelY + 15)
				.attr("text-anchor", "middle")
				.attr("dominant-baseline", "middle")
				.style("font-size", "12px")
				.style("fill", "#333")
				.text(+pokemon[stat] || 0);
		});

		// Create the radar polygon path 
		const line = d3.lineRadial()
			.radius((d) => scale(d))
			.angle((d, i) => i * angleSlice)
			.curve(d3.curveLinearClosed);

		// Draw polygon
		svg.append("path")
			.datum(radarData)
			.attr("transform", `translate(${centerX},${centerY})`)
			.attr("fill", "#1f77b4")
			.attr("fill-opacity", 0.5)
			.attr("stroke", "#333")
			.attr("stroke-width", 2)
			.attr("d", line);

		// Add data points
		radarData.forEach((d, i) => {
			const angle = angleSlice * i - Math.PI / 2;
			svg.append("circle")
				.attr("cx", centerX + scale(d) * Math.cos(angle))
				.attr("cy", centerY + scale(d) * Math.sin(angle))
				.attr("r", 3)
				.attr("fill", "#1f77b4")
				.attr("stroke", "#333")
				.attr("stroke-width", 1.5);
		});
	}
}

/**
 * Creates a parallel coordinates plot for comparing Pokémon across multiple stats.
 * It includes a search functionality, highlight, and hover tooltips to find out the name .
 * @param {Array} data - The loaded Pokémon data.
 */
function createParallelCoordinates(data) {
	let isSearchActive = false;

	const svg = d3.select("#view2").append("svg");
	const width = svg.node().clientWidth;
	const height = svg.node().clientHeight;
	const margin = { top: 10, right: 50, bottom: 50, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

	// Create scales
	const yScales = {};
	stats.forEach(stat => {
		yScales[stat] = d3.scaleLinear()
			.domain(d3.extent(data, d => +d[stat]))
			.range([innerHeight, 0]);
	});

	const xScale = d3.scalePoint()
		.domain(stats)
		.range([0, innerWidth])
		.padding(0.5);

	const chart = svg.append("g")
		.attr("transform", `translate(${margin.left},${margin.top + 20})`);

	/**
	 * Generates the path string for a Pokémon across the axes.
	 * @param {Object} d - Pokémon data object.
	 * @returns {string} SVG path string
	 */
	function path(d) {
		return d3.line()(stats.map(stat => [xScale(stat), yScales[stat](+d[stat])]));
	}

	const lines = chart.selectAll(".pokemon-line")
		.data(data)
		.enter()
		.append("path")
		.attr("class", "pokemon-line")
		.attr("d", path)
		.attr("fill", "none")
		.attr("stroke", d => pokemonTypeColors[d.Type_1] || "#999")
		.attr("stroke-width", 1)
		.attr("opacity", 0.5);

	const tooltip = d3.select("#tooltip");

	lines
		.on("mouseover", function(event, d) {
			if (isSearchActive) return;
			d3.select(this)
				.attr("stroke-width", 3)
				.attr("opacity", 1);

			tooltip
				.style("display", "block")
				.html(`<strong>${d.Name}</strong>`);
		})
		.on("mousemove", function(event) {
			tooltip
				.style("left", (event.pageX + 10) + "px")
				.style("top", (event.pageY + 10) + "px");
		})
		.on("mouseout", function() {
			if (isSearchActive) return; // Don't reset if search is active
			d3.select(this)
				.attr("stroke-width", 1)
				.attr("opacity", 0.5);

			tooltip.style("display", "none");
		});

	stats.forEach(stat => {
		const g = chart.append("g")
			.attr("transform", `translate(${xScale(stat)},0)`);

		g.call(d3.axisLeft(yScales[stat]).ticks(5));

		svg.append("text")
			.attr("x", margin.left + xScale(stat))
			.attr("y", margin.top + innerHeight + 50)
			.attr("text-anchor", "middle")
			.style("font-size", "14px")
			.style("font-weight", "bold")
			.text(stat.replace("_", " "));
	});

	// Search + Suggestions
	const searchInput = d3.select("#pokemon-search");
	const suggestionsBox = d3.select("#pokemon-suggestions");

	searchInput.on("input", function() {
		const searchText = this.value.trim().toLowerCase();

		const suggestions = data
			.map(d => d.Name)
			.filter(name => name.toLowerCase().includes(searchText) && searchText.length > 0)
			.slice(0, 10);

		suggestionsBox.selectAll("li").remove();

		suggestions.forEach(name => {
			suggestionsBox.append("li")
				.text(name)
				.style("padding", "4px 8px")
				.style("cursor", "pointer")
				.on("click", function() {
					searchInput.property("value", name);
					suggestionsBox.selectAll("li").remove();
					highlightPokemon(name.toLowerCase());
				});
		});

		if (searchText !== "") {
			highlightPokemon(searchText);
		} else {
			resetLines();
		}
	});

	/**
     * Highlights the Pokémon line matching the searched name.
     * @param {string} searchName - Pokémon name to highlight.
     */
	function highlightPokemon(searchName) {
		isSearchActive = true;
		lines
			.attr("stroke-width", d => d.Name.toLowerCase() === searchName ? 5 : 1)
			.attr("opacity", d => d.Name.toLowerCase() === searchName ? 1 : 0.01);
	}

	/**
     * Resets all Pokémon lines to default stroke width and opacity.
     */
	function resetLines() {
		isSearchActive = false;
		lines
			.attr("stroke-width", 1)
			.attr("opacity", 0.5);
	}

	d3.select("body").on("click", function(event) {
		if (!event.target.closest("#pokemon-search")) {
			suggestionsBox.selectAll("li").remove();
		}
	});
}



