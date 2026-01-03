const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { trace } = require('console');
class LSTreeCommand {
    constructor(flag, sha) {
        this.flag = flag;
        this.sha = sha;
    }
    execute() {
        const flag = this.flag;
        const sha = this.sha;

        const folder = sha.slice(0, 2);
        const file = sha.slice(2);

        const folderPath = path.join(process.cwd(), '.git', 'objects', folder);
        const filepath = path.join(folderPath, file);

        if (!fs.existsSync(folderPath)) {
            throw new Error(`Not a valid object name ${sha}`);
        }
        if (!fs.existsSync(filepath)) {
            throw new Error(`Not a valid object name ${sha}`);
        }
        const fileContents = fs.readFileSync(filepath);
        const outputBuffer = zlib.inflateSync(fileContents);
        const output = outputBuffer.toString();

        const headerEnd = outputBuffer.indexOf(0);
        let cursor = headerEnd + 1;
        const names = [];

        while (cursor < outputBuffer.length) {
            const modeEnd = outputBuffer.indexOf(' ', cursor);
            if (modeEnd === -1) break;
            const nameEnd = outputBuffer.indexOf(0, modeEnd);
            if (nameEnd === -1) break;

            const name = outputBuffer.subarray(modeEnd + 1, nameEnd).toString();
            names.push(name);

            // Move cursor past NULL + SHA(20 bytes)
            cursor = nameEnd + 1 + 20;
        }
        names.forEach((name) => process.stdout.write(`${name}\n`));
    }
}
module.exports = LSTreeCommand;