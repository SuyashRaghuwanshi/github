const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

class CatFileCommand {
    constructor(flag, objectSHA) {
        this.flag = flag;
        this.objectSHA = objectSHA;
    }

    execute() {
        if (this.flag !== "-p") {
            throw new Error(`Unsupported flag ${this.flag}`);
        }

        const folder = this.objectSHA.slice(0, 2);
        const file = this.objectSHA.slice(2);
        const objectPath = path.join(process.cwd(), ".git", "objects", folder, file);

        if (!fs.existsSync(objectPath)) {
            throw new Error(`Not a valid object name ${this.objectSHA}`);
        }

        const compressed = fs.readFileSync(objectPath);
        const decompressed = zlib.inflateSync(compressed);

        // Find the first null byte which separates header and content
        const nullIndex = decompressed.indexOf(0);
        if (nullIndex === -1) {
            throw new Error("Invalid Git object format.");
        }

        const header = decompressed.slice(0, nullIndex).toString(); // e.g., "blob 12"
        const content = decompressed.slice(nullIndex + 1); // actual content

        process.stdout.write(content);
    }
}

module.exports = CatFileCommand;
