const svg = d3.select("#worldMap");
const width = 1600;
const height = 900;

const GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const projection = d3
  .geoNaturalEarth1()
  .fitExtent(
    [
      [22, 18],
      [width - 22, height - 18],
    ],
    { type: "Sphere" }
  );

const path = d3.geoPath(projection);
const graticule = d3.geoGraticule10();

function countryName(feature) {
  const p = feature.properties || {};
  return (
    p.NAME_EN ||
    p.NAME_LONG ||
    p.NAME ||
    p.ADMIN ||
    p.SOVEREIGNT ||
    "Unknown"
  );
}

function countryColor(name) {
  let hash = 0;

  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 55% 73%)`;
}

function labelFontSize(feature) {
  const bounds = path.bounds(feature);
  const pixelWidth = Math.max(1, bounds[1][0] - bounds[0][0]);
  const pixelHeight = Math.max(1, bounds[1][1] - bounds[0][1]);
  const size = Math.min(pixelWidth / 5.5, pixelHeight / 2.2, 18);

  return Math.max(5.5, size);
}

function addWrappedLabel(group, feature) {
  const name = countryName(feature);
  const centroid = path.centroid(feature);

  if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return;

  const bounds = path.bounds(feature);
  const countryWidth = bounds[1][0] - bounds[0][0];
  const fontSize = labelFontSize(feature);

  const words = name.split(/\s+/);
  let lines = [name];

  if (words.length > 1 && countryWidth < name.length * fontSize * 0.63) {
    const midpoint = Math.ceil(words.length / 2);
    lines = [
      words.slice(0, midpoint).join(" "),
      words.slice(midpoint).join(" "),
    ];
  }

  const text = group
    .append("text")
    .attr("class", "country-label")
    .attr("x", centroid[0])
    .attr("y", centroid[1])
    .style("font-size", `${fontSize}px`);

  lines.forEach((line, i) => {
    text
      .append("tspan")
      .attr("x", centroid[0])
      .attr("dy", i === 0 ? (lines.length === 2 ? "-0.35em" : "0") : "0.9em")
      .text(line);
  });
}

async function drawMap() {
  const loading = document.getElementById("loadingMessage");

  try {
    const world = await d3.json(GEOJSON_URL);
    const countries = world.features.filter(
      (feature) => countryName(feature).toLowerCase() !== "antarctica"
    );

    svg
      .append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sphere")
      .attr("d", path);

    svg
      .append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", path);

    const countryLayer = svg.append("g").attr("aria-label", "Countries");

    countryLayer
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", (d) => countryColor(countryName(d)))
      .append("title")
      .text((d) => countryName(d));

    const labelLayer = svg.append("g").attr("aria-label", "Country labels");

    countries.forEach((feature) => addWrappedLabel(labelLayer, feature));

    loading.remove();
  } catch (error) {
    console.error(error);
    loading.textContent =
      "The map data could not be loaded. Check your internet connection and refresh.";
  }
}

document.getElementById("printButton").addEventListener("click", () => {
  window.print();
});

drawMap();
