import React from 'react';

export interface Page {
  createStores(): void;
  getElements(): React.ReactElement[];
}
