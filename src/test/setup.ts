import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Tests run in happy-dom which doesn't ship `scrollIntoView`; Radix UI components
// (Select, Dialog) call it on focus management. Stub it once to keep tests quiet.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
