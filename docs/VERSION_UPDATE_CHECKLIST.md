# Version Update Checklist

## Files Requiring Updates

### 1. Main Version Files

- [ ] `package.json` - Change `"version": "current_version"` to new version
- [ ] `package-lock.json` - Change 2 instances of `"version": "current_version"` to new version
- [ ] `src-tauri/Cargo.toml` - Change `version = "current_version"` to new version
- [ ] `src-tauri/tauri.conf.json` - Change `"version": "current_version"` to new version

### 2. Build Scripts

- [ ] `build-macos-signed.sh` - Update version part in DMG filename
  - Example: `Bokuchi_0.2_aarch64.dmg` → `Bokuchi_new_version_aarch64.dmg`
- [ ] `build-windows.sh` - Update version part in installer filename
  - Example: `Bokuchi_0.2_x64-setup.exe` → `Bokuchi_new_version_x64-setup.exe`

### 3. Other Potential Files

- [ ] `README.md` - Update if version information is documented
- [ ] `CHANGELOG.md` - Add new version entry if it exists
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

## Current Version: 0.4.0

Last Updated: $(date)

---

**Last Updated**: January 8, 2025
**Version**: 1.0
