import { Redirect } from 'expo-router';

export default function NotFoundScreen() {
  // Recover from invalid deep links (e.g. nala://) by sending users home.
  return <Redirect href="/" />;
}
