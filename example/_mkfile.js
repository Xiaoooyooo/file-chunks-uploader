const fs = require("fs");

// create a temp file which is 200MB
const size = 200 * 1024 * 1024;

// create a temp file which is 6G
// const size = 6 * 1024 * 1024 * 1024;

let total = 0;

const temp = "0".repeat(1024 * 1024);

while (total < size) {
  fs.writeFileSync("temp", temp, { flag: "a" });
  total += temp.length;
}
console.log("done");
