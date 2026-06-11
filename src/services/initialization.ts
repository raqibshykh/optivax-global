export class InitializationService {
  static initialize(): void {
    // Production mode: initialization is handled by the mock data client.
  }

  static reset(): void {
    // Production mode: data is stored in the in-memory mock database.
  }
}
