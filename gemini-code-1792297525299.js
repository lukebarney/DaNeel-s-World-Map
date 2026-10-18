const svg = d3.select("#worldMap");
const width = 1600;
const height = 900;

const COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const STATES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";

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

let worldData = null;
let statesData = null;
let selectedCountryName = "";

const mapGroup = svg.append("g").attr("id", "mapGroup");

mapGroup
  .append("path")
  .datum({ type: "Sphere" })
  .attr("class", "sphere")
  .attr("d", path);

mapGroup
  .append("path")
  .datum(graticule)
  .attr("class", "graticule")
  .attr("d", path);

const countryLayer = mapGroup.append("g").attr("aria-label", "Countries");
const labelLayer = mapGroup.append("g").attr("aria-label", "Labels");

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

function stateName(feature) {
  const p = feature.properties || {};
  return p.name || p.NAME || p.name_en || "Unknown";
}

function countryColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 55% 73%)`;
}

function labelFontSize(feature, isState = false) {
  const bounds = path.bounds(feature);
  const pixelWidth = Math.max(1, bounds[1][0] - bounds[0][0]);
  const pixelHeight = Math.max(1, bounds[1][1] - bounds[0][1]);
  const divisor = isState ? 4.5 : 5.5;
  const maxLimit = isState ? 14 : 18;
  const size = Math.min(pixelWidth / divisor, pixelHeight / 2.2, maxLimit);
  return Math.max(isState ? 4 : 5.5, size);
}

function addLabel(group, feature, isState = false) {
  const name = isState ? stateName(feature) : countryName(feature);
  const centroid = path.centroid(feature);

  if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return;

  const bounds = path.bounds(feature);
  const featureWidth = bounds[1][0] - bounds[0][0];
  const fontSize = labelFontSize(feature, isState);

  const words = name.split(/\s+/);
  let lines = [name];

  if (words.length > 1 && featureWidth < name.length * fontSize * 0.63) {
    const midpoint = Math.ceil(words.length / 2);
    lines = [
      words.slice(0, midpoint).join(" "),
      words.slice(midpoint).join(" "),
    ];
  }

  const text = group
    .append("text")
    .attr("class", isState ? "state-label" : "country-label")
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

async function initMap() {
  const loading = document.getElementById("loadingMessage");

  try {
    const [worldJson, statesJson] = await Promise.all([
      d3.json(COUNTRIES_URL),
      d3.json(STATES_URL)
    ]);

    worldData = worldJson.features.filter(
      (feature) => countryName(feature).toLowerCase() !== "antarctica"
    );
    statesData = statesJson.features;

    renderWorldView();
    loading.remove();
  } catch (error) {
    console.error(error);
    loading.textContent =
      "The map data could not be loaded. Check your internet connection and refresh.";
  }
}

function renderWorldView() {
  selectedCountryName = "";

  document.getElementById("eyebrowText").textContent = "WORLD MAP";
  document.getElementById("mapTitleHeading").textContent = "World Map";
  document.getElementById("subtitleText").textContent = "Click any country to zoom in and explore its states and provinces.";
  document.getElementById("backButton").classList.add("hidden");

  projection.fitExtent(
    [
      [22, 18],
      [width - 22, height - 18],
    ],
    { type: "Sphere" }
  );

  mapGroup.selectAll(".sphere").attr("d", path);
  mapGroup.selectAll(".graticule").attr("d", path);

  countryLayer.selectAll("*").remove();
  labelLayer.selectAll("*").remove();

  const countries = countryLayer
    .selectAll("path")
    .data(worldData)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", (d) => countryColor(countryName(d)))
    .on("click", (event, d) => zoomToCountry(d));

  countries.append("title").text((d) => `Click to view states: ${countryName(d)}`);

  worldData.forEach((feature) => addLabel(labelLayer, feature, false));
}

function zoomToCountry(countryFeature) {
  selectedCountryName = countryName(countryFeature);

  document.getElementById("eyebrowText").textContent = "COUNTRY VIEW";
  document.getElementById("mapTitleHeading").textContent = selectedCountryName;
  document.getElementById("subtitleText").textContent = "Showing states and provinces. Click back to return to the world map.";
  document.getElementById("backButton").classList.remove("hidden");

  const cName = selectedCountryName.toLowerCase();
  const cIso = countryFeature.properties.ISO_A2 || "";
  const cA3 = countryFeature.properties.ADM0_A3 || "";

  const countryStates = statesData.filter((st) => {
    const p = st.properties || {};
    const admin = (p.admin || p.ADMIN || "").toLowerCase();
    const iso = p.iso_a2 || p.ISO_A2 || "";
    const adm0 = p.adm0_a3 || p.ADM0_A3 || "";
    return (
      admin === cName ||
      (cIso && iso === cIso) ||
      (cA3 && adm0 === cA3) ||
      (p.sov_a3 && cA3 && p.sov_a3 === cA3)
    );
  });

  projection.fitExtent(
    [
      [60, 60],
      [width - 60, height - 60],
    ],
    countryFeature
  );

  mapGroup.selectAll(".sphere").attr("d", path);
  mapGroup.selectAll(".graticule").attr("d", path);

  countryLayer.selectAll("*").remove();
  labelLayer.selectAll("*").remove();

  if (countryStates.length > 0) {
    const states = countryLayer
      .selectAll("path")
      .data(countryStates)
      .join("path")
      .attr("class", "state")
      .attr("d", path)
      .attr("fill", (d, i) => {
        let hash = i * 37 + selectedCountryName.length;
        const hue = (hash * 47) % 360;
        return `hsl(${hue} 60% 80%)`;
      });

    states.append("title").text((d) => stateName(d));

    countryStates.forEach((feature) => addLabel(labelLayer, feature, true));
  } else {
    countryLayer
      .append("path")
      .datum(countryFeature)
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", countryColor(selectedCountryName))
      .append("title")
      .text(selectedCountryName);

    addLabel(labelLayer, countryFeature, false);
  }
}

document.getElementById("backButton").addEventListener("click", () => {
  renderWorldView();
});

document.getElementById("printButton").addEventListener("click", () => {
  window.print();
});

initMap();