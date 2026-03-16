# Version Update Checklist

## Files Requiring Updates

### 1. Main Version Files

- [ ] `package.json` - Change `"version": "current_version"` to new version
- [ ] `package-lock.json` - Change 2 instances of `"version": "current_version"` to new version
- [ ] `src-tauri/Cargo.toml` - Change `version = "current_version"` to new version
- [ ] `src-tauri/tauri.conf.json` - Change `"version": "current_version"` to new version

### 2. Build Scripts

- [ ] `build/build-macos-signed.sh` - Update version part in DMG filename
- [ ] `build/build-macos-notarized.sh` - Update version part in DMG filename
- [ ] `build/build-macos.sh` - Update version part in DMG filename
- [ ] `build/build-windows.sh` - Update version part in installer filename

### 3. Other Potential Files

- [ ] `README.md` - Update if version information is documented
- [ ] `CHANGELOG.md` - Update for the new release:
  1. Rename the `[Unreleased]` section to `[X.Y.Z] - YYYY-MM-DD` (new version and date)
  2. Add a new empty `## [Unreleased]` section at the top (for future changes)
  3. Update the compare links at the bottom: `[Unreleased]` → `vX.Y.Z...HEAD`, add `[X.Y.Z]` → `vPrevious...vX.Y.Z`
- [ ] Other documentation files

## Update Procedure

1. Check and update the above files in order
2. Verify version number consistency
3. Run build tests to ensure no issues
4. Run `npm install` if necessary to regenerate package-lock.json

## Important Notes

- `package-lock.json` is auto-generated but version information requires manual updates
- `src-tauri/Cargo.lock` is auto-generated, so manual updates are not required
- Build script filenames must match actual build output filenames

---

**Last Updated**: March 16, 2026
**Version**: 1.1
