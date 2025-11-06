import puppeteer from "puppeteer";
import path from "path";
import Database from "better-sqlite3";
import type { Page } from "puppeteer";
import fs from "fs";


// 🧠 Leer argumentos desde línea de comandos
const args = process.argv.slice(2);
const filtroCombustible = args[0] || "gasolina"; // valor por defecto // other values: gasolina | diesel | electrico | hibrido
const filtroAnyoDesde = parseInt(args[1]) || 1950; // valor por defecto // other values: from 1950 to 2025
const filtroAnyoHasta = parseInt(args[2]) || 2015; // valor por defecto // other values: from 1950 to 2025

console.log(`🚗 Ejecutando scraper para:
  Combustible: ${filtroCombustible}
  Años: ${filtroAnyoDesde} - ${filtroAnyoHasta}`);

// ⚙️ Ruta de carpeta por combustible (ej: ./gasolina/)
const progressDir = path.join(process.cwd(), filtroCombustible);
if (!fs.existsSync(progressDir)) {
  fs.mkdirSync(progressDir, { recursive: true });
}

// 📄 Nombre completo del archivo de progreso dentro de la carpeta correspondiente
const progressFileName = path.join(
  progressDir,
  `last_page_${filtroCombustible}_${filtroAnyoDesde}_${filtroAnyoHasta}.txt`
);

// 🗂️ Base de datos
const dbPath = path.join(process.cwd(), `coches_com_listings_details_${filtroCombustible}.db`);
const db = new Database(dbPath);
console.log(`SQLite database initialized at: ${dbPath}`);

db.exec(`
 CREATE TABLE IF NOT EXISTS urls (
 url TEXT PRIMARY KEY,
 status TEXT DEFAULT 'pending', 
 country TEXT,
 province TEXT,
 collection_date DATETIME DEFAULT CURRENT_TIMESTAMP
 )
`);

function humanDelay(min = 2000, max = 4000) {
  const delay = Math.random() * (max - min) + min;
  return new Promise((r) => setTimeout(r, delay));
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

// 🔘 Guardar y cargar progreso con nombre dinámico
function saveProgress(pageNumber: number) {
  fs.writeFileSync(progressFileName, String(pageNumber));
}

function loadProgress(): number {
  try {
    return parseInt(fs.readFileSync(progressFileName, "utf-8")) || 1;
  } catch {
    return 1;
  }
}

async function gotoWithRetries(page: Page, url: string, retries = 3, delayMs = 5000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      return;
    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed to load ${url}:`, error.message);
      if (attempt < retries) {
        console.log(`⏳ Waiting ${delayMs}ms before retrying...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw error;
      }
    }
  }
}

async function scrapeCochesCom() {
  const maxPagesToScrape = 500;
  const listingsPerPage = 20;

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const insertUrlStmt = db.prepare(`
    INSERT OR IGNORE INTO urls (url, country, province, status) VALUES (?, ?, ?, 'pending')
  `);

  try {
    let currentPage = loadProgress();
    let paginasCon0AnunciosSeguidas = 0;

    for (; currentPage <= maxPagesToScrape; currentPage++) {
      saveProgress(currentPage);

      const url = `https://www.coches.com/coches-segunda-mano/${filtroCombustible}.htm?anyo_desde=${filtroAnyoDesde}&anyo_hasta=${filtroAnyoHasta}&page=${currentPage}`;
      console.log(`🔍 Scraping page ${currentPage}: ${url}`);

      await gotoWithRetries(page, url);
      await humanDelay();

      const listingsData: any[] = await page.evaluate(() => {
        const nextDataScript = document.getElementById("__NEXT_DATA__");
        if (nextDataScript) {
          try {
            const jsonData = JSON.parse(nextDataScript.textContent || "{}");
            return jsonData?.props?.pageProps?.classifieds?.classifiedList || [];
          } catch (error) {
            console.error("❌ Error parsing listings JSON:", error);
            return [];
          }
        }
        return [];
      });

      if (listingsData.length === 0) {
        paginasCon0AnunciosSeguidas++;
        console.log(`⚠️ Página ${currentPage} sin resultados. Contador consecutivo: ${paginasCon0AnunciosSeguidas}`);

        if (paginasCon0AnunciosSeguidas >= 5) {
          console.log(`🚫 Detectadas 5 páginas seguidas sin resultados. Cortando scraping para evitar bucle.`);
          break;
        }

        continue; // Pasamos a la siguiente página
      }

      let savedUrls = 0;

      for (const listing of listingsData) {
        const makeSlug = slugify(listing.make.name);
        const modelSlug = slugify(listing.model.name);
        const versionSlug = slugify(listing.version.name);
        const provinceSlug = slugify(listing.currentProvince.name);
        const engineDetailSlug = slugify(
          `${listing.engine.powerCv || ""} ${listing.version.name}`.trim()
        );

        const descriptiveSlug = `ocasion-${makeSlug}-${modelSlug}-${engineDetailSlug}-en-${provinceSlug}`.replace(/--+/g, "-");
        const generatedUrl = `https://www.coches.com/coches-segunda-mano/${descriptiveSlug}.htm?id=${listing.visibleId}&origin=${listing.currentProvince.name}`;

        const info = insertUrlStmt.run(
          generatedUrl,
          "Spain",
          listing.currentProvince.name
        );

        if (info.changes > 0) {
          savedUrls++;
        }
      }

        if (savedUrls > 0) {
          paginasCon0AnunciosSeguidas = 0;
        } else {
          paginasCon0AnunciosSeguidas++;
          console.log(`⚠️ Página ${currentPage} sin URLs nuevas. Contador: ${paginasCon0AnunciosSeguidas}`);
          if (paginasCon0AnunciosSeguidas >= 50) {
            console.log(`🚫 50 páginas seguidas sin nuevas URLs. Terminando scraping para evitar bucle infinito.`);
            break;
          }
        }

      console.log(`💾 Guardadas ${savedUrls} URLs nuevas de la página ${currentPage}`);
    }
  } catch (error: any) {
    console.error("🔥 Scraping failed:", error.message);
  } finally {
    await browser.close();
    db.close();
    console.log("🧹 Browser y DB cerrados");
  }
}

async function startScrapingWithRetries(maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await scrapeCochesCom();
      break;
    } catch (err: any) {
      attempt++;
      console.error(`❌ Error en intento ${attempt}: ${err.message}`);
      if (attempt < maxRetries) {
        console.log("🔁 Reiniciando scraper en 30s...");
        await new Promise((r) => setTimeout(r, 30000));
      } else {
        console.log("🚫 Demasiados errores. Abortando.");
      }
    }
  }
}

startScrapingWithRetries();
