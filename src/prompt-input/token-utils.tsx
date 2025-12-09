// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import ReactDOM from 'react-dom';

import Token from '../token/internal';
import { PromptInputProps } from './interfaces';

const TOKEN_DATA_PREFIX = 'data-token-';
const TOKEN_TYPE_ATTRIBUTE = `${TOKEN_DATA_PREFIX}type`;

/**
 * Creates a DOM element for a token with data attributes.
 * @param type - The token type identifier
 * @param attributes - Key-value pairs to be set as data-token-* attributes
 * @returns A configured span element ready for token rendering
 */
function createTokenContainerElement(type: string, attributes: Record<string, string>): HTMLElement {
  const container = document.createElement('span');
  container.style.display = 'inline';
  container.contentEditable = 'false';
  container.setAttribute(TOKEN_TYPE_ATTRIBUTE, type);

  Object.entries(attributes).forEach(([key, value]) => {
    container.setAttribute(`${TOKEN_DATA_PREFIX}${key}`, value);
  });

  return container;
}

/**
 * Token renderer factory for different token types.
 */
const tokenRenderers: Record<
  PromptInputProps.InputToken['type'],
  (token: PromptInputProps.InputToken, target: HTMLElement, containers: Set<HTMLElement>) => void
> = {
  text: (token, target) => {
    if (token.type === 'text' && token.value) {
      target.appendChild(document.createTextNode(token.value));
    }
  },
  reference: (token, target, containers) => {
    if (token.type === 'reference') {
      const container = createTokenContainerElement('reference', {
        id: token.id || '',
        value: token.value || '',
      });
      target.appendChild(container);
      containers.add(container);
      ReactDOM.render(<Token key={token.id} variant="inline" label={token.label} value={token.value} />, container);
    }
  },
  mode: (token, target, containers) => {
    if (token.type === 'mode') {
      const container = createTokenContainerElement('mode', {
        id: token.id || '',
        value: token.value || '',
      });
      target.appendChild(container);
      containers.add(container);
      ReactDOM.render(<Token key={token.id} variant="inline" label={token.label} value={token.value} />, container);
    }
  },
};

/**
 * Cleans up React components and DOM content from the target element.
 * @param targetElement - The element to clean
 * @param reactContainers - Set of React container elements to unmount
 */
function cleanupDOM(targetElement: HTMLElement, reactContainers: Set<HTMLElement>): void {
  reactContainers.forEach(container => {
    try {
      ReactDOM.unmountComponentAtNode(container);
    } catch (error) {
      console.warn('Failed to unmount React component:', error);
    }
  });
  reactContainers.clear();
  targetElement.innerHTML = '';
}

/**
 * Ensures the contentEditable element can receive cursor at the end.
 * Adds an empty text node if the last child is an element node.
 * @param targetElement - The element to ensure cursor placement
 */
function ensureCursorPlacement(targetElement: HTMLElement): void {
  if (targetElement.lastChild?.nodeType === Node.ELEMENT_NODE) {
    targetElement.appendChild(document.createTextNode(''));
  }
}

/**
 * Renders an array of tokens into a contentEditable element.
 * Handles both text tokens (as text nodes) and reference tokens (as React components).
 * @param tokens - Array of tokens to render
 * @param targetElement - The contentEditable element to render into
 * @param reactContainers - Set to track React container elements for cleanup
 * @throws {Error} If targetElement is not a valid HTMLElement
 */
export function renderTokensToDOM(
  tokens: readonly PromptInputProps.InputToken[],
  targetElement: HTMLElement,
  reactContainers: Set<HTMLElement>
): void {
  if (!targetElement || !(targetElement instanceof HTMLElement)) {
    throw new Error('Invalid target element provided to renderTokensToDOM');
  }

  cleanupDOM(targetElement, reactContainers);

  tokens.forEach(token => {
    const renderer = tokenRenderers[token.type];
    if (renderer) {
      renderer(token, targetElement, reactContainers);
    } else {
      console.warn(`Unknown token type: ${token.type}`);
    }
  });

  ensureCursorPlacement(targetElement);
}

/**
 * Extracts all data-token-* attributes from an element.
 * @param element - The element to extract attributes from
 * @returns Object mapping attribute keys to values (without the data-token- prefix)
 */
function extractTokenData(element: HTMLElement): Record<string, string> {
  return Array.from(element.attributes)
    .filter(attr => attr.name.startsWith(TOKEN_DATA_PREFIX))
    .reduce(
      (acc, attr) => {
        const key = attr.name.replace(TOKEN_DATA_PREFIX, '');
        acc[key] = attr.value;
        return acc;
      },
      {} as Record<string, string>
    );
}

/**
 * Token extractor factory for different token types.
 */
const tokenExtractors: Record<
  string,
  (element: HTMLElement, flushText: () => void) => PromptInputProps.InputToken | null
> = {
  reference: (element, flushText) => {
    flushText();
    const data = extractTokenData(element);
    return {
      type: 'reference',
      id: data.id || '',
      label: element.textContent || '',
      value: data.value || element.textContent || '',
    };
  },
  mode: (element, flushText) => {
    flushText();
    const data = extractTokenData(element);
    return {
      type: 'mode',
      id: data.id || '',
      label: element.textContent || '',
      value: data.value || '',
    };
  },
};

/**
 * Extracts an array of tokens from a contentEditable DOM element.
 * Converts text nodes to TextInputToken and token elements to their respective types.
 * @param element - The contentEditable element to extract tokens from
 * @returns Array of extracted tokens
 * @throws {Error} If element is not a valid HTMLElement
 */
export function domToTokenArray(element: HTMLElement): PromptInputProps.InputToken[] {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Invalid element provided to domToTokenArray');
  }

  const tokens: PromptInputProps.InputToken[] = [];
  let textBuffer = '';

  const flushTextBuffer = (): void => {
    if (textBuffer) {
      tokens.push({ type: 'text', value: textBuffer });
      textBuffer = '';
    }
  };

  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      textBuffer += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tokenType = el.getAttribute(TOKEN_TYPE_ATTRIBUTE);

      if (tokenType && tokenExtractors[tokenType]) {
        const token = tokenExtractors[tokenType](el, flushTextBuffer);
        if (token) {
          tokens.push(token);
        }
      } else {
        // Recursively process children for non-token elements
        Array.from(node.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(element.childNodes).forEach(processNode);
  flushTextBuffer();

  return tokens;
}

export function getPromptText(tokens: readonly PromptInputProps.InputToken[], labelsOnly = false): string {
  if (tokens.length === 0) {
    return '';
  }

  return tokens
    .map(token => {
      if (token.type === 'text') {
        return token.value || '';
      } else if (token.type === 'reference') {
        return labelsOnly ? token.label || '' : token.value || '';
      } else if (token.type === 'mode') {
        // Mode tokens don't contribute to the text value
        return '';
      }
      return '';
    })
    .join('');
}
