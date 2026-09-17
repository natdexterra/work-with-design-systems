/**
 * tests/run.js — the fixed set. `npm test`.
 *
 * Runs every use_figma script named in an answer key against every fixture in
 * tests/fixtures/, compares the result to tests/expected/<fixture>.json, and
 * prints a fixture x check grid with one score line. Exits non-zero on any FAIL.
 *
 * A check is a selector plus an expectation, both written in the key:
 *   path   dotted path into the script's return value ("contrast.lightPairs",
 *          "1.variables" — a numeric segment indexes an array)
 *   where  the value at `path` is an array; pick the ONE element whose fields
 *          all match. Zero or several matches is a FAIL, not a pick.
 *   count  the value at `path` is an array; `expect` is how many elements match.
 *   expect compared as a subset: every key in `expect` must match the result
 *          recursively, extra keys in the result are ignored, and the sentinel
 *          "__absent__" asserts the key is not there at all.
 *
 * Run it before and after every script edit. A red row is the statement of what
 * a fix must change; a green row that goes red is the regression.
 */

const fs = require("fs");
const path = require("path");
const { runScript, loadFixture } = require("./run-script.js");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_DIR = path.join(__dirname, "fixtures");
const EXPECTED_DIR = path.join(__dirname, "expected");

const ABSENT = "__absent__";

function select(value, dottedPath) {
  if (!dottedPath) return value;
  let current = value;
  for (const segment of dottedPath.split(".")) {
    if (current === undefined || current === null) return undefined;
    current = Array.isArray(current) ? current[Number(segment)] : current[segment];
  }
  return current;
}

function matchesFilter(item, filter) {
  return Object.entries(filter).every(([key, want]) => item && item[key] === want);
}

// Subset comparison: `expect` describes only what the check is about.
function subsetMatch(actual, expect) {
  if (expect === ABSENT) return actual === undefined;
  if (expect === null || typeof expect !== "object") return actual === expect;
  if (Array.isArray(expect)) {
    if (!Array.isArray(actual) || actual.length !== expect.length) return false;
    return expect.every((item, i) => subsetMatch(actual[i], item));
  }
  if (actual === null || typeof actual !== "object") return false;
  return Object.entries(expect).every(([key, want]) => subsetMatch(actual[key], want));
}

function evaluate(result, check) {
  const target = select(result, check.path);

  if (check.count) {
    if (!Array.isArray(target)) {
      return { pass: false, detail: `path "${check.path}" is not an array` };
    }
    const n = target.filter((item) => matchesFilter(item, check.count)).length;
    return {
      pass: n === check.expect,
      detail: n === check.expect ? "" : `matched ${n}, expected ${check.expect}`,
    };
  }

  if (check.where) {
    if (!Array.isArray(target)) {
      return { pass: false, detail: `path "${check.path}" is not an array` };
    }
    const hits = target.filter((item) => matchesFilter(item, check.where));
    if (hits.length !== 1) {
      return { pass: false, detail: `${hits.length} entries match the selector, need exactly 1` };
    }
    const pass = subsetMatch(hits[0], check.expect);
    return { pass, detail: pass ? "" : `got ${JSON.stringify(hits[0])}` };
  }

  const pass = subsetMatch(target, check.expect);
  return { pass, detail: pass ? "" : `got ${JSON.stringify(target)}` };
}

async function main() {
  const started = Date.now();
  const fixtures = fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  // rowKey -> { script, check, basis, cells: { fixture: "PASS" | "FAIL" | "-" } }
  const rows = new Map();
  const failures = [];
  let total = 0;
  let passed = 0;

  for (const fixtureFile of fixtures) {
    const name = path.basename(fixtureFile, ".json");
    const keyPath = path.join(EXPECTED_DIR, `${name}.json`);
    if (!fs.existsSync(keyPath)) {
      throw new Error(`fixture ${fixtureFile} has no answer key at ${keyPath}`);
    }
    const fixture = loadFixture(path.join(FIXTURE_DIR, fixtureFile));
    const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));

    for (const [scriptRelPath, spec] of Object.entries(key.scripts)) {
      let result = null;
      let crash = null;
      try {
        result = await runScript(path.join(ROOT, scriptRelPath), fixture, spec.args || {});
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch (_) {
            /* a script that returns a plain string is compared as one */
          }
        }
      } catch (err) {
        crash = err;
      }

      for (const check of spec.checks) {
        const rowKey = `${scriptRelPath}::${check.id}`;
        if (!rows.has(rowKey)) {
          rows.set(rowKey, { script: scriptRelPath, check: check.id, cells: {} });
        }
        total++;
        let verdict;
        if (crash) {
          verdict = { pass: false, detail: `script threw: ${crash.message}` };
        } else {
          verdict = evaluate(result, check);
        }
        if (verdict.pass) passed++;
        else failures.push({ fixture: name, row: rowKey, detail: verdict.detail });
        rows.get(rowKey).cells[name] = verdict.pass ? "PASS" : "FAIL";
      }
    }
  }

  // ---- grid ----
  const scriptWidth = Math.max(...[...rows.values()].map((r) => r.script.length), 6);
  const checkWidth = Math.max(...[...rows.values()].map((r) => r.check.length), 5);
  const colWidth = Math.max(...fixtures.map((f) => f.length - 5), 4);
  const pad = (s, n) => String(s).padEnd(n);

  console.log("");
  console.log(
    `${pad("script", scriptWidth)}  ${pad("check", checkWidth)}  ${fixtures
      .map((f) => pad(path.basename(f, ".json"), colWidth))
      .join("  ")}`
  );
  console.log("-".repeat(scriptWidth + checkWidth + colWidth * fixtures.length + 4 + 2 * fixtures.length));
  for (const row of rows.values()) {
    const cells = fixtures
      .map((f) => pad(row.cells[path.basename(f, ".json")] || "-", colWidth))
      .join("  ");
    console.log(`${pad(row.script, scriptWidth)}  ${pad(row.check, checkWidth)}  ${cells}`);
  }

  if (failures.length) {
    console.log("");
    for (const f of failures) {
      console.log(`FAIL ${f.row} [${f.fixture}] ${f.detail}`);
    }
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(2);
  console.log("");
  console.log(`${passed}/${total} checks passed  (${seconds}s)`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
