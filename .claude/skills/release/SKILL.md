---
name: release
description: Create a new version tag with release message and push to trigger GoReleaser. Use when user wants to release, tag, bump version, or publish a new version.
allowed-tools: Bash, Read, Grep
---

# Release

Create and push a new version tag to trigger the GoReleaser CI pipeline.

## Instructions

1. **Check current state**
   - Run `git status` to ensure working directory is clean
   - If there are uncommitted changes, stop and ask the user to commit first

2. **Get the latest tag**
   - Run `git tag -l --sort=-v:refname | head -1` to get the current version
   - Current versioning follows semver: `v0.0.X`

3. **Determine next version**
   - Ask the user what type of bump they want (patch/minor/major) or if they want a specific version
   - Default to patch bump (e.g., v0.0.5 -> v0.0.6)

4. **Gather release notes**
   - Run `git log $(git describe --tags --abbrev=0)..HEAD --oneline` to see commits since last tag
   - Summarize the changes for the tag message

5. **Create and push the tag**
   - Create annotated tag: `git tag -a vX.Y.Z -m "Release message"`
   - Push the tag: `git push origin vX.Y.Z`

6. **Confirm success**
   - Provide the GitHub releases URL: https://github.com/lch88/logbro/releases

## Tag Message Format

Use a concise summary of changes. Examples:
- Single change: `Fix homebrew cask configuration`
- Multiple changes: `Add dark mode support, fix memory leak, improve performance`

## Example

```bash
# Check status
git status

# Get current version
git tag -l --sort=-v:refname | head -1
# Output: v0.0.5

# See changes since last tag
git log v0.0.5..HEAD --oneline

# Create tag
git tag -a v0.0.6 -m "Move main.go to cmd package, update goreleaser config"

# Push tag
git push origin v0.0.6
```
