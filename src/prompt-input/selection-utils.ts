// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Finds the DOM node and offset for a given character position in contentEditable.
 * Reference tokens count as 1 character each.
 */
export function findNodeAndOffset(element: HTMLElement, targetOffset: number): { node: Node; offset: number } | null {
  let currentOffset = 0;

  for (const child of Array.from(element.childNodes)) {
    // Reference token element - counts as 1 character
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as HTMLElement).getAttribute('data-token-type') === 'reference'
    ) {
      if (currentOffset === targetOffset) {
        return { node: child, offset: 0 };
      }
      currentOffset += 1;
      continue;
    }

    // Text node
    if (child.nodeType === Node.TEXT_NODE) {
      const textLength = child.textContent?.length || 0;
      if (currentOffset + textLength >= targetOffset) {
        return { node: child, offset: targetOffset - currentOffset };
      }
      currentOffset += textLength;
    }
  }

  // Return last position if not found
  const lastChild = element.lastChild;
  return lastChild ? { node: lastChild, offset: lastChild.textContent?.length || 0 } : null;
}

/**
 * Sets the cursor position at the end of contentEditable element.
 */
export function setCursorToEnd(element: HTMLElement): void {
  requestAnimationFrame(() => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

/**
 * Saves the current selection range.
 */
export function saveSelection(): Range | null {
  const selection = window.getSelection();
  return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
}

/**
 * Restores a previously saved selection range.
 */
export function restoreSelection(range: Range | null): void {
  if (range) {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range.cloneRange());
  }
}
