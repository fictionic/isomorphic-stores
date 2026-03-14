import React from 'react';
import { isTheFold } from './TheFold';
import type { PageElement } from './RootContainer';

interface Props {
  when?: Promise<unknown>;
  children: React.ReactNode;
}

export default function RootElement({ children }: Props) {
  return <>{children}</>;
}

RootElement.isRootElement = function (el: React.ReactElement): boolean {
  return el?.type === RootElement;
};

// Wraps a plain React element in RootElement, inheriting `when` from the container.
// Passes through if already a RootElement, TheFold, or a non-React control object.
RootElement.ensureRootElementWithContainer = function (
  element: React.ReactElement,
  container: { props: { when?: Promise<unknown> } },
): React.ReactElement {
  if (
    !React.isValidElement(element) ||
    RootElement.isRootElement(element) ||
    isTheFold(element)
  ) {
    return element;
  }
  const { when } = container.props;
  return <RootElement when={when}>{element}</RootElement>;
};

RootElement.ensureRootElement = function (element: PageElement): PageElement {
  if (
    !React.isValidElement(element) ||
    RootElement.isRootElement(element) ||
    isTheFold(element)
  ) {
    return element;
  }
  return <RootElement>{element}</RootElement>;
};
