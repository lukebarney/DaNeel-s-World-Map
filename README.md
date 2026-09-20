# Printable World Map

A simple static website that displays a color-coded, name-labeled world map and includes a large **Print World Map** button.

## Files

- `index.html` — page structure
- `styles.css` — screen and print styling
- `app.js` — loads and draws the map

## Run locally

You can simply open `index.html` in a browser, or run a small local web server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Publish with GitHub + Cloudflare Pages

1. Create a new GitHub repository.
2. Add these files to the repository root.
3. Push to the `main` branch.
4. In Cloudflare, open **Workers & Pages**.
5. Create a Pages project and connect the GitHub repository.
6. Use `main` as the production branch.
7. This project has no build step.
8. Set the build output directory to the repository root if Cloudflare asks for one.
9. Deploy.

Every push to the connected production branch can trigger a new Cloudflare deployment.

## Map data

The prototype loads Natural Earth 1:110m country GeoJSON from the Natural Earth vector GitHub repository.

For a production site, you may prefer to download that GeoJSON file into your own repository and change `GEOJSON_URL` in `app.js` to a local file such as:

```js
const GEOJSON_URL = "./data/countries.geojson";
```

This removes the runtime dependency on GitHub's raw file host.

## Printing

The large button calls the browser's normal print dialog.

For best results:

- use landscape orientation
- enable background graphics
- print to PDF if you want a reusable digital copy
