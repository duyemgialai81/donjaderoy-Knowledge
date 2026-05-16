// LocalStorage utilities
export const STORAGE_KEYS = {
  USER: "ksp_user",
  AUTH_TOKEN: "ksp_auth_token",
  DEVICE_ID: "ksp_device_id",
  FAVORITES: "ksp_favorites",
  POSTS: "ksp_posts",
  FILTERS: "ksp_filters",
  THEME: "ksp_theme"
};

export const localStorage_service = {
  // User
  saveUser: (user: any) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  
  getUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  
  removeUser: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Auth Token
  saveAuthToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },
  
  getAuthToken: () => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  
  removeAuthToken: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  // Device ID
  saveDeviceId: (id: string) => {
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
  },
  getDeviceId: () => {
    return localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  },

  // Favorites/Saved Posts
  saveFavorites: (favorites: string[]) => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  },
  
  getFavorites: () => {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return favorites ? JSON.parse(favorites) : [];
  },
  
  addFavorite: (postId: string) => {
    const favorites = localStorage_service.getFavorites();
    if (!favorites.includes(postId)) {
      favorites.push(postId);
      localStorage_service.saveFavorites(favorites);
    }
  },
  
  removeFavorite: (postId: string) => {
    const favorites = localStorage_service.getFavorites();
    localStorage_service.saveFavorites(favorites.filter((id: string) => id !== postId));
  },

  // Posts
  savePosts: (posts: any[]) => {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  },
  
  getPosts: () => {
    const posts = localStorage.getItem(STORAGE_KEYS.POSTS);
    return posts ? JSON.parse(posts) : [];
  },

  // Filters
  saveFilters: (filters: any) => {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  },
  
  getFilters: () => {
    const filters = localStorage.getItem(STORAGE_KEYS.FILTERS);
    return filters ? JSON.parse(filters) : null;
  },
  // Theme
  saveTheme: (theme: string) => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },
  getTheme: () => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || "light";
  },

  // Clear All
  clearAll: () => {
    localStorage.clear();
  }
};
