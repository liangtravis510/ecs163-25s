const pokemonTypeColors = {
  Normal: "#A8A77A",
  Fire: "#EE8130",
  Water: "#6390F0",
  Electric: "#F7D02C",
  Grass: "#7AC74C",
  Ice: "#96D9D6",
  Fighting: "#C22E28",
  Poison: "#A33EA1",
  Ground: "#E2BF65",
  Flying: "#A98FF3",
  Psychic: "#F95587",
  Bug: "#A6B91A",
  Rock: "#B6A136",
  Ghost: "#735797",
  Dragon: "#6F35FC",
  Dark: "#705746",
  Steel: "#B7B7CE",
  Fairy: "#D685AD",
  None: "#D3D3D3",
};

d3.csv("pokemon.csv").then(function (data) {
  data.forEach((d) => {
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
  console.log(Object.keys(data[0]));

  createStatDistributionChart(data);
  createRadarChart(data);
  createParallelCoordinates(data);

  d3.select("#loading-overlay").style("display", "none");
});

const generationColors = {
  1: "#FF1C1C", // Red
  2: "#FFCC00", // Gold
  3: "#00DD88", // Emerald
  4: "#5599FF", // Diamond
  5: "#444444", // Black
  6: "#AA77FF", // X/Y
};

/**
 * Creates a bar chart showing total stat distribution for a selected generation.
 * Bins total stats in 100-point ranges and uses themed colors per generation.
 * @param {Array} data - Pokémon dataset
 */
/**
 * Creates a bar chart that shows the number of Pokémon grouped by their total stat score
 * in 100-point bins, for a specific generation selected via slider input.
 * The chart uses Pokémon game-themed colors for each generation.
 *
 * @param {Array<Object>} data - The Pokémon dataset, with stats and generation info
 */
function createStatDistributionChart(data) {
  const svg = d3
    .select("#overview")
    .append("svg")
    .attr("width", 640)
    .attr("height", 420);

  const margin = { top: 40, right: 30, bottom: 70, left: 60 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand().padding(0.1).range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);

  const xAxisGroup = chart
    .append("g")
    .attr("transform", `translate(0,${height})`);
  const yAxisGroup = chart.append("g");

  // Title
  svg
    .append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Total Stat Distribution by Generation");

  // X-axis label
  svg
    .append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", height + margin.top + 55)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Total Stat Range");

  // Y-axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - height / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Number of Pokémon");

  const slider = d3.select("#gen-slider");
  const sliderValue = d3.select("#gen-slider-value");

  // Update chart when generation changes
  function updateChart(gen) {
    const filtered = data.filter((d) => d.Generation === +gen);
    const maxStat = d3.max(filtered, (d) => d.Total);
    const binEdges = d3.range(200, Math.ceil(maxStat / 100) * 100 + 100, 100);

    const bins = d3
      .bin()
      .value((d) => d.Total)
      .thresholds(binEdges)(filtered);

    xScale.domain(bins.map((bin) => `${bin.x0}-${bin.x1 - 1}`));
    yScale.domain([0, d3.max(bins, (d) => d.length)]);

    const bars = chart.selectAll(".bar").data(bins, (d) => d.x0);

    // Transition exiting bars and animate updates for smooth switching between generations
    bars.exit().remove();

    bars
      .transition()
      .duration(400)
      .attr("x", (d) => xScale(`${d.x0}-${d.x1 - 1}`))
      .attr("y", (d) => yScale(d.length))
      .attr("height", (d) => height - yScale(d.length))
      .attr("width", xScale.bandwidth())
      .attr("fill", generationColors[gen] || "#888");

    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(`${d.x0}-${d.x1 - 1}`))
      .attr("y", (d) => yScale(d.length))
      .attr("height", (d) => height - yScale(d.length))
      .attr("width", xScale.bandwidth())
      .attr("fill", generationColors[gen] || "#888");

    xAxisGroup
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");

    yAxisGroup.call(d3.axisLeft(yScale));
  }

  // Slider behavior
  slider.on("input", function () {
    const gen = this.value;
    sliderValue.text(`Gen ${gen}`);
    updateChart(gen);
  });

  updateChart(1); // Initial chart
}

/**
 * Creates an interactive radar chart for viewing a Pokémon's stats.
 * It will dynamically scale based off the Pokémon's highest stat
 * @param {Array} data - The loaded Pokémon data.
 */
/**
 * Creates an interactive radar chart to compare the stats of two selected Pokémon.
 * Dynamically updates colors and values as the user selects Pokémon from dropdowns.
 * If both Pokémon are the same type, a hue shift is applied to differentiate colors.
 *
 * @param {Array<Object>} data - The Pokémon dataset
 */
function createRadarChart(data) {
  const svg = d3.select("#view1").select("svg");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  svg
    .append("text")
    .attr("x", 750)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Pokemon Stat Comparison Radar Chart");

  const margin = { top: 10, right: 50, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const centerX = margin.left + innerWidth / 2;
  const centerY = margin.top + innerHeight / 2;
  const radius = Math.min(innerWidth, innerHeight) / 2 - 20;

  const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

  const typeColors = {
    Normal: "#A8A77A",
    Fire: "#EE8130",
    Water: "#6390F0",
    Electric: "#F7D02C",
    Grass: "#7AC74C",
    Ice: "#96D9D6",
    Fighting: "#C22E28",
    Poison: "#A33EA1",
    Ground: "#E2BF65",
    Flying: "#A98FF3",
    Psychic: "#F95587",
    Bug: "#A6B91A",
    Rock: "#B6A136",
    Ghost: "#735797",
    Dragon: "#6F35FC",
    Dark: "#705746",
    Steel: "#B7B7CE",
    Fairy: "#D685AD",
  };

  /**
   * Shifts the hue of a hex color by a given number of degrees.
   * @param {string} hex - The base hex color
   * @param {number} degree - Degrees to shift the hue.
   * @returns {string} The resulting color in HSL string format.
   */

  /**
   * Shifts the hue of a hex color string by a specified number of degrees.
   * Used to visually distinguish two Pokémon of the same type in the radar chart.
   *
   * @param {string} hex - A hex color string (e.g., "#FF0000")
   * @param {number} degree - Degrees to shift hue
   * @returns {string} - The new color as an HSL string
   */
  function shiftHue(hex, degree) {
    let hsl = d3.hsl(hex);
    hsl.h = (hsl.h + degree) % 360;
    return hsl.toString();
  }

  const select1 = d3.select("#pokemon-select");
  const select2 = d3.select("#pokemon-select-2");

  select1
    .selectAll("option")
    .data(data)
    .enter()
    .append("option")
    .text((d) => d.Name);

  select2
    .selectAll("option")
    .data(data)
    .enter()
    .append("option")
    .text((d) => d.Name);

  let selectedPokemon1 = data[0];
  let selectedPokemon2 = data[1];

  select1.on("change", function () {
    selectedPokemon1 = data.find((d) => d.Name === this.value);
    updateChart();
  });

  select2.on("change", function () {
    selectedPokemon2 = data.find((d) => d.Name === this.value);
    updateChart();
  });

  updateChart();

  /**
   * Updates the radar chart with the currently selected Pokémon stats.
   */
  function updateChart() {
    const radarData1 = stats.map((stat) => +selectedPokemon1[stat] || 0);
    const radarData2 = stats.map((stat) => +selectedPokemon2[stat] || 0);
    const maxStat = Math.max(d3.max(radarData1), d3.max(radarData2)) + 5;

    const angleSlice = (Math.PI * 2) / stats.length;
    const scale = d3.scaleLinear().domain([0, maxStat]).range([0, radius]);

    const type1 = selectedPokemon1.Type_1;
    const type2 = selectedPokemon2.Type_1;

    const baseColor1 = typeColors[type1] || "#1f77b4";
    const baseColor2 =
      type1 === type2
        ? shiftHue(baseColor1, 40)
        : typeColors[type2] || "#ff7f0e";

    const line = d3
      .lineRadial()
      .radius((d) => scale(d))
      .angle((d, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    if (svg.selectAll(".radar-area1").empty()) {
      stats.forEach((stat, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const labelX = centerX + (scale(maxStat) + 20) * Math.cos(angle);
        const labelY = centerY + (scale(maxStat) + 20) * Math.sin(angle);

        svg
          .append("line")
          .attr("class", "axis-line")
          .attr("x1", centerX)
          .attr("y1", centerY)
          .attr("x2", centerX + scale(maxStat) * Math.cos(angle))
          .attr("y2", centerY + scale(maxStat) * Math.sin(angle))
          .attr("stroke", "#ccc");

        svg
          .append("text")
          .attr("class", "axis-label")
          .attr("x", labelX)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-weight", "bold")
          .style("font-size", "12px")
          .text(stat.replace("_", " "));
      });

      svg
        .append("path")
        .attr("class", "radar-area1")
        .attr("transform", `translate(${centerX},${centerY})`)
        .attr("fill", baseColor1)
        .attr("fill-opacity", 0.5)
        .attr("stroke", baseColor1)
        .attr("stroke-width", 2)
        .datum(radarData1)
        .attr("d", line);

      svg
        .append("path")
        .attr("class", "radar-area2")
        .attr("transform", `translate(${centerX},${centerY})`)
        .attr("fill", baseColor2)
        .attr("fill-opacity", 0.5)
        .attr("stroke", baseColor2)
        .attr("stroke-width", 2)
        .datum(radarData2)
        .attr("d", line);
    } else {
      svg
        .select(".radar-area1")
        .datum(radarData1)
        .transition()
        .duration(800)
        .attr("d", line)
        .attr("fill", baseColor1)
        .attr("stroke", baseColor1);

      svg
        .select(".radar-area2")
        .datum(radarData2)
        .transition()
        .duration(800)
        .attr("d", line)
        .attr("fill", baseColor2)
        .attr("stroke", baseColor2);
    }
  }
}
/**
 * Creates a parallel coordinates plot for comparing Pokémon across multiple stats.
 * Includes search, hover tooltips, and filtering by Type 1 and Type 2.
 * @param {Array} data - The Pokémon dataset
 */
/**
 * Creates a parallel coordinates chart for comparing Pokémon stats across multiple axes.
 * Includes features like:
 * - Hover tooltips with sprites and stat values
 * - Search input to highlight a specific Pokémon
 * - Type 1 and Type 2 filters with checkboxes and dropdowns
 * - Reset button to clear all filters and restore default view
 *
 * @param {Array<Object>} data - The Pokémon dataset
 */
function createParallelCoordinates(data) {
  let isSearchActive = false;
  let currentHighlightedName = null;

  const svg = d3
    .select("#view2")
    .append("svg")
    .attr("width", 1600) // Adjust as needed
    .attr("height", 400); // Adjust as needed
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 10, right: 50, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg
    .append("text")
    .attr("x", 960)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("More detailed Parallel Coordinate Stat Chart");

  const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

  // Create scales
  const yScales = {};
  stats.forEach((stat) => {
    yScales[stat] = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => +d[stat]))
      .range([innerHeight, 0]);
  });

  const xScale = d3
    .scalePoint()
    .domain(stats)
    .range([0, innerWidth])
    .padding(0.5);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top + 20})`);

  function path(d) {
    return d3.line()(
      stats.map((stat) => [xScale(stat), yScales[stat](+d[stat])])
    );
  }

  // Format name for Showdown sprite
  function formatShowdownName(name) {
    return name
      .toLowerCase()
      .replace(/♀/g, "-f")
      .replace(/♂/g, "-m")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  const pokemonInfo = new Map();
  data.forEach((d) => {
    const showdownName = formatShowdownName(d.Name);
    pokemonInfo.set(d.Name, {
      type1: d.Type_1,
      type2: d.Type_2,
      image: `https://play.pokemonshowdown.com/sprites/ani/${showdownName}.gif`,
    });
  });

  // Draw a path for each Pokémon's stat line in the parallel coordinate chart
  const allLines = chart
    .selectAll(".pokemon-line")
    .data(data)
    .enter()
    .append("path")
    .attr("class", "pokemon-line")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", (d) => pokemonTypeColors[d.Type_1] || "#999")
    .attr("stroke-width", 1)
    .attr("opacity", 0.5);

  const tooltip = d3.select("#tooltip");

  allLines
    .on("mouseover", function (event, d) {
      const isTarget =
        !isSearchActive || d.Name.toLowerCase() === currentHighlightedName;
      if (!isTarget) return;

      d3.select(this).raise().attr("stroke-width", 3).attr("opacity", 1);

      const info = pokemonInfo.get(d.Name);
      if (info) {
        tooltip.style("display", "block").html(`
						<div style="display: flex; align-items: center;">
							<img src="${info.image}" alt="${
          d.Name
        }" style="height: 50px; margin-right: 8px; object-fit: contain;">
							<div>
								<strong>${d.Name}</strong><br>
								Type 1: ${info.type1}<br>
								Type 2: ${info.type2 || "None"}<br>
								HP: ${d.HP}<br>
								Attack: ${d.Attack}<br>
								Defense: ${d.Defense}<br>
								Sp. Atk: ${d.Sp_Atk}<br>
								Sp. Def: ${d.Sp_Def}<br>
								Speed: ${d.Speed}
							</div>
						</div>
					`);
      }
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", function (event, d) {
      const isTarget =
        !isSearchActive || d.Name.toLowerCase() === currentHighlightedName;
      if (!isTarget) return;

      d3.select(this)
        .attr("stroke-width", isSearchActive ? 5 : 1)
        .attr("opacity", isSearchActive ? 1 : 0.5);

      tooltip.style("display", "none");
    });

  // Axes
  stats.forEach((stat) => {
    const g = chart
      .append("g")
      .attr("transform", `translate(${xScale(stat)},0)`);
    g.call(d3.axisLeft(yScales[stat]).ticks(5));

    svg
      .append("text")
      .attr("x", margin.left + xScale(stat))
      .attr("y", margin.top + innerHeight + 50)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(stat.replace("_", " "));
  });

  // Search
  const searchInput = d3.select("#pokemon-search");
  const suggestionsBox = d3.select("#pokemon-suggestions");

  searchInput.on("input", function () {
    const searchText = this.value.trim().toLowerCase();

    const suggestions = data
      .map((d) => d.Name)
      .filter(
        (name) =>
          name.toLowerCase().includes(searchText) && searchText.length > 0
      )
      .slice(0, 10);

    // Clear previous suggestions before adding new ones
    suggestionsBox.selectAll("li").remove();

    suggestions.forEach((name) => {
      suggestionsBox
        .append("li")
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
    applyTypeFilter();
    allLines
      .attr("stroke-width", (d) =>
        d.Name.toLowerCase() === searchName ? 5 : 1
      )
      .attr("opacity", (d) => (d.Name.toLowerCase() === searchName ? 1 : 0.01));
  }

  function resetLines() {
    isSearchActive = false;
    currentHighlightedName = null;
    applyTypeFilter();
    allLines.attr("stroke-width", 1).attr("opacity", 0.5);
  }

  d3.select("body").on("click", function (event) {
    if (!event.target.closest("#pokemon-search")) {
      suggestionsBox.selectAll("li").remove();
    }
  });

  // Type 1 Filter Setup
  const typeSet = new Set(data.map((d) => d.Type_1));
  const typeOptions = Array.from(typeSet).sort();

  const typeSelect = d3.select("#type1-select");
  const enableTypeFilter = d3.select("#enable-type-filter");

  typeOptions.forEach((type) => {
    typeSelect.append("option").attr("value", type).text(type);
  });

  // Type 2 Filter Setup
  const type2Set = new Set(
    data.map((d) => d.Type_2).filter((t) => t && t !== "None")
  );
  const type2Options = Array.from(type2Set).sort();

  const type2Select = d3.select("#type2-select");
  const enableType2Filter = d3.select("#enable-type2-filter");

  type2Options.forEach((type) => {
    type2Select.append("option").attr("value", type).text(type);
  });

  // Apply filters
  function applyTypeFilter() {
    const enabled1 = enableTypeFilter.property("checked");
    const selected1 = typeSelect.property("value").trim();
    const enabled2 = enableType2Filter.property("checked");
    const selected2 = type2Select.property("value").trim();

    typeSelect.property("disabled", !enabled1);
    type2Select.property("disabled", !enabled2);

    allLines.attr("display", (d) => {
      const match1 = !enabled1 || d.Type_1 === selected1;
      const match2 = !enabled2 || d.Type_2 === selected2;
      const matchSearch =
        !isSearchActive || d.Name.toLowerCase() === currentHighlightedName;
      return match1 && match2 && matchSearch ? null : "none";
    });
  }

  // Filter event listeners
  enableTypeFilter.on("change", applyTypeFilter);
  typeSelect.on("change", applyTypeFilter);
  enableType2Filter.on("change", applyTypeFilter);
  type2Select.on("change", applyTypeFilter);

  // Rest filter button
  d3.select("#reset-parallel-filters").on("click", () => {
    d3.select("#pokemon-search").property("value", "");
    d3.select("#enable-type-filter").property("checked", false);
    d3.select("#type1-select").property("value", "").property("disabled", true);
    d3.select("#enable-type2-filter").property("checked", false);
    d3.select("#type2-select").property("value", "").property("disabled", true);

    isSearchActive = false;
    currentHighlightedName = null;
    allLines.attr("stroke-width", 1).attr("opacity", 0.5).attr("display", null);
  });
}
