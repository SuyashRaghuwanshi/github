# Interview Questions - Build Your Own Git (JavaScript)

## Project Overview Questions

### 1. Can you describe what this project is about?
**Answer:** This is a Git implementation built from scratch in JavaScript as part of the CodeCrafters "Build Your Own Git" challenge. The project implements core Git functionality including:
- Repository initialization
- Object storage (blobs, trees, commits)
- File hashing and content-addressable storage
- Tree operations
- Commit creation

The implementation helps understand Git's internal workings, including the `.git` directory structure, Git objects, compression, and SHA-1 hashing.

### 2. What motivated you to build this project?
**Answer:** I wanted to deeply understand how Git works under the hood. By implementing Git's core features from scratch, I learned about:
- Content-addressable storage systems
- How Git uses SHA-1 hashing for integrity
- The structure of Git objects (blobs, trees, commits)
- Compression using zlib
- File system operations and recursive tree traversal

---

## Technical Architecture Questions

### 3. How is your Git implementation structured?
**Answer:** The project follows a command pattern architecture:
- **Entry Point:** `app/main.js` - handles command-line arguments and routes to appropriate handlers
- **Commands Directory:** `app/git/commands/` - contains individual command implementations
  - `cat-file.js` - reads and displays Git objects
  - `hash-object.js` - creates blob objects from files
  - `ls-tree.js` - lists contents of tree objects
  - `write-tree.js` - creates tree objects from directory structure
  - `commit-tree.js` - creates commit objects
- **Client:** `client.js` - executes commands using a simple command pattern

### 4. Explain the Command Pattern you used in this project.
**Answer:** I implemented a simple command pattern where:
1. Each Git command is encapsulated in its own class (e.g., `CatFileCommand`, `HashObjectCommand`)
2. Each command class has a constructor that accepts necessary parameters
3. Each command implements an `execute()` method that performs the operation
4. The `GitClient` class has a `run()` method that takes a command and executes it

This pattern provides:
- **Separation of concerns** - each command is isolated
- **Extensibility** - easy to add new commands
- **Testability** - commands can be tested independently

---

## Git Internals Questions

### 5. How does Git store objects? Explain your implementation.
**Answer:** Git uses a content-addressable storage system:

1. **Object Format:** `<type> <size>\0<content>`
   - Type: blob, tree, or commit
   - Size: content length in bytes
   - Null byte separator
   - Actual content

2. **Hashing:** SHA-1 hash of the entire object (header + content)

3. **Storage Location:** `.git/objects/<first-2-chars>/<remaining-38-chars>`
   - Example: hash `abc123...` → `.git/objects/ab/c123...`

4. **Compression:** Objects are compressed using zlib deflate before storage

In my implementation (from `hash-object.js`):
```javascript
const header = `blob ${fileLength}\0`;
const blob = Buffer.concat([Buffer.from(header), normalizedContents]);
const hash = crypto.createHash('sha1').update(blob).digest('hex');
const compressedData = zlib.deflateSync(blob);
```

### 6. What is a blob object and how did you implement it?
**Answer:** A blob (Binary Large Object) stores file contents without any metadata like filename or permissions.

**Implementation in `hash-object.js`:**
1. Read file contents into a buffer
2. Normalize line endings (CRLF → LF on Windows)
3. Create header: `blob <size>\0`
4. Concatenate header + content
5. Generate SHA-1 hash
6. Compress with zlib
7. Store in `.git/objects/<folder>/<file>`

The `-w` flag determines whether to write to disk or just compute the hash.

### 7. Explain tree objects and your implementation.
**Answer:** Tree objects represent directory structures. Each entry contains:
- Mode (file permissions: `100644` for files, `40000` for directories)
- Filename
- SHA-1 hash of the object

**My implementation in `write-tree.js`:**
1. Recursively traverse directory structure
2. For each file: create blob object, get SHA
3. For each subdirectory: recursively create tree, get SHA
4. Build tree data: `<mode> <name>\0<20-byte-sha>` for each entry
5. Create tree object: `tree <size>\0<tree-data>`
6. Hash, compress, and store

Key challenge: Handling empty directories (they return `null` and are skipped).

### 8. How does the `cat-file` command work?
**Answer:** The `cat-file -p` command displays the contents of a Git object:

**Implementation steps:**
1. Extract folder (first 2 chars) and file (remaining chars) from SHA
2. Locate object: `.git/objects/<folder>/<file>`
3. Read compressed file
4. Decompress using `zlib.inflateSync()`
5. Find null byte separator between header and content
6. Extract content after null byte
7. Write to stdout

```javascript
const nullIndex = decompressed.indexOf(0);
const content = decompressed.slice(nullIndex + 1);
process.stdout.write(content);
```

### 9. What is a commit object? How did you implement it?
**Answer:** A commit object stores:
- Tree SHA (snapshot of directory)
- Parent commit SHA (for history)
- Author information
- Committer information
- Timestamp
- Commit message

**Implementation in `commit-tree.js`:**
```javascript
const commitContentBuffer = Buffer.concat([
    Buffer.from(`tree ${this.treeSHA}\n`),
    Buffer.from(`parent ${this.parentSHA}\n`),
    Buffer.from(`author Name <email> ${Date.now()}+0000\n`),
    Buffer.from(`committer Name <email> ${Date.now()}+0000\n\n`),
    Buffer.from(`${this.message}\n`),
]);
```

Then create header, hash, compress, and store like other objects.

---

## Implementation Challenges

### 10. What was the most challenging part of this project?
**Answer:** The `write-tree` command was most challenging because:

1. **Recursive tree building** - Had to traverse directories recursively while maintaining correct structure
2. **Binary data handling** - Tree objects use binary format with null bytes and 20-byte SHA hashes
3. **Correct formatting** - Each entry is `<mode> <basename>\0<20-byte-sha-in-binary>`
4. **Edge cases** - Handling empty directories, ignoring `.git` folder
5. **Buffer manipulation** - Using `Buffer.concat()` to build tree data correctly

The key was understanding that SHA hashes in tree objects are stored as raw 20-byte binary, not 40-character hex strings.

### 11. How did you handle cross-platform compatibility (Windows vs Unix)?
**Answer:** Main issue: Line ending differences (CRLF on Windows vs LF on Unix)

**Solution in `hash-object.js`:**
```javascript
if (process.platform === 'win32') {
    const text = fileContents.toString('utf8');
    normalizedContents = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
}
```

This ensures consistent SHA-1 hashes across platforms by normalizing to LF before hashing.

### 12. How did you debug issues with object hashing?
**Answer:** I used several debugging techniques:

1. **Hex dumps** - Inspected binary data:
```javascript
console.log("Blob (hex):", blob.toString("hex"));
```

2. **Header verification** - Ensured correct format:
```javascript
console.log("Header:", JSON.stringify(header));
```

3. **Comparison with real Git** - Used actual Git commands to compare:
```bash
git hash-object file.txt
./your_program.sh hash-object file.txt
```

4. **Decompression testing** - Verified stored objects could be read back correctly

---

## Node.js & JavaScript Questions

### 13. Why did you use Buffers instead of strings?
**Answer:** Buffers are essential because:

1. **Binary data** - Git objects contain binary data (null bytes, raw SHA hashes)
2. **Encoding control** - Prevents automatic encoding/decoding issues
3. **Performance** - More efficient for binary operations
4. **Compatibility** - Works with compression libraries (zlib)

Example: Tree objects store 20-byte binary SHA, not 40-char hex string.

### 14. Explain your use of the crypto module.
**Answer:** Used `crypto` for SHA-1 hashing:

```javascript
const crypto = require("crypto");
const hash = crypto.createHash('sha1').update(blob).digest('hex');
```

- `createHash('sha1')` - Creates SHA-1 hasher
- `.update(blob)` - Feeds data (can be called multiple times)
- `.digest('hex')` - Returns hash as hexadecimal string

SHA-1 is used for content-addressable storage - same content always produces same hash.

### 15. How does zlib compression work in your implementation?
**Answer:** Used `zlib` for compression/decompression:

**Compression (writing objects):**
```javascript
const zlib = require("zlib");
const compressedData = zlib.deflateSync(blob);
fs.writeFileSync(path, compressedData);
```

**Decompression (reading objects):**
```javascript
const compressed = fs.readFileSync(objectPath);
const decompressed = zlib.inflateSync(compressed);
```

Git uses zlib to reduce storage space. All objects in `.git/objects` are compressed.

### 16. How did you handle command-line arguments?
**Answer:** Used Node.js `process.argv`:

```javascript
const command = process.argv[2];  // First argument
const flag = process.argv[3];     // Second argument
const value = process.argv[4];    // Third argument
```

**Flexible parsing example:**
```javascript
let flag = process.argv[3];
let filePath = process.argv[4];
if (!filePath) {
    filePath = flag;  // No flag provided, arg is filepath
    flag = null;
}
```

This handles both `hash-object -w file.txt` and `hash-object file.txt`.

---

## File System Operations

### 17. How does the `init` command work?
**Answer:** Creates Git repository structure:

```javascript
function createGitDirectory() {
    fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
    fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
}
```

Creates:
- `.git/` - Main directory
- `.git/objects/` - Object storage
- `.git/refs/` - References (branches, tags)
- `.git/HEAD` - Points to current branch

### 18. How did you implement recursive directory traversal?
**Answer:** In `write-tree.js`, used recursive function:

```javascript
function recursiveCreateTree(basePath) {
    const dirContents = fs.readdirSync(basePath);
    const result = [];
    
    for (const dirContent of dirContents) {
        if (dirContent.includes(".git")) continue;  // Skip .git
        
        const currentPath = path.join(basePath, dirContent);
        const stat = fs.statSync(currentPath);
        
        if (stat.isDirectory()) {
            const sha = recursiveCreateTree(currentPath);  // Recurse
            if (sha) result.push({ mode: "40000", basename, sha });
        } else if (stat.isFile()) {
            const sha = WriteFileBlob(currentPath);
            result.push({ mode: "100644", basename, sha });
        }
    }
    // Build tree object from result...
}
```

Key: Check if directory/file, recurse for directories, create blobs for files.

---

## Testing & Debugging

### 19. How did you test your implementation?
**Answer:** Multiple testing approaches:

1. **CodeCrafters automated tests** - Platform runs test suite
2. **Manual testing** - Created test files and directories
3. **Comparison with Git** - Verified output matches real Git:
```bash
# My implementation
./your_program.sh hash-object file.txt

# Real Git
git hash-object file.txt
```
4. **Edge cases** - Empty files, binary files, nested directories
5. **Cross-platform** - Tested on Windows (CRLF handling)

### 20. What would you do differently if you rebuilt this?
**Answer:** Improvements I'd make:

1. **Better error handling** - More descriptive error messages
2. **TypeScript** - Type safety for object structures
3. **Unit tests** - Comprehensive test suite with Jest
4. **Refactoring** - Extract common object operations (compress, hash, store)
5. **Support more commands** - `clone`, `fetch`, `push`
6. **Better abstraction** - Create `GitObject` base class for blob/tree/commit
7. **Logging** - Add debug logging option
8. **Validation** - Validate SHA formats, object integrity

---

## Advanced Git Concepts

### 21. How would you implement `git clone`?
**Answer:** Clone involves:

1. **HTTP/Git protocol** - Fetch pack files from remote
2. **Pack file parsing** - Decompress and extract objects
3. **Reference discovery** - Get remote branches/tags
4. **Object unpacking** - Store objects in `.git/objects`
5. **Checkout** - Create working directory from HEAD tree

Challenges: Network protocols, pack file format (delta compression), reference handling.

### 22. What are pack files and why does Git use them?
**Answer:** Pack files are compressed archives of multiple objects.

**Why:**
- **Efficiency** - Stores deltas (differences) instead of full objects
- **Network** - Faster clone/fetch operations
- **Storage** - Reduces disk usage

**Format:**
- Multiple objects in single file
- Delta compression (stores differences)
- Index file for quick lookup

My implementation doesn't use pack files yet - stores loose objects only.

### 23. How does Git ensure data integrity?
**Answer:** Multiple mechanisms:

1. **SHA-1 hashing** - Content-addressable storage
   - Any corruption changes hash
   - Can detect bit flips, tampering
   
2. **Immutable objects** - Once created, never modified
   
3. **Referential integrity** - Commits reference trees, trees reference blobs
   
4. **Checksum verification** - Can verify entire repository

In my implementation, SHA-1 ensures that object content matches its name.

### 24. What's the difference between Git's object model and a traditional file system?
**Answer:**

| Traditional FS | Git Object Model |
|----------------|------------------|
| Files have names | Objects identified by content hash |
| Mutable files | Immutable objects |
| Hierarchical paths | DAG (Directed Acyclic Graph) |
| Single version | Full history preserved |
| Metadata in filesystem | Metadata in objects |

Git's content-addressable storage means identical content = identical hash = stored once.

---

## Problem-Solving Questions

### 25. How would you debug a SHA mismatch error?
**Answer:** Systematic approach:

1. **Verify input** - Check file contents, line endings
2. **Inspect header** - Ensure correct format: `blob <size>\0`
3. **Check size calculation** - Verify byte count is correct
4. **Hex dump** - Compare binary data:
```javascript
console.log(blob.toString('hex'));
```
5. **Compare with Git** - Use real Git to get expected hash
6. **Platform issues** - Check CRLF vs LF
7. **Buffer encoding** - Ensure no unwanted encoding conversions

### 26. If `ls-tree` isn't working, how would you debug it?
**Answer:**

1. **Verify object exists** - Check `.git/objects/<folder>/<file>`
2. **Decompress manually** - Ensure object isn't corrupted
3. **Inspect raw data** - Look at decompressed bytes
4. **Parse header** - Verify it's actually a tree object
5. **Check parsing logic** - Tree format is `<mode> <name>\0<20-byte-sha>`
6. **Test with known tree** - Use Git to create tree, inspect with my tool

Current issue in my code: Line 30 uses `.split()` on string, but should parse binary format.

---

## Behavioral Questions

### 27. What did you learn from this project?
**Answer:**

**Technical:**
- Git internals (objects, hashing, compression)
- Binary data handling in Node.js
- Content-addressable storage systems
- Recursive algorithms for tree structures

**Soft skills:**
- Reading documentation (Git internals docs)
- Debugging complex binary formats
- Systematic problem-solving
- Attention to detail (one wrong byte breaks everything)

### 28. How did you approach learning Git internals?
**Answer:**

1. **Documentation** - Read Git Book, Git internals documentation
2. **Experimentation** - Used `git cat-file`, `git hash-object` to explore
3. **Incremental building** - Started with simple commands (init, hash-object)
4. **Debugging** - Compared my output with real Git
5. **Community** - CodeCrafters Discord, Stack Overflow

### 29. Describe a bug you encountered and how you fixed it.
**Answer:** 

**Bug:** `hash-object` produced different SHA than Git on Windows.

**Investigation:**
1. Compared file contents - looked identical
2. Hex dump revealed CRLF (`\r\n`) vs LF (`\n`)
3. Git normalizes to LF before hashing

**Solution:**
```javascript
if (process.platform === 'win32') {
    const text = fileContents.toString('utf8');
    normalizedContents = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
}
```

**Lesson:** Platform differences matter; always consider cross-platform compatibility.

---

## Future Enhancements

### 30. What features would you add next?
**Answer:**

**High Priority:**
1. **Clone command** - Fetch from remote repositories
2. **Commit history** - `git log` functionality
3. **Branching** - Create and switch branches
4. **Merge** - Combine branches

**Medium Priority:**
5. **Diff** - Show changes between commits
6. **Status** - Show working directory state
7. **Pack files** - Efficient storage

**Low Priority:**
8. **Rebase** - Rewrite history
9. **Cherry-pick** - Apply specific commits
10. **Submodules** - Nested repositories

Each builds on the foundation I've created with object storage and tree manipulation.

---

## Code Quality Questions

### 31. How would you improve error handling in this project?
**Answer:**

**Current issues:**
- Generic error messages
- No validation of inputs
- Silent failures in some cases

**Improvements:**
1. **Custom error classes:**
```javascript
class GitObjectNotFoundError extends Error {
    constructor(sha) {
        super(`Object ${sha} not found in repository`);
        this.name = 'GitObjectNotFoundError';
    }
}
```

2. **Input validation:**
```javascript
if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new InvalidSHAError(sha);
}
```

3. **Graceful degradation** - Provide helpful suggestions
4. **Logging levels** - Debug, info, error

### 32. How would you make this code more maintainable?
**Answer:**

1. **Extract common operations:**
```javascript
class GitObjectStore {
    static save(hash, data) { /* compress and save */ }
    static load(hash) { /* load and decompress */ }
    static hash(type, content) { /* create hash */ }
}
```

2. **Configuration management:**
```javascript
const config = {
    gitDir: path.join(process.cwd(), '.git'),
    objectsDir: path.join(process.cwd(), '.git', 'objects')
};
```

3. **Constants:**
```javascript
const FILE_MODE = '100644';
const DIR_MODE = '40000';
```

4. **Documentation** - JSDoc comments
5. **Tests** - Unit tests for each command

---

## Performance Questions

### 33. What are the performance characteristics of your implementation?
**Answer:**

**Time Complexity:**
- `hash-object`: O(n) where n = file size
- `write-tree`: O(m) where m = total files in directory tree
- `cat-file`: O(n) where n = object size
- `ls-tree`: O(k) where k = entries in tree

**Space Complexity:**
- Stores full objects (no delta compression)
- Each object compressed with zlib (~50-70% reduction)

**Bottlenecks:**
- File I/O operations
- Compression/decompression
- Recursive directory traversal

### 34. How could you optimize the `write-tree` command?
**Answer:**

**Current issues:**
- Reads entire files into memory
- No caching of already-hashed objects
- Synchronous file operations

**Optimizations:**
1. **Streaming for large files:**
```javascript
const stream = fs.createReadStream(filePath);
const hash = crypto.createHash('sha1');
stream.on('data', chunk => hash.update(chunk));
```

2. **Parallel processing:**
```javascript
const promises = dirContents.map(async (item) => {
    // Process items concurrently
});
await Promise.all(promises);
```

3. **Caching:**
```javascript
const cache = new Map();
if (cache.has(filePath)) return cache.get(filePath);
```

4. **Skip unchanged files** - Check modification time

---

## System Design Questions

### 35. How would you design a distributed version control system?
**Answer:**

**Key components:**

1. **Object storage** - Content-addressable (like my implementation)
2. **References** - Branches, tags, HEAD
3. **Network protocol** - HTTP/SSH for remote operations
4. **Conflict resolution** - Merge strategies
5. **Authentication** - User permissions
6. **Synchronization** - Push/pull/fetch

**Architecture:**
```
Client (Local)          Server (Remote)
├── Working Dir         ├── Bare Repository
├── Staging Area        ├── Object Database
├── Local Repo          └── References
└── Remote Refs
```

**Challenges:**
- Network efficiency (pack files, delta compression)
- Conflict resolution (3-way merge)
- Scalability (large repos, many users)
- Security (signed commits, access control)

---

## Conclusion

These questions cover:
- ✅ Project overview and motivation
- ✅ Technical architecture and design patterns
- ✅ Git internals (objects, hashing, compression)
- ✅ Implementation challenges and solutions
- ✅ Node.js and JavaScript specifics
- ✅ File system operations
- ✅ Testing and debugging strategies
- ✅ Advanced Git concepts
- ✅ Problem-solving approaches
- ✅ Code quality and maintainability
- ✅ Performance optimization
- ✅ System design thinking

**Preparation Tips:**
1. Review your code before the interview
2. Be ready to explain any line of code
3. Prepare examples of challenges you faced
4. Think about improvements and next steps
5. Practice explaining technical concepts simply
6. Be honest about what you don't know
7. Show enthusiasm for learning

Good luck with your interview! 🚀
