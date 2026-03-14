import React from 'react';
import RootElement from './RootElement';

interface Props {
  id?: string;
  className?: string;
  style?: string;
  children?: React.ReactNode;
}

export type ContainerOpenControl = { containerOpen: { id?: string; class?: string; style?: string } };
export type ContainerCloseControl = { containerClose: true };
export type PageElement = React.ReactElement | ContainerOpenControl | ContainerCloseControl;

export function isContainerOpen(x: PageElement): x is ContainerOpenControl {
  return typeof x === 'object' && x !== null && 'containerOpen' in x;
}

export function isContainerClose(x: PageElement): x is ContainerCloseControl {
  return typeof x === 'object' && x !== null && 'containerClose' in x;
}

export function flattenForRender(element: React.ReactElement): PageElement[] {
  const { id, className, style, children } = element.props as Props;
  const open: ContainerOpenControl = { containerOpen: {} };
  if (id) open.containerOpen.id = id;
  if (className) open.containerOpen.class = className;
  if (style) open.containerOpen.style = style;

  const childArray = React.Children.toArray(children) as React.ReactElement[];
  const flatChildren: PageElement[] = childArray.flatMap((child) =>
    RootContainer.isRootContainer(child)
      ? flattenForRender(child)
      : [RootElement.ensureRootElementWithContainer(child, element as { props: { when?: Promise<unknown> } })],
  );

  return [open, ...flatChildren, { containerClose: true }];
}

export default function RootContainer(_props: Props) {
  return null;
}

RootContainer.isRootContainer = function (el: React.ReactElement): boolean {
  return el?.type === RootContainer;
};

RootContainer.flattenForRender = flattenForRender;
