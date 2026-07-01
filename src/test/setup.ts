import '@testing-library/jest-dom';

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// (used by BuyerDashboard and other chart pages) requires on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
