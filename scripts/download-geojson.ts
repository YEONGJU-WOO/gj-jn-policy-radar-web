import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type GeoJsonFeature = {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    name_eng?: string;
    base_year?: string;
    [key: string]: unknown;
  };
  geometry: GeoJSON.Geometry;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

const SOURCE_URL =
  process.env.KOREA_MUNICIPALITIES_GEOJSON_URL ??
  "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json";

const targets = [
  {
    name: "광주 5개 자치구",
    prefix: "24",
    province: "광주",
    output: "public/geojson/gwangju.geojson",
  },
  {
    name: "전남 22개 시군",
    prefix: "36",
    province: "전남",
    output: "public/geojson/jeonnam.geojson",
  },
];

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`행정경계 GeoJSON 다운로드 실패: ${response.status} ${response.statusText}`);
  }

  const source = (await response.json()) as GeoJsonFeatureCollection;
  const combinedFeatures: GeoJsonFeature[] = [];

  for (const target of targets) {
    const features = selectFeatures(source, target.prefix, target.province);
    combinedFeatures.push(...features);
    await writeGeoJson(target.output, { type: "FeatureCollection", features });
    console.log(`[ok] ${target.name}: ${features.length} features -> ${target.output}`);
  }

  const combinedOutput = "public/geojson/gwangju-jeonnam.geojson";
  await writeGeoJson(combinedOutput, {
    type: "FeatureCollection",
    features: combinedFeatures,
  });
  console.log(`[ok] 광주·전남 통합: ${combinedFeatures.length} features -> ${combinedOutput}`);
}

function selectFeatures(
  source: GeoJsonFeatureCollection,
  prefix: string,
  province: string,
): GeoJsonFeature[] {
  return source.features
    .filter((feature) => feature.properties.code.startsWith(prefix))
    .map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        code: feature.properties.code,
        name: feature.properties.name,
        province,
        source: "southkorea/southkorea-maps KOSTAT 2013 municipalities simple GeoJSON",
      },
    }));
}

async function writeGeoJson(output: string, collection: GeoJsonFeatureCollection) {
  const outputPath = path.resolve(process.cwd(), output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(collection)}\n`, "utf-8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
