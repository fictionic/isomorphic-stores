import React from 'react';

export interface RootContainerProps {
  id?: string;
  className?: string;
  style?: string;
  children?: React.ReactNode;
}

export default function RootContainer(_: RootContainerProps): React.ReactNode {
  throw new Error('RootContainers cannot go inside non-RootContainers');
}

export type RootContainerElementType = React.ReactElement<RootContainerProps>;
