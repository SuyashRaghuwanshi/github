const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

class HashObjectCommand {
    constructor(flag, filepath) {
        this.flag = flag;
        this.filepath = filepath;
    }

    execute() {
        const filePath = path.resolve(this.filepath);
        if (!fs.existsSync(filePath)) {
            throw new Error(`could not open ${filePath} for reading: No such file or directory`);
        }
        const fileContents = fs.readFileSync(filePath); // buffer
        let normalizedContents = fileContents;

        // Normalize CRLF to LF
        if (process.platform === 'win32') {
            const text = fileContents.toString('utf8');
            normalizedContents = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
        }

        const fileLength = normalizedContents.length;
        const header = `blob ${fileLength}\0`;
        const blob = Buffer.concat([Buffer.from(header), normalizedContents]);

        const hash = crypto.createHash('sha1').update(blob).digest('hex');

        // Optional: Debugging
        // console.log("File length:", fileLength);
        // console.log("Header:", JSON.stringify(header));
        // console.log("Blob (hex):", blob.toString("hex"));

        if (this.flag === 'w') {
            const folder = hash.substring(0, 2);
            const file = hash.slice(2);
            const completeFolderPath = path.join(process.cwd(), '.git', 'objects', folder);
            if (!fs.existsSync(completeFolderPath)) {
                fs.mkdirSync(completeFolderPath, { recursive: true });
            }
            const compressedData = zlib.deflateSync(blob);
            fs.writeFileSync(path.join(completeFolderPath, file), compressedData);
        }

        process.stdout.write(hash);
    }
}

module.exports = HashObjectCommand;
