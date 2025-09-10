# macOS Notarization Complete Guide

## Overview

This document explains the technical details and practical procedures that developers should understand regarding macOS application notarization and notarization stapling.

## Table of Contents

1. [What is Notarization](#what-is-notarization)
2. [What is Notarization Stapling](#what-is-notarization-stapling)
3. [Notarization Process](#notarization-process)
4. [Technical Details](#technical-details)
5. [Troubleshooting](#troubleshooting)
6. [Practical Procedures](#practical-procedures)
7. [Verification and Confirmation](#verification-and-confirmation)

## What is Notarization

### Basic Concepts

**Notarization** is a security service provided by Apple:

- **Purpose**: Apple scans applications to ensure they don't contain malicious code
- **Target**: Applications signed with Developer ID
- **Result**: Issuance of a notarization ticket

### Benefits of Notarization

#### Improved User Experience

- **Installation without warnings**: No "Do you want to open this app?" warnings
- **Enhanced reliability**: Recognized as an Apple-approved application
- **Security assurance**: Proof that no malicious code is included

#### Benefits for Developers

- **Simplified distribution**: No special settings required from users
- **Brand credibility**: Can distribute as an Apple-approved application
- **Gatekeeper compatibility**: Full compatibility with macOS security system

## What is Notarization Stapling

### How Notarization Stapling Works

**Notarization Stapling** is the process of directly embedding a notarization ticket into an application bundle:

1. **Obtain notarization ticket**: Download the notarization ticket from Apple's servers
2. **Embed into bundle**: Embed the ticket into the application bundle
3. **Offline verification**: Can verify notarization status without internet connection

### Benefits of Stapling

#### For Users

- **Offline verification**: Can verify notarization even without internet
- **Faster startup**: No need to connect to Apple servers during verification
- **Reliable operation**: Works in environments with restricted internet access

#### For Developers

- **Distribution flexibility**: Can distribute via any method (USB, email, etc.)
- **Reduced server load**: Less dependency on Apple's notarization servers
- **Better user experience**: Faster application startup

## Notarization Process

### 1. Application Signing

```bash
# Sign the application with Developer ID
codesign --force --verify --verbose --sign "Developer ID Application: Your Name (TEAM_ID)" YourApp.app
```

### 2. Create DMG

```bash
# Create DMG for distribution
hdiutil create -volname "YourApp" -srcfolder YourApp.app -ov -format UDZO YourApp.dmg
```

### 3. Sign DMG

```bash
# Sign the DMG
codesign --force --verify --verbose --sign "Developer ID Application: Your Name (TEAM_ID)" YourApp.dmg
```

### 4. Submit for Notarization

```bash
# Submit to Apple for notarization
xcrun notarytool submit YourApp.dmg --keychain-profile "notarytool-profile" --wait
```

### 5. Staple Notarization

```bash
# Staple the notarization ticket to the application
xcrun stapler staple YourApp.app
xcrun stapler staple YourApp.dmg
```

## Technical Details

### Notarization Ticket Structure

The notarization ticket contains:

- **Application hash**: SHA-256 hash of the application
- **Notarization timestamp**: When the application was notarized
- **Apple's signature**: Cryptographic signature from Apple
- **Ticket validity period**: Expiration date of the ticket

### Stapling Process Details

```bash
# Check if stapling is successful
xcrun stapler validate YourApp.app

# Expected output for successful stapling:
# The validate action worked!
```

### Common File Locations

- **Application bundle**: `YourApp.app/Contents/_CodeSignature/`
- **DMG**: Embedded in the DMG's extended attributes
- **Ticket cache**: `~/Library/Caches/com.apple.notarytool/`

## Troubleshooting

### Common Issues

#### 1. Notarization Submission Fails

**Symptoms**:

```
Error: The notarization service encountered an error.
```

**Causes**:

- Invalid Developer ID certificate
- Application not properly signed
- Network connectivity issues

**Solutions**:

```bash
# Verify certificate
security find-identity -v -p codesigning

# Re-sign application
codesign --force --verify --verbose --sign "Developer ID Application: Your Name (TEAM_ID)" YourApp.app

# Check network connectivity
ping developer.apple.com
```

#### 2. Stapling Fails

**Symptoms**:

```
Error: The staple action failed!
```

**Causes**:

- Notarization not yet complete
- Invalid notarization ticket
- Application bundle corruption

**Solutions**:

```bash
# Wait for notarization to complete
xcrun notarytool history --keychain-profile "notarytool-profile"

# Re-download notarization ticket
xcrun notarytool log <submission-id> --keychain-profile "notarytool-profile"

# Re-staple
xcrun stapler staple YourApp.app
```

#### 3. Validation Fails

**Symptoms**:

```
Error: The validate action failed!
```

**Causes**:

- Notarization ticket not stapled
- Application modified after notarization
- Expired notarization ticket

**Solutions**:

```bash
# Check stapling status
xcrun stapler validate YourApp.app

# Re-staple if necessary
xcrun stapler staple YourApp.app

# Verify application integrity
codesign --verify --verbose YourApp.app
```

### Debug Commands

```bash
# Check notarization status
xcrun notarytool history --keychain-profile "notarytool-profile"

# Get detailed notarization log
xcrun notarytool log <submission-id> --keychain-profile "notarytool-profile"

# Verify application signature
codesign --verify --verbose YourApp.app

# Check stapling status
xcrun stapler validate YourApp.app

# List extended attributes
xattr -l YourApp.app
```

## Practical Procedures

### Automated Notarization Script

```bash
#!/bin/bash
# notarize.sh

APP_NAME="YourApp"
BUNDLE_ID="com.yourcompany.yourapp"
DEVELOPER_ID="Developer ID Application: Your Name (TEAM_ID)"
KEYCHAIN_PROFILE="notarytool-profile"

echo "🔐 Signing application..."
codesign --force --verify --verbose --sign "$DEVELOPER_ID" "$APP_NAME.app"

echo "📦 Creating DMG..."
hdiutil create -volname "$APP_NAME" -srcfolder "$APP_NAME.app" -ov -format UDZO "$APP_NAME.dmg"

echo "🔐 Signing DMG..."
codesign --force --verify --verbose --sign "$DEVELOPER_ID" "$APP_NAME.dmg"

echo "📤 Submitting for notarization..."
SUBMISSION_ID=$(xcrun notarytool submit "$APP_NAME.dmg" --keychain-profile "$KEYCHAIN_PROFILE" --wait)

echo "📋 Notarization ID: $SUBMISSION_ID"

echo "🔗 Stapling notarization..."
xcrun stapler staple "$APP_NAME.app"
xcrun stapler staple "$APP_NAME.dmg"

echo "✅ Notarization complete!"
```

### Build Script Integration

```bash
#!/bin/bash
# build-macos-notarized.sh

echo "🏗️ Building application..."
npm run tauri build

echo "🔐 Signing and notarizing..."
./notarize.sh

echo "✅ Build and notarization complete!"
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Build and Notarize

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Build application
        run: npm run tauri build

      - name: Notarize application
        run: ./notarize.sh
        env:
          NOTARYTOOL_PROFILE: ${{ secrets.NOTARYTOOL_PROFILE }}
```

## Verification and Confirmation

### Manual Verification Steps

1. **Check Application Signature**:

   ```bash
   codesign --verify --verbose YourApp.app
   ```

2. **Verify Notarization Status**:

   ```bash
   spctl --assess --verbose YourApp.app
   ```

3. **Check Stapling Status**:

   ```bash
   xcrun stapler validate YourApp.app
   ```

4. **Test Installation**:
   - Copy DMG to another Mac
   - Mount and install the application
   - Verify no security warnings appear

### Automated Verification Script

```bash
#!/bin/bash
# verify-notarization.sh

APP_NAME="YourApp"

echo "🔍 Verifying notarization..."

# Check signature
echo "📝 Checking signature..."
codesign --verify --verbose "$APP_NAME.app"
if [ $? -eq 0 ]; then
    echo "✅ Signature verification passed"
else
    echo "❌ Signature verification failed"
    exit 1
fi

# Check notarization
echo "🔐 Checking notarization..."
spctl --assess --verbose "$APP_NAME.app"
if [ $? -eq 0 ]; then
    echo "✅ Notarization verification passed"
else
    echo "❌ Notarization verification failed"
    exit 1
fi

# Check stapling
echo "📌 Checking stapling..."
xcrun stapler validate "$APP_NAME.app"
if [ $? -eq 0 ]; then
    echo "✅ Stapling verification passed"
else
    echo "❌ Stapling verification failed"
    exit 1
fi

echo "🎉 All verifications passed!"
```

## Best Practices

### 1. Certificate Management

- Store Developer ID certificates in Keychain
- Use keychain profiles for notarytool
- Regularly renew certificates before expiration

### 2. Build Process

- Always sign applications before notarization
- Test applications on clean macOS installations
- Keep build environments consistent

### 3. Distribution

- Always staple notarization tickets
- Test DMG installation on different Macs
- Provide clear installation instructions

### 4. Monitoring

- Monitor notarization submission status
- Set up alerts for failed notarizations
- Keep logs of all notarization attempts

## Common Pitfalls

### 1. Forgetting to Staple

**Problem**: Application notarized but not stapled
**Solution**: Always run `xcrun stapler staple` after notarization

### 2. Modifying After Notarization

**Problem**: Application modified after notarization
**Solution**: Re-notarize after any modifications

### 3. Incorrect Signing

**Problem**: Application signed with wrong certificate
**Solution**: Verify certificate with `security find-identity -v -p codesigning`

### 4. Network Issues

**Problem**: Notarization submission fails due to network
**Solution**: Check network connectivity and retry submission

## Troubleshooting Checklist

- [ ] Developer ID certificate is valid and not expired
- [ ] Application is properly signed with correct certificate
- [ ] Network connectivity to Apple servers is working
- [ ] Notarization submission completed successfully
- [ ] Notarization ticket is stapled to application
- [ ] Application passes all verification checks
- [ ] DMG is properly signed and stapled
- [ ] Installation works on clean macOS systems

## Additional Resources

- [Apple Developer Documentation - Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Apple Developer Documentation - Code Signing](https://developer.apple.com/documentation/security/code_signing_services)
- [Tauri Documentation - Code Signing](https://tauri.app/v1/guides/distribution/sign-macos/)

---

**Last Updated**: September 10, 2025
**Version**: 1.0
