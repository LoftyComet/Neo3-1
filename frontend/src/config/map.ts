// Map configuration for Sound Memory App

// For production, you should:
// 1. Sign up at https://mapbox.com/
// 2. Create a new access token with the correct scopes
// 3. Store it securely in environment variables
export const MAP_CONFIG = {
  // Using a reliable public token
  // For production, get your own token at: https://mapbox.com/help/create-api-access-token/
  MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',

  // Map style options - using basic style that's more likely to load
  MAP_STYLE: 'mapbox://styles/mapbox/streets-v12', // Changed to streets style

  // Tile Layer configuration (for Leaflet)
  // Using Gaode Map (AMap) for better performance in China
  TILE_LAYER: {
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.amap.com/">Gaode Map</a>',
    subdomains: ['1', '2', '3', '4']
  },

  // Default view state
  DEFAULT_VIEW_STATE: {
    longitude: 116.4074,    // Beijing (default location)
    latitude: 39.9042,
    zoom: 12,
    pitch: 45,
    bearing: 0,
    transitionDuration: 1000
  },

  // Marker configurations
  MARKER_CONFIG: {
    // Emotion colors for different audio types (Morandi Palette)
    emotionColors: {
      'Joy': '#D4A373',        // Muted Sand
      'Loneliness': '#8E9775',  // Olive Grey
      'Nostalgia': '#92817A',   // Warm Taupe
      'Love': '#B48484',        // Dusty Rose
      'Peace': '#A7BBC7',       // Muted Blue-Grey
      'Excitement': '#C38D9E'   // Muted Mauve
    },
    // Marker size configurations
    size: {
      small: 20,
      medium: 30,
      large: 40
    }
  }
};