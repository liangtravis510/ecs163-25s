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
    const svg = d3.select("#overview").append("svg")
        .attr("width", 640)
        .attr("height", 500);

    const margin = { top: 20, right: 200, bottom: 100, left: 100 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    const chartGroup = svg.append("g")
        .attr("class", "legend-scroll")
        .attr("transform", `translate(${margin.left + 20},${margin.top})`);

    const tooltip = d3.select("#tooltip");

    const types = Array.from(new Set(
        data.flatMap(d => [d.Type_1, d.Type_2 || null])
    )).filter(d => d && d !== "None").sort();

    const colorScale = d3.scaleOrdinal()
        .domain(types)
        .range(types.map(type => pokemonTypeColors[type] || "#ccc"));

    const grouped = d3.rollup(data, v => v.length, d => d.Generation, d => d.Type_1);

    const generations = Array.from(grouped.keys()).sort();

    let selectedType = null;

    const xScale = d3.scaleBand()
        .domain(generations)
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear().range([height, 0]);

    const yAxis = chartGroup.append("g").attr("class", "y-axis");

    function updateStackedBarChart() {
        const filteredKeys = selectedType ? [selectedType] : types;

        const stackData = generations.map(gen => {
            const row = { generation: gen };
            const counts = grouped.get(gen) || new Map();
            filteredKeys.forEach(type => {
                row[type] = counts.get(type) || 0;
            });
            return row;
        });

        const stacked = d3.stack()
            .keys(filteredKeys)(stackData);

        const maxY = d3.max(stacked, series => d3.max(series, d => d[1]));
        yScale.domain([0, maxY]);

        yAxis.transition().duration(500)
            .call(d3.axisLeft(yScale).ticks(null, "d"));

        const bars = chartGroup.selectAll(".layer")
            .data(stacked, d => d.key);

        bars.exit().remove();

        const barGroups = bars.enter()
            .append("g")
            .attr("class", "layer")
            .attr("fill", d => colorScale(d.key))
            .merge(bars);

        const rects = barGroups.selectAll("rect")
            .data(d => d);

        rects.enter().append("rect")
            .merge(rects)
            .transition().duration(500)
            .attr("x", d => xScale(d.data.generation))
            .attr("width", xScale.bandwidth())
            .attr("y", d => yScale(d[1]))
            .attr("height", d => yScale(d[0]) - yScale(d[1]));

        rects.exit().remove();
    }

    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => "Gen " + d));

    chartGroup.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Generation");

    chartGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -45)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text("Count");

    const legend = svg.append("g")
        .attr("transform", `translate(${width + margin.left + 20}, ${margin.top})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(types).enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .on("click", function(event, type) {
            selectedType = selectedType === type ? null : type;
            updateStackedBarChart();
        });

    legendItems.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => colorScale(d));

    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(d => d);

    updateStackedBarChart();
    d3.select("#reset-bar-chart").on("click", () => {
            selectedType = null;
        updateStackedBarChart();
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

    const margin = { top: 10, right: 50, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const centerX = margin.left + innerWidth / 2;
    const centerY = margin.top + innerHeight / 2;
    const radius = Math.min(innerWidth, innerHeight) / 2 - 20;

    const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    const typeColors = {
        "Normal": "#A8A77A", "Fire": "#EE8130", "Water": "#6390F0", "Electric": "#F7D02C",
        "Grass": "#7AC74C", "Ice": "#96D9D6", "Fighting": "#C22E28", "Poison": "#A33EA1",
        "Ground": "#E2BF65", "Flying": "#A98FF3", "Psychic": "#F95587", "Bug": "#A6B91A",
        "Rock": "#B6A136", "Ghost": "#735797", "Dragon": "#6F35FC", "Dark": "#705746",
        "Steel": "#B7B7CE", "Fairy": "#D685AD"
    };

    function shiftHue(hex, degree) {
        let hsl = d3.hsl(hex);
        hsl.h = (hsl.h + degree) % 360;
        return hsl.toString();
    }

    const select1 = d3.select("#pokemon-select");
    const select2 = d3.select("#pokemon-select-2");

    select1.selectAll("option")
        .data(data)
        .enter().append("option")
        .text(d => d.Name);

    select2.selectAll("option")
        .data(data)
        .enter().append("option")
        .text(d => d.Name);

    let selectedPokemon1 = data[0];
    let selectedPokemon2 = data[1];

    select1.on("change", function() {
        selectedPokemon1 = data.find(d => d.Name === this.value);
        updateChart();
    });

    select2.on("change", function() {
        selectedPokemon2 = data.find(d => d.Name === this.value);
        updateChart();
    });

    updateChart(); // initial call

    function updateChart() {
        const radarData1 = stats.map(stat => +selectedPokemon1[stat] || 0);
        const radarData2 = stats.map(stat => +selectedPokemon2[stat] || 0);
        const maxStat = Math.max(d3.max(radarData1), d3.max(radarData2)) + 5;

        const angleSlice = (Math.PI * 2) / stats.length;
        const scale = d3.scaleLinear().domain([0, maxStat]).range([0, radius]);

        const type1 = selectedPokemon1.Type_1;
        const type2 = selectedPokemon2.Type_1;

        const baseColor1 = typeColors[type1] || "#1f77b4";
        const baseColor2 = type1 === type2 ? shiftHue(baseColor1, 40) : (typeColors[type2] || "#ff7f0e");

        const line = d3.lineRadial()
            .radius(d => scale(d))
            .angle((d, i) => i * angleSlice)
            .curve(d3.curveLinearClosed);

        if (svg.selectAll(".radar-area1").empty()) {
            stats.forEach((stat, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const labelX = centerX + (scale(maxStat) + 20) * Math.cos(angle);
                const labelY = centerY + (scale(maxStat) + 20) * Math.sin(angle);

                svg.append("line")
                    .attr("class", "axis-line")
                    .attr("x1", centerX)
                    .attr("y1", centerY)
                    .attr("x2", centerX + scale(maxStat) * Math.cos(angle))
                    .attr("y2", centerY + scale(maxStat) * Math.sin(angle))
                    .attr("stroke", "#ccc");

                svg.append("text")
                    .attr("class", "axis-label")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("font-weight", "bold")
                    .style("font-size", "12px")
                    .text(stat.replace("_", " "));
            });

            svg.append("path")
                .attr("class", "radar-area1")
                .attr("transform", `translate(${centerX},${centerY})`)
                .attr("fill", baseColor1)
                .attr("fill-opacity", 0.5)
                .attr("stroke", baseColor1)
                .attr("stroke-width", 2)
                .datum(radarData1)
                .attr("d", line);

            svg.append("path")
                .attr("class", "radar-area2")
                .attr("transform", `translate(${centerX},${centerY})`)
                .attr("fill", baseColor2)
                .attr("fill-opacity", 0.5)
                .attr("stroke", baseColor2)
                .attr("stroke-width", 2)
                .datum(radarData2)
                .attr("d", line);
        } else {
            svg.select(".radar-area1")
                .datum(radarData1)
                .transition().duration(800)
                .attr("d", line)
                .attr("fill", baseColor1)
                .attr("stroke", baseColor1);

            svg.select(".radar-area2")
                .datum(radarData2)
                .transition().duration(800)
                .attr("d", line)
                .attr("fill", baseColor2)
                .attr("stroke", baseColor2);
        }
    }
}
/**
 * Creates a parallel coordinates plot for comparing Pokémon across multiple stats.
 * It includes a search functionality, highlight, and hover tooltips to find out the name .
 * @param {Array} data - The loaded Pokémon data.
 */
function createParallelCoordinates(data) {
	let isSearchActive = false;
	let currentHighlightedName = null;

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

	function formatShowdownName(name) {
		return name
			.toLowerCase()
			.replace(/♀/g, "-f")
			.replace(/♂/g, "-m")
			.replace(/[^a-z0-9\s-]/g, "") // remove unwanted chars
			.replace(/\s+/g, "-");
	}

	const pokemonInfo = new Map();
	data.forEach(d => {
		const showdownName = formatShowdownName(d.Name);
		pokemonInfo.set(d.Name, {
			type1: d.Type_1,
			type2: d.Type_2,
			image: `https://play.pokemonshowdown.com/sprites/ani/${showdownName}.gif`
		});
	});

	lines
		.on("mouseover", function(event, d) {
			const isTarget = !isSearchActive || d.Name.toLowerCase() === currentHighlightedName;
			if (!isTarget) return;

			d3.select(this)
                .raise()
				.attr("stroke-width", 3)
				.attr("opacity", 1);

			const info = pokemonInfo.get(d.Name);
			if (info) {
				tooltip
					.style("display", "block")
					.html(`
						<div style="display: flex; align-items: center;">
							<img src="${info.image}" alt="${d.Name}" width="50" height="50" style="margin-right: 8px;">
							<div>
								<strong>${d.Name}</strong><br>
								Type 1: ${info.type1}<br>
								Type 2: ${info.type2 || "None"}
							</div>
						</div>
					`);
			}
		})
		.on("mousemove", function(event) {
			tooltip
				.style("left", (event.pageX + 10) + "px")
				.style("top", (event.pageY + 10) + "px");
		})
		.on("mouseout", function(event, d) {
			const isTarget = !isSearchActive || d.Name.toLowerCase() === currentHighlightedName;
			if (!isTarget) return;

			d3.select(this)
				.attr("stroke-width", isSearchActive ? 5 : 1)
				.attr("opacity", isSearchActive ? 1 : 0.5);

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

	const searchInput = d3.select("#pokemon-search");
	const suggestionsBox = d3.select("#pokemon-suggestions");

	searchInput.on("input", function () {
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
				.on("click", function () {
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
		isSearchActive = true;
		currentHighlightedName = searchName;
		lines
			.attr("stroke-width", d => d.Name.toLowerCase() === searchName ? 5 : 1)
			.attr("opacity", d => d.Name.toLowerCase() === searchName ? 1 : 0.01);
	}

	function resetLines() {
		isSearchActive = false;
		currentHighlightedName = null;
		lines
			.attr("stroke-width", 1)
			.attr("opacity", 0.5);
	}

	d3.select("body").on("click", function (event) {
		if (!event.target.closest("#pokemon-search")) {
			suggestionsBox.selectAll("li").remove();
		}
	});
}




