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

function createBarChart(data) {
	const svg = d3.select("#overview").append("svg");
	const width = svg.node().clientWidth;
	const height = svg.node().clientHeight;
	const margin = { top: 60, right: 200, bottom: 120, left: 60 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const primaryTypes = Array.from(new Set(data.map(d => d.Type_1))).sort();
	const secondaryTypes = Array.from(new Set(data.map(d => d.Type_2))).sort();

	const preparedData = primaryTypes.map(type1 => {
		const row = { Type_1: type1 };
		secondaryTypes.forEach(type2 => {
			row[type2] = data.filter(d => d.Type_1 === type1 && d.Type_2 === type2).length;
		});
		return row;
	});

	const stack = d3.stack().keys(secondaryTypes);
	const stackedData = stack(preparedData);

	const xScale = d3.scaleBand()
		.domain(primaryTypes)
		.range([0, innerWidth])
		.padding(0.2);

	const yMax = d3.max(preparedData, d => d3.sum(secondaryTypes, k => d[k]));
	const yScale = d3.scaleLinear()
		.domain([0, yMax])
		.range([innerHeight, 0]);

	const pokemonTypeColors = {
		"Normal": "#A8A77A", "Fire": "#EE8130", "Water": "#6390F0", "Electric": "#F7D02C",
		"Grass": "#7AC74C", "Ice": "#96D9D6", "Fighting": "#C22E28", "Poison": "#A33EA1",
		"Ground": "#E2BF65", "Flying": "#A98FF3", "Psychic": "#F95587", "Bug": "#A6B91A",
		"Rock": "#B6A136", "Ghost": "#735797", "Dragon": "#6F35FC", "Dark": "#705746",
		"Steel": "#B7B7CE", "Fairy": "#D685AD", "None": "#D3D3D3"
	};

	const colorScale = d3.scaleOrdinal()
		.domain(secondaryTypes)
		.range(secondaryTypes.map(type => pokemonTypeColors[type] || "#D3D3D3"));

	const chart = svg.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const tooltip = d3.select("#tooltip");

	chart.selectAll(".layer")
		.data(stackedData)
		.enter()
		.append("g")
		.attr("fill", d => colorScale(d.key))
		.selectAll("rect")
		.data(d => d)
		.enter()
		.append("rect")
		.attr("x", d => xScale(d.data.Type_1))
		.attr("y", d => yScale(d[1]))
		.attr("height", d => yScale(d[0]) - yScale(d[1]))
		.attr("width", xScale.bandwidth())
		.on("mouseover", function(event, d) {
			const secondaryType = d3.select(this.parentNode).datum().key;
			const primaryType = d.data.Type_1;
			const count = d.data[secondaryType];

			tooltip
				.style("display", "block")
				.html(`
					<strong>Primary:</strong> ${primaryType}<br>
					<strong>Secondary:</strong> ${secondaryType}<br>
					<strong>Count:</strong> ${count}
				`);
		})
		.on("mousemove", function(event) {
			tooltip
				.style("left", (event.pageX + 10) + "px")
				.style("top", (event.pageY + 10) + "px");
		})
		.on("mouseout", function() {
			tooltip.style("display", "none");
		});

	chart.append("g")
		.attr("transform", `translate(0,${innerHeight})`)
		.call(d3.axisBottom(xScale))
		.selectAll("text")
		.attr("transform", "rotate(-45)")
		.attr("dx", "-0.8em")
		.attr("dy", "0.15em")
		.style("text-anchor", "end");

	chart.append("g")
		.call(d3.axisLeft(yScale));

	svg.append("text")
		.attr("x", width / 2)
		.attr("y", margin.top / 2)
		.attr("text-anchor", "middle")
		.attr("font-size", "16px")
		.text("Primary Types vs. Secondary Types");

	const legend = svg.append("g")
		.attr("transform", `translate(${innerWidth + margin.left + 20},${margin.top})`);

	secondaryTypes.forEach((type, i) => {
		const g = legend.append("g").attr("transform", `translate(0,${i * 20})`);
		g.append("rect")
			.attr("width", 15)
			.attr("height", 15)
			.attr("fill", colorScale(type));
		g.append("text")
			.attr("x", 20)
			.attr("y", 12)
			.text(type);
	});
}



function createRadarChart(data) {
	const svg = d3.select("#view1").select("svg");
	const width = svg.node().clientWidth;
	const height = svg.node().clientHeight;

	// Setup margin and chart area
	const margin = { top: 50, right: 50, bottom: 50, left: 50 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;
	const centerX = margin.left + innerWidth / 2;
	const centerY = margin.top + innerHeight / 2;
	const radius = Math.min(innerWidth, innerHeight) / 2 - 20;

	// Confirm actual stat keys from your dataset
	const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

	// Create the dropdown
	const select = d3.select("#pokemon-select");
	select.selectAll("option")
		.data(data)
		.enter()
		.append("option")
		.text(d => d.Name);

	// Initialize chart with first Pokémon
	updateChart(data[0]);

	// Update chart on selection
	select.on("change", function() {
		const selectedName = this.value;
		const selectedPokemon = data.find(d => d.Name === selectedName);
		updateChart(selectedPokemon);
	});

	function updateChart(pokemon) {
		svg.selectAll("*").remove();

		const angleSlice = (Math.PI * 2) / stats.length;
		const scale = d3.scaleLinear().domain([0, 255]).range([0, radius]);

		// Draw axis lines, labels, and stat values
		stats.forEach((stat, i) => {
			const angle = angleSlice * i - Math.PI / 2;
			const labelX = centerX + (scale(255) + 20) * Math.cos(angle);
			const labelY = centerY + (scale(255) + 20) * Math.sin(angle);

			// Axis line
			svg.append("line")
				.attr("x1", centerX)
				.attr("y1", centerY)
				.attr("x2", centerX + scale(255) * Math.cos(angle))
				.attr("y2", centerY + scale(255) * Math.sin(angle))
				.attr("stroke", "#ccc");

			// Axis label (Stat name)
			svg.append("text")
				.attr("x", labelX)
				.attr("y", labelY)
				.attr("text-anchor", "middle")
				.attr("dominant-baseline", "middle")
				.attr("font-weight", "medium")
				.text(stat.replace("_", " "));

			// Stat number (Actual stat value for selected Pokémon)
			const statValue = +pokemon[stat] || 0;
			svg.append("text")
				.attr("x", labelX)
				.attr("y", labelY + 14) // offset downward by 14px
				.attr("text-anchor", "middle")
				.attr("dominant-baseline", "middle")
				.style("font-size", "12px")
				.style("fill", "#333")
				.text(statValue);
		});

		// Build data points for the polygon
		const radarData = stats.map(stat => +pokemon[stat] || 0);

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
			.attr("stroke", "#1f77b4")
			.attr("stroke-width", 2)
			.attr("d", line);

		// Add data points
		radarData.forEach((d, i) => {
			const angle = angleSlice * i - Math.PI / 2;
			svg.append("circle")
				.attr("cx", centerX + scale(d) * Math.cos(angle))
				.attr("cy", centerY + scale(d) * Math.sin(angle))
				.attr("r", 4)
				.attr("fill", "#1f77b4")
				.attr("stroke", "#fff")
				.attr("stroke-width", 1.5);
		});
	}
}



function createParallelCoordinates(data) {
	const svg = d3.select("#view2").append("svg");
	const width = svg.node().clientWidth;
	const height = svg.node().clientHeight;
	const margin = { top: 50, right: 50, bottom: 50, left: 50 };
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

	const pokemonTypeColors = {
		"Normal": "#A8A77A", "Fire": "#EE8130", "Water": "#6390F0", "Electric": "#F7D02C",
		"Grass": "#7AC74C", "Ice": "#96D9D6", "Fighting": "#C22E28", "Poison": "#A33EA1",
		"Ground": "#E2BF65", "Flying": "#A98FF3", "Psychic": "#F95587", "Bug": "#A6B91A",
		"Rock": "#B6A136", "Ghost": "#735797", "Dragon": "#6F35FC", "Dark": "#705746",
		"Steel": "#B7B7CE", "Fairy": "#D685AD", "None": "#D3D3D3"
	};

	const chart = svg.append("g")
		.attr("transform", `translate(${margin.left},${margin.top - 20})`); // adjust up slightly if needed

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
			.attr("y", margin.top + innerHeight + 15)
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

	function highlightPokemon(searchName) {
		lines
			.attr("stroke-width", d => d.Name.toLowerCase() === searchName ? 5 : 1)
			.attr("opacity", d => d.Name.toLowerCase() === searchName ? 1 : 0.05);
	}

	function resetLines() {
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



