# Git Command Reference

Use the following commands to test your Git implementation.

## 1. Initialize Repository
Initialize the `.git` directory structure.
```bash
node app/main.js init
```

## 2. Hash an Object (Create a Blob)
Hash a file and store it in `.git/objects`.

**Step 1:** Create a sample file.
```bash
echo "Hello, World!" > test.txt
```

**Step 2:** Hash the file.
```bash
node app/main.js hash-object -w test.txt
```
*   **Output:** A SHA hash (e.g., `8ab686eafeb1f44702738c8b0f24f2567c36da6d`).
*   **Note:** Copy this hash for the next step.

## 3. Read an Object (Cat File)
Read the content of a stored object using its hash.

```bash
node app/main.js cat-file -p <hash>
```
*   **Replace `<hash>`** with the hash from step 2.

**Example:**
```bash
node app/main.js cat-file -p 8ab686eafeb1f44702738c8b0f24f2567c36da6d
```

## 4. Write Tree
Create a tree object from the current directory and get its hash.

```bash
node app/main.js write-tree
```
*   **Output:** A SHA hash representing the tree (e.g., `tree_sha`).
*   **Note:** Copy this hash for the next step.

## 5. List Tree (LS Tree)
List the files inside a tree object.

```bash
node app/main.js ls-tree --name-only <tree_sha>
```
*   **Replace `<tree_sha>`** with the hash from step 4.

**Example:**
```bash
node app/main.js ls-tree --name-only <your_tree_sha_here>
```
