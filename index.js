// App entry point. Installs a crash catcher first, then starts the app (Expo Router).
//
// If something goes wrong while the app starts, the error is shown on screen
// (so it can be reported) instead of the app silently closing.
import { Alert } from 'react-native';

const errorUtils = global.ErrorUtils;
if (errorUtils) {
  const defaultHandler = errorUtils.getGlobalHandler();
  let shown = false;
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal && !shown) {
      shown = true;
      const message = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
      const where = String(error?.stack ?? '').split('\n').slice(0, 6).join('\n');
      Alert.alert('Locked in hit a problem', `Please send a screenshot of this to the developer.\n\n${message}\n\n${where}`);
      return; // keep the app open so the message stays visible
    }
    defaultHandler(error, isFatal);
  });
}

// require (not import) so it runs after the handler above is installed.
require('expo-router/entry');
