import React from 'react';

export type PageStyle = string | { href: string };

export interface Page {
  createStores(): void;
  getElements(): React.ReactElement[];
  getTitle(): string;
  getStyles(): PageStyle[];
}
