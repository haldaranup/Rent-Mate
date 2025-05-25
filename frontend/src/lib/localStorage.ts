class LocalStorageService {
    // Save data to localStorage with type safety
    static save<T>(key: string, value: T): void {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  
    // Retrieve data from localStorage with proper type handling
    static get<T>(key: string): T | null {
      if (typeof window !== 'undefined') {
        const storedValue = localStorage.getItem(key);
        if (storedValue && storedValue !== 'undefined') {
          try {
            return JSON.parse(storedValue) as T;
          } catch (error) {
            console.error('Error parsing JSON from localStorage:', error);
            return null;
          }
        }
      }
      return null;
    }
  
    // Remove an item from localStorage
    static remove(key: string): void {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    }
  
    // Clear all items in localStorage
    static clear(): void {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
    }
  
    // Check if an item exists in localStorage
    static exists(key: string): boolean {
      return this.get<unknown>(key) !== null;
    }
  }
  
  export default LocalStorageService;