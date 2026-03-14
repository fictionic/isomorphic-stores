import React from 'react';

export default function TheFold() {
  return null;
}

export function isTheFold(element: React.ReactElement): boolean {
  return element?.type === TheFold;
}
