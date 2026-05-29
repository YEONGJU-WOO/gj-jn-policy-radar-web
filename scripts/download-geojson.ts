import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type DownloadTarget = {
  name: string;
  env: string;
  output: string;
};

const targets: DownloadTarget[] = [
  {
    name: "광주 5개 자치구",
    env: "GWANGJU_GEOJSON_URL",
    output: "public/geojson/gwangju.geojson",
  },
  {
    name: "전남 22개 시군",
    env: "JEONNAM_GEOJSON_URL",
    output: "public/geojson/jeonnam.geojson",
  },
];

async function main() {
  for (const target of targets) {
    const url = process.env[target.env];
    if (!url) {
      console.log(
        `[skip] ${target.name}: ${target.env} 환경변수가 없습니다. 국토지리정보원/행정안전부에서 내려받은 GeoJSON URL을 지정하세요.`,
      );
      continue;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${target.name} 다운로드 실패: ${response.status} ${response.statusText}`);
    }

    const geojson = await response.text();
    const outputPath = path.resolve(process.cwd(), target.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, geojson, "utf-8");
    console.log(`[ok] ${target.name}: ${target.output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
