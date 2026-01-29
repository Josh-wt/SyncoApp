import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';

// Must be called before app renders to handle OAuth redirect
WebBrowser.maybeCompleteAuthSession();

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
