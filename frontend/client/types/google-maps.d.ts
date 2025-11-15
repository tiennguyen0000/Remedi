/// <reference types="googlemaps" />

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}
