import * as fs from "fs";
import * as path from "path";

function searchDir(dir: string, pattern: RegExp) {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (e) {
        continue;
      }
      if (stat && stat.isDirectory()) {
        // Exclude giant folders
        if (
          file === "node_modules" ||
          file === ".next" ||
          file === ".git" ||
          file === ".vscode" ||
          file === "AppData" ||
          file === "Microsoft"
        ) {
          continue;
        }
        searchDir(filePath, pattern);
      } else {
        if (pattern.test(file)) {
          console.log("MATCH:", filePath);
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

console.log("Searching whole home folder for 100040...");
searchDir("c:\\Users\\itsud", /100040/);
console.log("Search finished.");
