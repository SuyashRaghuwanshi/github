# Implementation Commands - Interview Questions

## Git Command Implementation Questions

This document contains hands-on, implementation-focused interview questions about building Git commands from scratch. These questions test your ability to explain **how to implement** specific features step-by-step.

---

## 1. `git init` Command

### Q: How would you implement `git init` from scratch?

**Step-by-step implementation:**

1. **Create the `.git` directory structure:**
   ```javascript
   fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
   ```

2. **Create essential subdirectories:**
   ```javascript
   fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
   fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });
   ```

3. **Initialize the HEAD file:**
   ```javascript
   fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
   ```

**Follow-up:** What other files/directories would a complete `git init` create?
- `.git/refs/heads/` - for branch references
- `.git/refs/tags/` - for tag references
- `.git/config` - repository configuration
- `.git/description` - repository description
- `.git/hooks/` - Git hooks directory

---

## 2. `git hash-object` Command

### Q: Walk me through implementing `git hash-object -w <file>`

**Implementation steps:**

1. **Read the file contents:**
   ```javascript
   const filePath = path.resolve(filepath);
   const fileContents = fs.readFileSync(filePath);
   ```

2. **Normalize line endings (cross-platform compatibility):**
   ```javascript
   let normalizedContents = fileContents;
   if (process.platform === 'win32') {
       const text = fileContents.toString('utf8');
       normalizedContents = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
   }
   ```

3. **Create the blob header:**
   ```javascript
   const fileLength = normalizedContents.length;
   const header = `blob ${fileLength}\0`;
   ```

4. **Concatenate header and content:**
   ```javascript
   const blob = Buffer.concat([Buffer.from(header), normalizedContents]);
   ```

5. **Generate SHA-1 hash:**
   ```javascript
   const hash = crypto.createHash('sha1').update(blob).digest('hex');
   ```

6. **Compress the blob:**
   ```javascript
   const compressedData = zlib.deflateSync(blob);
   ```

7. **Create directory structure and write file:**
   ```javascript
   const folder = hash.substring(0, 2);
   const file = hash.slice(2);
   const completeFolderPath = path.join(process.cwd(), '.git', 'objects', folder);
   fs.mkdirSync(completeFolderPath, { recursive: true });
   fs.writeFileSync(path.join(completeFolderPath, file), compressedData);
   ```

8. **Output the hash:**
   ```javascript
   process.stdout.write(hash);
   ```

**Follow-up questions:**
- Why do we normalize line endings?
- Why use Buffer instead of strings?
- What's the format of the blob header?
- Why compress the data?

---

## 3. `git cat-file -p` Command

### Q: How would you implement `git cat-file -p <sha>` to display object contents?

**Implementation steps:**

1. **Parse the SHA to get folder and file:**
   ```javascript
   const folder = sha.substring(0, 2);
   const file = sha.slice(2);
   ```

2. **Construct the object path:**
   ```javascript
   const objectPath = path.join(process.cwd(), '.git', 'objects', folder, file);
   ```

3. **Read the compressed object:**
   ```javascript
   const compressedData = fs.readFileSync(objectPath);
   ```

4. **Decompress the data:**
   ```javascript
   const decompressed = zlib.inflateSync(compressedData);
   ```

5. **Find the null byte separator:**
   ```javascript
   const nullIndex = decompressed.indexOf(0);
   ```

6. **Extract header and content:**
   ```javascript
   const header = decompressed.slice(0, nullIndex).toString();
   const content = decompressed.slice(nullIndex + 1);
   ```

7. **Output the content:**
   ```javascript
   process.stdout.write(content);
   ```

**Follow-up questions:**
- How would you parse the header to get object type and size?
- What if the object doesn't exist?
- How would you handle different object types (blob, tree, commit)?

---

## 4. `git ls-tree --name-only` Command

### Q: Implement `git ls-tree --name-only <tree-sha>` to list tree contents

**Implementation steps:**

1. **Read and decompress the tree object:**
   ```javascript
   const folder = sha.substring(0, 2);
   const file = sha.slice(2);
   const objectPath = path.join(process.cwd(), '.git', 'objects', folder, file);
   const compressed = fs.readFileSync(objectPath);
   const decompressed = zlib.inflateSync(compressed);
   ```

2. **Skip the header:**
   ```javascript
   const nullIndex = decompressed.indexOf(0);
   const treeData = decompressed.slice(nullIndex + 1);
   ```

3. **Parse tree entries:**
   ```javascript
   const entries = [];
   let offset = 0;
   
   while (offset < treeData.length) {
       // Find the null byte after the name
       const nullByteIndex = treeData.indexOf(0, offset);
       
       // Extract mode and name
       const modeAndName = treeData.slice(offset, nullByteIndex).toString();
       const [mode, name] = modeAndName.split(' ');
       
       // Skip the 20-byte SHA
       const sha = treeData.slice(nullByteIndex + 1, nullByteIndex + 21);
       
       entries.push({ mode, name, sha: sha.toString('hex') });
       
       // Move to next entry
       offset = nullByteIndex + 21;
   }
   ```

4. **Output names:**
   ```javascript
   entries.forEach(entry => console.log(entry.name));
   ```

**Follow-up questions:**
- Why is the SHA stored as 20 bytes instead of 40 hex characters?
- How would you handle the `--name-only` flag vs showing full details?
- What's the difference between mode `100644` and `40000`?

---

## 5. `git write-tree` Command

### Q: How would you implement `git write-tree` to create a tree object from the current directory?

**Implementation steps:**

1. **Create a recursive function to traverse directories:**
   ```javascript
   function recursiveCreateTree(basePath) {
       const dirContents = fs.readdirSync(basePath);
       const entries = [];
       
       for (const item of dirContents) {
           // Skip .git directory
           if (item === '.git') continue;
           
           const currentPath = path.join(basePath, item);
           const stat = fs.statSync(currentPath);
           
           if (stat.isDirectory()) {
               // Recursively create tree for subdirectory
               const sha = recursiveCreateTree(currentPath);
               if (sha) {
                   entries.push({
                       mode: '40000',
                       name: item,
                       sha: sha
                   });
               }
           } else if (stat.isFile()) {
               // Create blob for file
               const sha = createBlobForFile(currentPath);
               entries.push({
                   mode: '100644',
                   name: item,
                   sha: sha
               });
           }
       }
       
       // Sort entries by name
       entries.sort((a, b) => a.name.localeCompare(b.name));
       
       return createTreeObject(entries);
   }
   ```

2. **Create blob objects for files:**
   ```javascript
   function createBlobForFile(filePath) {
       const contents = fs.readFileSync(filePath);
       // Normalize, create header, hash, compress, store
       // ... (similar to hash-object implementation)
       return hash;
   }
   ```

3. **Build tree data from entries:**
   ```javascript
   function createTreeObject(entries) {
       if (entries.length === 0) return null;
       
       const treeDataParts = [];
       
       for (const entry of entries) {
           // Format: <mode> <name>\0<20-byte-sha>
           const modeAndName = `${entry.mode} ${entry.name}\0`;
           const shaBuffer = Buffer.from(entry.sha, 'hex');
           
           treeDataParts.push(Buffer.from(modeAndName));
           treeDataParts.push(shaBuffer);
       }
       
       const treeData = Buffer.concat(treeDataParts);
       
       // Create tree object
       const header = `tree ${treeData.length}\0`;
       const tree = Buffer.concat([Buffer.from(header), treeData]);
       
       // Hash and store
       const hash = crypto.createHash('sha1').update(tree).digest('hex');
       const compressed = zlib.deflateSync(tree);
       
       const folder = hash.substring(0, 2);
       const file = hash.slice(2);
       const folderPath = path.join(process.cwd(), '.git', 'objects', folder);
       fs.mkdirSync(folderPath, { recursive: true });
       fs.writeFileSync(path.join(folderPath, file), compressed);
       
       return hash;
   }
   ```

**Follow-up questions:**
- Why do we need to sort entries?
- How do you handle empty directories?
- What's the binary format of a tree entry?
- How would you optimize this for large directories?

---

## 6. `git commit-tree` Command

### Q: Implement `git commit-tree <tree-sha> -p <parent-sha> -m <message>`

**Implementation steps:**

1. **Parse command-line arguments:**
   ```javascript
   const treeSHA = process.argv[3];
   const parentSHA = process.argv[5];  // after -p flag
   const message = process.argv[7];     // after -m flag
   ```

2. **Get current timestamp:**
   ```javascript
   const timestamp = Math.floor(Date.now() / 1000);
   const timezone = '+0000';
   ```

3. **Build commit content:**
   ```javascript
   const commitContent = Buffer.concat([
       Buffer.from(`tree ${treeSHA}\n`),
       Buffer.from(`parent ${parentSHA}\n`),
       Buffer.from(`author Your Name <email@example.com> ${timestamp} ${timezone}\n`),
       Buffer.from(`committer Your Name <email@example.com> ${timestamp} ${timezone}\n`),
       Buffer.from(`\n`),
       Buffer.from(`${message}\n`)
   ]);
   ```

4. **Create commit object:**
   ```javascript
   const header = `commit ${commitContent.length}\0`;
   const commit = Buffer.concat([Buffer.from(header), commitContent]);
   ```

5. **Hash, compress, and store:**
   ```javascript
   const hash = crypto.createHash('sha1').update(commit).digest('hex');
   const compressed = zlib.deflateSync(commit);
   
   const folder = hash.substring(0, 2);
   const file = hash.slice(2);
   const folderPath = path.join(process.cwd(), '.git', 'objects', folder);
   fs.mkdirSync(folderPath, { recursive: true });
   fs.writeFileSync(path.join(folderPath, file), compressed);
   ```

6. **Output commit SHA:**
   ```javascript
   console.log(hash);
   ```

**Follow-up questions:**
- What's the format of a commit object?
- How would you handle multiple parent commits (merge commits)?
- Where would you get author/committer information in a real implementation?
- How would you implement the first commit (no parent)?

---

## 7. Command Pattern Architecture

### Q: How would you structure the command pattern for Git commands?

**Implementation:**

1. **Create a base command interface:**
   ```javascript
   class Command {
       execute() {
           throw new Error('execute() must be implemented');
       }
   }
   ```

2. **Implement specific commands:**
   ```javascript
   class HashObjectCommand extends Command {
       constructor(flag, filepath) {
           super();
           this.flag = flag;
           this.filepath = filepath;
       }
       
       execute() {
           // Implementation here
       }
   }
   ```

3. **Create a client to run commands:**
   ```javascript
   class GitClient {
       run(command) {
           return command.execute();
       }
   }
   ```

4. **Use in main.js:**
   ```javascript
   const command = new HashObjectCommand('-w', 'file.txt');
   const client = new GitClient();
   client.run(command);
   ```

**Follow-up questions:**
- What are the benefits of this pattern?
- How would you add logging/middleware?
- How would you handle command validation?

---

## 8. Binary Data Handling

### Q: How do you correctly handle binary data when working with Git objects?

**Key concepts:**

1. **Always use Buffers for binary data:**
   ```javascript
   const fileContents = fs.readFileSync(filePath);  // Returns Buffer
   const blob = Buffer.concat([headerBuffer, contentBuffer]);
   ```

2. **Convert SHA from hex to binary:**
   ```javascript
   const hexSHA = 'abc123...';  // 40 characters
   const binarySHA = Buffer.from(hexSHA, 'hex');  // 20 bytes
   ```

3. **Handle null bytes correctly:**
   ```javascript
   const header = `blob ${size}\0`;  // \0 is null byte
   const nullIndex = buffer.indexOf(0);  // Find null byte
   ```

4. **Avoid string encoding issues:**
   ```javascript
   // Wrong: might corrupt binary data
   const content = buffer.toString();
   
   // Right: keep as Buffer
   const content = buffer.slice(nullIndex + 1);
   process.stdout.write(content);  // Write Buffer directly
   ```

**Follow-up questions:**
- Why can't you use strings for Git objects?
- How do you debug binary data issues?
- What's the difference between `.toString('hex')` and `.toString('utf8')`?

---

## 9. Cross-Platform Compatibility

### Q: How do you handle cross-platform differences when implementing Git?

**Key issues and solutions:**

1. **Line ending normalization:**
   ```javascript
   if (process.platform === 'win32') {
       const text = buffer.toString('utf8');
       const normalized = text.replace(/\r\n/g, '\n');
       buffer = Buffer.from(normalized, 'utf8');
   }
   ```

2. **Path handling:**
   ```javascript
   // Use path.join() for cross-platform paths
   const objectPath = path.join('.git', 'objects', folder, file);
   
   // Use path.resolve() for absolute paths
   const absolutePath = path.resolve(relativePath);
   ```

3. **File permissions:**
   ```javascript
   // On Unix: check executable bit
   const mode = stat.mode & 0o100 ? '100755' : '100644';
   ```

**Follow-up questions:**
- Why does Git normalize line endings?
- How would you test cross-platform compatibility?
- What other platform differences exist?

---

## 10. Error Handling

### Q: How would you implement proper error handling for Git commands?

**Implementation:**

1. **File existence checks:**
   ```javascript
   if (!fs.existsSync(filePath)) {
       throw new Error(`could not open ${filePath} for reading: No such file or directory`);
   }
   ```

2. **Object validation:**
   ```javascript
   if (!/^[0-9a-f]{40}$/i.test(sha)) {
       throw new Error(`Invalid SHA: ${sha}`);
   }
   ```

3. **Graceful error messages:**
   ```javascript
   try {
       const object = readObject(sha);
   } catch (error) {
       console.error(`fatal: Not a valid object name ${sha}`);
       process.exit(1);
   }
   ```

4. **Input validation:**
   ```javascript
   if (!treeSHA || !message) {
       console.error('Usage: git commit-tree <tree> -m <message>');
       process.exit(1);
   }
   ```

**Follow-up questions:**
- What errors should be caught vs thrown?
- How would you implement custom error classes?
- How do you provide helpful error messages?

---

## 11. Performance Optimization

### Q: How would you optimize `git write-tree` for large repositories?

**Optimization strategies:**

1. **Stream large files instead of loading into memory:**
   ```javascript
   function hashLargeFile(filePath) {
       return new Promise((resolve, reject) => {
           const hash = crypto.createHash('sha1');
           const stream = fs.createReadStream(filePath);
           
           stream.on('data', chunk => hash.update(chunk));
           stream.on('end', () => resolve(hash.digest('hex')));
           stream.on('error', reject);
       });
   }
   ```

2. **Parallel processing of files:**
   ```javascript
   const promises = files.map(file => hashFile(file));
   const hashes = await Promise.all(promises);
   ```

3. **Cache already-hashed objects:**
   ```javascript
   const cache = new Map();
   
   function getOrCreateBlob(filePath) {
       if (cache.has(filePath)) {
           return cache.get(filePath);
       }
       const hash = createBlob(filePath);
       cache.set(filePath, hash);
       return hash;
   }
   ```

4. **Skip unchanged files (check mtime):**
   ```javascript
   const stat = fs.statSync(filePath);
   if (lastHash && stat.mtime < lastCommitTime) {
       return lastHash;  // File unchanged
   }
   ```

**Follow-up questions:**
- What are the memory implications of your implementation?
- How would you profile performance bottlenecks?
- What's the time complexity of your tree-building algorithm?

---

## 12. Testing Strategy

### Q: How would you test your Git implementation?

**Testing approaches:**

1. **Unit tests for individual commands:**
   ```javascript
   describe('HashObjectCommand', () => {
       it('should generate correct SHA for file', () => {
           const command = new HashObjectCommand(null, 'test.txt');
           const hash = command.execute();
           expect(hash).toBe('expected-sha');
       });
   });
   ```

2. **Integration tests comparing with real Git:**
   ```javascript
   test('hash-object matches git', () => {
       const myHash = runCommand('hash-object', 'file.txt');
       const gitHash = execSync('git hash-object file.txt').toString().trim();
       expect(myHash).toBe(gitHash);
   });
   ```

3. **Test edge cases:**
   ```javascript
   test('handles empty files', () => {
       fs.writeFileSync('empty.txt', '');
       const hash = hashObject('empty.txt');
       expect(hash).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
   });
   ```

4. **Cross-platform testing:**
   ```javascript
   test('normalizes CRLF on Windows', () => {
       const content = 'line1\r\nline2\r\n';
       const hash = hashContent(content);
       // Should match Unix hash
   });
   ```

**Follow-up questions:**
- How would you mock file system operations?
- What test coverage would you aim for?
- How would you test binary data handling?

---

## 13. Debugging Techniques

### Q: How would you debug a SHA mismatch between your implementation and Git?

**Debugging steps:**

1. **Compare file contents:**
   ```javascript
   const myContent = fs.readFileSync('file.txt');
   console.log('Content (hex):', myContent.toString('hex'));
   console.log('Content (utf8):', myContent.toString('utf8'));
   ```

2. **Inspect the blob structure:**
   ```javascript
   const header = `blob ${size}\0`;
   console.log('Header:', JSON.stringify(header));
   console.log('Header (hex):', Buffer.from(header).toString('hex'));
   ```

3. **Verify the complete blob:**
   ```javascript
   const blob = Buffer.concat([headerBuffer, contentBuffer]);
   console.log('Blob length:', blob.length);
   console.log('Blob (hex):', blob.toString('hex'));
   ```

4. **Compare with Git's object:**
   ```bash
   # Get Git's hash
   git hash-object file.txt
   
   # Decompress and inspect Git's object
   python -c "import zlib,sys; print(zlib.decompress(open('.git/objects/ab/cdef...', 'rb').read()))"
   ```

5. **Check for common issues:**
   ```javascript
   // Line ending issues?
   console.log('Has CRLF:', /\r\n/.test(content.toString()));
   
   // Encoding issues?
   console.log('Buffer length:', buffer.length);
   console.log('String length:', buffer.toString().length);
   ```

**Follow-up questions:**
- What tools would you use for binary data inspection?
- How would you automate this debugging process?
- What are common causes of SHA mismatches?

---

## 14. Advanced Features

### Q: How would you implement `git log` to show commit history?

**Implementation steps:**

1. **Read HEAD to get current commit:**
   ```javascript
   const headContent = fs.readFileSync('.git/HEAD', 'utf8').trim();
   const refPath = headContent.replace('ref: ', '');
   const commitSHA = fs.readFileSync(`.git/${refPath}`, 'utf8').trim();
   ```

2. **Read commit object:**
   ```javascript
   function readCommit(sha) {
       const object = readObject(sha);
       const lines = object.toString().split('\n');
       
       const commit = {
           tree: lines[0].split(' ')[1],
           parents: [],
           author: '',
           committer: '',
           message: ''
       };
       
       for (let i = 1; i < lines.length; i++) {
           if (lines[i].startsWith('parent ')) {
               commit.parents.push(lines[i].split(' ')[1]);
           } else if (lines[i].startsWith('author ')) {
               commit.author = lines[i].substring(7);
           } else if (lines[i].startsWith('committer ')) {
               commit.committer = lines[i].substring(10);
           } else if (lines[i] === '') {
               commit.message = lines.slice(i + 1).join('\n');
               break;
           }
       }
       
       return commit;
   }
   ```

3. **Traverse commit history:**
   ```javascript
   function showLog(commitSHA) {
       const visited = new Set();
       const queue = [commitSHA];
       
       while (queue.length > 0) {
           const sha = queue.shift();
           if (visited.has(sha)) continue;
           visited.add(sha);
           
           const commit = readCommit(sha);
           console.log(`commit ${sha}`);
           console.log(`Author: ${commit.author}`);
           console.log(`\n    ${commit.message}\n`);
           
           queue.push(...commit.parents);
       }
   }
   ```

**Follow-up questions:**
- How would you handle merge commits with multiple parents?
- How would you implement `git log --oneline`?
- How would you limit the number of commits shown?

---

## 15. Repository Structure

### Q: Explain the complete `.git` directory structure and how to implement it

**Directory structure:**

```
.git/
├── HEAD                    # Points to current branch
├── config                  # Repository configuration
├── description            # Repository description
├── objects/               # Object database
│   ├── ab/
│   │   └── cdef123...     # Compressed object
│   ├── pack/              # Pack files
│   └── info/              # Object info
├── refs/                  # References
│   ├── heads/             # Branch references
│   │   └── main           # Contains commit SHA
│   └── tags/              # Tag references
├── hooks/                 # Git hooks
└── index                  # Staging area
```

**Implementation of key components:**

1. **HEAD file:**
   ```javascript
   // Symbolic reference to current branch
   fs.writeFileSync('.git/HEAD', 'ref: refs/heads/main\n');
   ```

2. **Branch references:**
   ```javascript
   // Create a branch by writing commit SHA
   fs.writeFileSync('.git/refs/heads/main', `${commitSHA}\n`);
   ```

3. **Config file:**
   ```ini
   [core]
       repositoryformatversion = 0
       filemode = true
       bare = false
   ```

**Follow-up questions:**
- What's the difference between HEAD and refs/heads/main?
- How would you implement branch creation?
- What's stored in the index file?

---

## Summary

These implementation-focused questions cover:

- ✅ Step-by-step command implementations
- ✅ Binary data handling techniques
- ✅ Cross-platform compatibility
- ✅ Error handling strategies
- ✅ Performance optimization
- ✅ Testing approaches
- ✅ Debugging techniques
- ✅ Advanced Git features
- ✅ Repository structure

**Interview Preparation Tips:**

1. **Practice coding each command from scratch**
2. **Understand the binary format of Git objects**
3. **Be ready to explain Buffer vs String usage**
4. **Know how to debug SHA mismatches**
5. **Understand the complete object lifecycle (create, hash, compress, store)**
6. **Be able to explain the command pattern architecture**
7. **Practice explaining complex concepts simply**

Good luck! 🚀
