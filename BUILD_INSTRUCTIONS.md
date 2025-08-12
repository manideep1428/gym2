# 🚀 Android Build Instructions for GymBook App

## Prerequisites

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

## Build Options

### Option 1: APK Build (Recommended for Testing)
```bash
eas build --platform android --profile preview
```
- Creates an APK file you can install directly on Android devices
- Good for testing and sharing with beta users
- Smaller file size, easier to distribute

### Option 2: AAB Build (For Play Store)
```bash
eas build --platform android --profile production
```
- Creates an Android App Bundle (AAB) for Google Play Store
- Optimized for Play Store distribution
- Required format for Play Store uploads

### Option 3: Development Build
```bash
eas build --platform android --profile development
```
- Creates a development client with debugging capabilities
- Good for development and testing

## Build Process

1. **Start the build**:
   ```bash
   eas build --platform android --profile preview
   ```

2. **Wait for build completion** (usually 10-15 minutes)

3. **Download the APK** from the provided link

4. **Install on Android device**:
   - Enable "Install from unknown sources" in Android settings
   - Transfer APK to device and install

## Build Configuration Details

### Current App Settings:
- **App Name**: GymBook - Trainer & Client App
- **Package**: com.gymbook.app
- **Version**: 1.0.0
- **Version Code**: 1

### Features Included:
- ✅ Authentication (Supabase)
- ✅ Role-based routing (Trainer/Client)
- ✅ Booking system with smart time slots
- ✅ Calendar availability management
- ✅ Real-time notifications
- ✅ Step-by-step booking flow
- ✅ Dark/Light theme support

## Troubleshooting

### Common Issues:

1. **Build fails with de errors**:
   ```bash
   npm install
   npx expo install --fix
   ```

2. **EAS CLI not found**:
   ```bash
   npm install -g @expo/eas-cli@latest
   ```

3. **Login issues**:
   ```bash
   eas logout
   eas login
   ```

4. **Build queue is full**:
   - Wait and try again later
   - Or upgrade to paid Expo plan for priority builds

### Build Status Check:
```bash
eas build:list
```

## Testing the APK

1. **Install on physical device**:
   - Download APK from build link
   - Enable "Install from unknown sources"
   - Install and test all features

2. **Test key features**:
   - [ ] Registration (Client/Trainer)
   - [ ] Login/Logout
   - [ ] Trainer availability setup
   - [ ] Client booking flow
   - [ ] Notifications
   - [ ] Theme switching

## Next Steps

1. **Test thoroughly** on multiple Android devices
2. **Fix any device-specific issues**
3. **Update version** in app.json for new builds
4. **Submit to Play Store** (if ready for production)

## Build Commands Summary

```bash
# Quick APK build for testing
eas build --platform android --profile preview

# Production build for Play Store
eas build --platform android --profile production

# Check build statuslist

# Download latest build
eas build:download --platform android
```

## Support

If you encounter issues:
1. Check Expo documentation: https://docs.expo.dev/build/setup/
2. Check build logs in EAS dashboard
3. Ensure all dependencies are compatible with Expo SDK

---

**Happy Building! 🎉*