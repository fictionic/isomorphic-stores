import React from 'react';
import { renderToString } from 'react-dom/server';
import { PAGE_ELEMENT_TOKEN_ID_ATTR } from '../../constants';

export interface RootContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function RootContainer(_: RootContainerProps): React.ReactNode {
  throw new Error('RootContainers cannot go inside non-RootContainers');
}

export type RootContainerElementType = React.ReactElement<RootContainerProps>;

export function renderContainerOpen(element: RootContainerElementType, index: number): string {
  const { children, ...attrs } = element.props;
  const html = renderToString(<div {...{[PAGE_ELEMENT_TOKEN_ID_ATTR]: String(index)}} {...attrs} />);
  return html.slice(0, -('</div>'.length)) + '\n';
}

export function renderContainerClose(): string {
  return `</div>\n`;
}
