import os
import subprocess
import shutil
import sys

# Paths
ROOT_DIR = os.getcwd() # c:\src\TerminalProjects\git\codecrafters-git-javascript
APP_MAIN = os.path.join(ROOT_DIR, "app", "main.js")
TEST_DIR = os.path.join(ROOT_DIR, "temp_git_test")

def run_command(args):
    # args is list of strings, e.g. ["init"]
    # We must set correct env or cwd.
    cmd = ["node", APP_MAIN] + args
    # Use shell=True for windows to avoid some path issues, or not. standard is better.
    # capture_output available in py3.7+
    result = subprocess.run(cmd, cwd=TEST_DIR, capture_output=True, text=True)
    return result

def fail(msg):
    print(f"❌ FAIL: {msg}")
    # clean up? maybe not so user can inspect.
    print("Exiting verification.")
    sys.exit(1)

def success(msg):
    print(f"✅ PASS: {msg}")

# 1. Setup
print("--- Setting up test environment ---")
if os.path.exists(TEST_DIR):
    shutil.rmtree(TEST_DIR)
os.makedirs(TEST_DIR)
print(f"Created {TEST_DIR}")

# 2. Test init
print("\n--- Testing init ---")
res = run_command(["init"])
if res.returncode != 0:
    fail(f"init command failed: {res.stderr} {res.stdout}")

if not os.path.exists(os.path.join(TEST_DIR, ".git")):
    fail(".git directory not created")
success("init command worked")

# 3. Test hash-object
print("\n--- Testing hash-object ---")
test_file = "test.txt"
with open(os.path.join(TEST_DIR, test_file), "w") as f:
    f.write("hello world")

res = run_command(["hash-object", "-w", test_file])
if res.returncode != 0:
    fail(f"hash-object failed: {res.stderr} {res.stdout}")

blob_hash = res.stdout.strip()
# It might print just the hash, or "header..." if debug is on? code says process.stdout.write(hash)
if len(blob_hash) != 40:
    fail(f"Invalid hash returned: '{blob_hash}'")
success(f"hash-object returned hash: {blob_hash}")

# 4. Test cat-file
print("\n--- Testing cat-file ---")
res = run_command(["cat-file", "-p", blob_hash])
if res.returncode != 0:
    fail(f"cat-file failed: {res.stderr} {res.stdout}")
if res.stdout.strip() != "hello world":
    fail(f"cat-file content mismatch. Expected 'hello world', got '{res.stdout.strip()}'")
success("cat-file verified content correctly")

# 5. Test write-tree
print("\n--- Testing write-tree ---")
res = run_command(["write-tree"])
if res.returncode != 0:
    fail(f"write-tree failed: {res.stderr} {res.stdout}")

tree_hash = res.stdout.strip()
if len(tree_hash) != 40:
    fail(f"Invalid tree hash: '{tree_hash}'")
success(f"write-tree returned hash: {tree_hash}")

# 6. Test ls-tree
print("\n--- Testing ls-tree ---")
# Note: implementation usually prints names line by line
res = run_command(["ls-tree", "--name-only", tree_hash])
if res.returncode != 0:
    fail(f"ls-tree failed: {res.stderr} {res.stdout}")

output = res.stdout.strip().split('\n')
# clean up whitespace
output = [o.strip() for o in output]
if "test.txt" not in output:
    fail(f"ls-tree did not list test.txt. Output: {output}")
success("ls-tree listed test.txt")

# 7. Test commit-tree
print("\n--- Testing commit-tree ---")
# args: commit-tree <tree> -p <parent> -m <msg>
parent_sha = blob_hash # dummy
msg = "test commit message"

res = run_command(["commit-tree", tree_hash, "-p", parent_sha, "-m", msg])
if res.returncode != 0:
    fail(f"commit-tree failed: {res.stderr} {res.stdout}")

commit_hash = res.stdout.strip()
if len(commit_hash) != 40:
    fail(f"Invalid commit hash: '{commit_hash}'")
success(f"commit-tree returned hash: {commit_hash}")

print("\n\n✅ ALL TESTS PASSED!")
