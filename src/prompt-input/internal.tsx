// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React, { Ref, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import ReactDOM from 'react-dom';
import clsx from 'clsx';

import { useDensityMode } from '@cloudscape-design/component-toolkit/internal';

import InternalButton from '../button/internal';
import { convertAutoComplete } from '../input/utils';
import { getBaseProps } from '../internal/base-component';
import { useFormFieldContext } from '../internal/context/form-field-context';
import { fireKeyboardEvent, fireNonCancelableEvent } from '../internal/events';
import * as designTokens from '../internal/generated/styles/tokens';
import { InternalBaseComponentProps } from '../internal/hooks/use-base-component';
import { useVisualRefresh } from '../internal/hooks/use-visual-mode';
import { SomeRequired } from '../internal/types';
import WithNativeAttributes from '../internal/utils/with-native-attributes';
import { PromptInputProps } from './interfaces';
import { findNodeAndOffset, restoreSelection, saveSelection, setCursorToEnd } from './selection-utils';
import { getPromptInputStyles } from './styles';
import { domToTokenArray, getPromptText, renderTokensToDOM } from './token-utils';

import styles from './styles.css.js';
import testutilStyles from './test-classes/styles.css.js';

interface InternalPromptInputProps
  extends SomeRequired<PromptInputProps, 'maxRows' | 'minRows'>,
    InternalBaseComponentProps {}

const InternalPromptInput = React.forwardRef(
  (
    {
      value,
      actionButtonAriaLabel,
      actionButtonIconName,
      actionButtonIconUrl,
      actionButtonIconSvg,
      actionButtonIconAlt,
      ariaLabel,
      autoFocus,
      autoComplete,
      disableActionButton,
      disableBrowserAutocorrect,
      disabled,
      maxRows,
      minRows,
      name,
      onAction,
      onBlur,
      onChange,
      onFocus,
      onKeyDown,
      onKeyUp,
      placeholder,
      readOnly,
      spellcheck,
      customPrimaryAction,
      secondaryActions,
      secondaryContent,
      disableSecondaryActionsPaddings,
      disableSecondaryContentPaddings,
      nativeTextareaAttributes,
      style,
      tokens,
      tokensToText,
      mode,
      onModeRemoved,
      menus,
      onMenuSelect,
      onMenuLoadItems,
      menuErrorIconAriaLabel,
      __internalRootRef,
      ...rest
    }: InternalPromptInputProps,
    ref: Ref<PromptInputProps.Ref>
  ) => {
    const { ariaLabelledby, ariaDescribedby, controlId, invalid, warning } = useFormFieldContext(rest);
    const baseProps = getBaseProps(rest);

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editableElementRef = useRef<HTMLDivElement>(null);
    const reactContainersRef = useRef<Set<HTMLElement>>(new Set());
    const isRenderingRef = useRef(false);
    const lastTokensRef = useRef<readonly PromptInputProps.InputToken[] | undefined>(tokens);
    const savedSelectionRef = useRef<Range | null>(null);
    const lastModeRef = useRef<PromptInputProps.InputToken | undefined>(mode);

    // Mode detection
    const isRefresh = useVisualRefresh();
    useDensityMode(textareaRef);
    useDensityMode(editableElementRef);
    const isTokenMode = !!tokens;

    // Style constants
    const PADDING = isRefresh ? designTokens.spaceXxs : designTokens.spaceXxxs;
    const LINE_HEIGHT = designTokens.lineHeightBodyM;

    useImperativeHandle(
      ref,
      () => ({
        focus(...args: Parameters<HTMLElement['focus']>) {
          if (isTokenMode) {
            editableElementRef.current?.focus(...args);
            restoreSelection(savedSelectionRef.current);
          } else {
            textareaRef.current?.focus(...args);
          }
        },
        select() {
          if (isTokenMode) {
            const selection = window.getSelection();
            const range = document.createRange();
            if (editableElementRef.current) {
              range.selectNodeContents(editableElementRef.current);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          } else {
            textareaRef.current?.select();
          }
        },
        setSelectionRange(...args: Parameters<HTMLTextAreaElement['setSelectionRange']>) {
          if (isTokenMode && editableElementRef.current) {
            const [start, end] = args;
            const selection = window.getSelection();
            if (!selection) {
              return;
            }

            const startPos = findNodeAndOffset(editableElementRef.current, start ?? 0);
            const endPos = findNodeAndOffset(editableElementRef.current, end ?? 0);

            if (startPos && endPos) {
              const range = document.createRange();
              range.setStart(startPos.node, startPos.offset);
              range.setEnd(endPos.node, endPos.offset);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } else {
            textareaRef.current?.setSelectionRange(...args);
          }
        },
      }),
      [isTokenMode]
    );

    /**
     * Dynamically adjusts the input height based on content and row constraints.
     */
    const adjustInputHeight = useCallback(() => {
      const element = isTokenMode ? editableElementRef.current : textareaRef.current;
      if (!element) {
        return;
      }

      // Preserve scroll position for token mode
      const scrollTop = element.scrollTop;
      element.style.height = 'auto';

      const minRowsHeight = isTokenMode
        ? `calc(${minRows} * (${LINE_HEIGHT} + ${PADDING} / 2) + ${PADDING})`
        : `calc(${LINE_HEIGHT} + ${designTokens.spaceScaledXxs} * 2)`;
      const scrollHeight = `calc(${element.scrollHeight}px)`;

      if (maxRows === -1) {
        element.style.height = `max(${scrollHeight}, ${minRowsHeight})`;
      } else {
        const effectiveMaxRows = maxRows <= 0 ? 3 : maxRows;
        const maxRowsHeight = `calc(${effectiveMaxRows} * (${LINE_HEIGHT} + ${PADDING} / 2) + ${PADDING})`;
        element.style.height = `min(max(${scrollHeight}, ${minRowsHeight}), ${maxRowsHeight})`;
      }

      if (isTokenMode) {
        element.scrollTop = scrollTop;
      }
    }, [isTokenMode, minRows, maxRows, LINE_HEIGHT, PADDING]);

    const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      fireKeyboardEvent(onKeyDown, event);

      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        if (event.currentTarget.form && !event.isDefaultPrevented()) {
          event.currentTarget.form.requestSubmit();
        }
        event.preventDefault();
        const plainText = isTokenMode
          ? tokensToText
            ? tokensToText(tokens ?? [])
            : getPromptText(tokens ?? [])
          : value;
        fireNonCancelableEvent(onAction, { value: plainText, tokens: [...(tokens ?? [])] });
      }
    };

    const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      fireNonCancelableEvent(onChange, { value: event.target.value, tokens: [...(tokens ?? [])] });
      adjustInputHeight();
    };

    const handleEditableElementKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      fireKeyboardEvent(onKeyDown, event);

      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        const form = (event.currentTarget as HTMLElement).closest('form');
        if (form && !event.isDefaultPrevented()) {
          form.requestSubmit();
        }
        event.preventDefault();
        const plainText = tokensToText ? tokensToText(tokens ?? []) : getPromptText(tokens ?? []);
        fireNonCancelableEvent(onAction, { value: plainText, tokens: [...(tokens ?? [])] });
      }

      // Single-backspace deletion for tokens
      if (event.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection?.rangeCount || !selection.isCollapsed) {
          return;
        }

        const range = selection.getRangeAt(0);
        let nodeToCheck = range.startContainer;

        // If at start of text node, check previous sibling
        if (nodeToCheck.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
          nodeToCheck = nodeToCheck.previousSibling as Node;
        }
        // If cursor is in the contentEditable itself (not in a text node), check last child
        else if (nodeToCheck === editableElementRef.current && range.startOffset > 0) {
          nodeToCheck = editableElementRef.current.childNodes[range.startOffset - 1];
        }

        // If we're about to delete an empty text node, check if there's a token before it
        if (nodeToCheck?.nodeType === Node.TEXT_NODE && nodeToCheck.textContent === '') {
          const previousNode = nodeToCheck.previousSibling;
          if (previousNode?.nodeType === Node.ELEMENT_NODE) {
            const element = previousNode as Element;
            if (element.hasAttribute('data-token-type')) {
              // Skip the empty text node and target the token instead
              nodeToCheck = previousNode;
            }
          }
        }

        // Check if it's a token element
        if (nodeToCheck?.nodeType === Node.ELEMENT_NODE) {
          const element = nodeToCheck as Element;
          const tokenType = element.getAttribute('data-token-type');

          if (tokenType === 'mode') {
            // For mode tokens, fire the callback and let parent handle state
            event.preventDefault();
            if (onModeRemoved) {
              fireNonCancelableEvent(onModeRemoved, { mode: undefined });
            }
          } else if (tokenType) {
            // For other tokens (like references), remove directly
            event.preventDefault();
            element.remove();
            editableElementRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    };

    const handleEditableElementChange = useCallback<React.FormEventHandler<HTMLDivElement>>(() => {
      if (isRenderingRef.current || !editableElementRef.current) {
        return;
      }

      let extractedTokens = domToTokenArray(editableElementRef.current);

      // TEMPORARY: Convert /word to mode tokens and @word to reference tokens
      // This is prototype functionality and should be replaced with proper menu system
      const processedTokens: PromptInputProps.InputToken[] = [];
      let detectedMode: PromptInputProps.InputToken | undefined;

      extractedTokens.forEach(token => {
        if (token.type === 'text' && token.value) {
          const text = token.value;
          // Match /word or @word followed by space
          const pattern = /(\/\w+\s|@\w+\s)/g;
          let lastIndex = 0;
          let match;
          let textBuffer = '';

          while ((match = pattern.exec(text)) !== null) {
            // Add any text before the match to buffer
            textBuffer += text.substring(lastIndex, match.index);

            // Flush text buffer if not empty
            if (textBuffer) {
              processedTokens.push({ type: 'text', value: textBuffer });
              textBuffer = '';
            }

            const matchedText = match[0];
            const trigger = matchedText[0]; // "/" or "@"
            const word = matchedText.substring(1).trim(); // Remove trigger and trailing space

            if (trigger === '/' && !mode) {
              // Only convert /word to mode token if no mode is already set
              detectedMode = {
                type: 'mode',
                id: word,
                label: word,
                value: `<mode id="${word}">Some dummy mode system prompt</mode>`,
              };
            } else if (trigger === '/' && mode) {
              // If mode already exists, keep /word as text
              textBuffer += matchedText;
            } else if (trigger === '@') {
              // Convert @word to reference token
              processedTokens.push({
                type: 'reference',
                id: word,
                label: word,
                value: `<dummy_mention id="${word}">Some dummy details</dummy_mention>`,
              });
            }

            lastIndex = pattern.lastIndex;
          }

          // Add any remaining text
          textBuffer += text.substring(lastIndex);
          if (textBuffer) {
            processedTokens.push({ type: 'text', value: textBuffer });
          }
        } else {
          processedTokens.push(token);
        }
      });

      extractedTokens = processedTokens;

      const plainText = tokensToText ? tokensToText(extractedTokens) : getPromptText(extractedTokens);

      // Check if mode token was removed from the DOM
      if (lastModeRef.current && onModeRemoved) {
        const hasModeToken = editableElementRef.current.querySelector('[data-token-type="mode"]');
        if (!hasModeToken) {
          // Mode token was removed, notify parent
          fireNonCancelableEvent(onModeRemoved, { mode: undefined });
          lastModeRef.current = undefined;
        }
      }

      // If we detected new tokens (mode or reference), re-render them as Token elements
      const hasNewTokens =
        detectedMode ||
        extractedTokens.some(
          (token, index) =>
            token.type === 'reference' &&
            (!lastTokensRef.current ||
              !lastTokensRef.current[index] ||
              lastTokensRef.current[index].type !== 'reference')
        );

      if (hasNewTokens && editableElementRef.current) {
        isRenderingRef.current = true;
        const allTokens = detectedMode ? [detectedMode, ...extractedTokens] : extractedTokens;
        renderTokensToDOM(allTokens, editableElementRef.current, reactContainersRef.current);
        isRenderingRef.current = false;
        // Place cursor at the end after rendering tokens
        setCursorToEnd(editableElementRef.current);
      }

      // Filter out mode tokens from extractedTokens - mode is tracked separately
      const tokensWithoutMode = extractedTokens.filter(token => token.type !== 'mode');

      lastTokensRef.current = tokensWithoutMode;
      fireNonCancelableEvent(onChange, { value: plainText, tokens: tokensWithoutMode, mode: detectedMode });
      adjustInputHeight();
    }, [tokensToText, onModeRemoved, onChange, adjustInputHeight, mode]);

    const handleEditableElementBlur = useCallback(() => {
      if (isTokenMode) {
        savedSelectionRef.current = saveSelection();
      }
      if (onBlur) {
        fireNonCancelableEvent(onBlur);
      }
    }, [isTokenMode, onBlur]);

    // Render tokens into contentEditable when they change externally
    useEffect(() => {
      if (isTokenMode && editableElementRef.current) {
        // Only re-render if tokens or mode changed from outside (not from user input)
        if (tokens !== lastTokensRef.current || mode !== lastModeRef.current) {
          isRenderingRef.current = true;
          // Combine mode token (if exists) with regular tokens
          const allTokens = mode ? [mode, ...(tokens ?? [])] : (tokens ?? []);
          renderTokensToDOM(allTokens, editableElementRef.current, reactContainersRef.current);
          isRenderingRef.current = false;
          lastTokensRef.current = tokens;
          lastModeRef.current = mode;
          setCursorToEnd(editableElementRef.current);
        }
      }
      adjustInputHeight();
    }, [isTokenMode, tokens, mode, adjustInputHeight]);

    // Handle window resize
    useEffect(() => {
      const handleResize = () => adjustInputHeight();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [adjustInputHeight]);

    // Track mode changes
    useEffect(() => {
      lastModeRef.current = mode;
    }, [mode]);

    // Auto-focus on mount
    useEffect(() => {
      if (isTokenMode && autoFocus && editableElementRef.current) {
        editableElementRef.current.focus();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cleanup React containers on unmount
    useEffect(() => {
      const containers = reactContainersRef.current;
      return () => {
        containers.forEach(container => ReactDOM.unmountComponentAtNode(container));
        containers.clear();
      };
    }, []);

    // Future: Implement menu trigger detection and dropdown rendering
    // When menus are defined, detect trigger characters and show appropriate menu
    // Use onMenuSelect to handle option selection
    // Use onMenuLoadItems for async menu data loading
    // Use menuErrorIconAriaLabel for accessibility in error states
    void menus;
    void onMenuSelect;
    void onMenuLoadItems;
    void menuErrorIconAriaLabel;

    const hasActionButton = !!(
      actionButtonIconName ||
      actionButtonIconSvg ||
      actionButtonIconUrl ||
      customPrimaryAction
    );

    const showPlaceholder =
      isTokenMode &&
      placeholder &&
      !mode &&
      (!tokens || tokens.length === 0 || (tokens.length === 1 && tokens[0].type === 'text' && !tokens[0].value));

    const textareaAttributes: React.TextareaHTMLAttributes<HTMLTextAreaElement> = {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': invalid ? 'true' : undefined,
      name,
      placeholder,
      autoFocus,
      className: clsx(styles.textarea, testutilStyles.textarea, {
        [styles.invalid]: invalid,
        [styles.warning]: warning,
      }),
      autoComplete: convertAutoComplete(autoComplete),
      autoCorrect: disableBrowserAutocorrect ? 'off' : undefined,
      autoCapitalize: disableBrowserAutocorrect ? 'off' : undefined,
      spellCheck: spellcheck,
      disabled,
      readOnly: readOnly ? true : undefined,
      rows: minRows,
      value: value || '',
      onKeyDown: handleTextareaKeyDown,
      onKeyUp: onKeyUp && (event => fireKeyboardEvent(onKeyUp, event)),
      onChange: handleTextareaChange,
      onBlur: onBlur && (() => fireNonCancelableEvent(onBlur)),
      onFocus: onFocus && (() => fireNonCancelableEvent(onFocus)),
    };

    const editableElementAttributes: React.HTMLAttributes<HTMLDivElement> & {
      'data-placeholder'?: string;
    } = {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-invalid': invalid ? 'true' : undefined,
      'aria-disabled': disabled ? 'true' : undefined,
      'aria-readonly': readOnly ? 'true' : undefined,
      'aria-required': rest.ariaRequired ? 'true' : undefined,
      'data-placeholder': placeholder,
      className: clsx(styles.textarea, testutilStyles.textarea, {
        [styles.invalid]: invalid,
        [styles.warning]: warning,
        [styles['textarea-disabled']]: disabled,
        [styles['placeholder-visible']]: showPlaceholder,
      }),
      autoCorrect: disableBrowserAutocorrect ? 'off' : undefined,
      autoCapitalize: disableBrowserAutocorrect ? 'off' : undefined,
      spellCheck: spellcheck,
      onKeyDown: handleEditableElementKeyDown,
      onKeyUp: onKeyUp && (event => fireKeyboardEvent(onKeyUp, event)),
      onInput: handleEditableElementChange,
      onBlur: handleEditableElementBlur,
      onFocus: onFocus && (() => fireNonCancelableEvent(onFocus)),
    };

    const actionButton = (
      <div className={clsx(styles['primary-action'], testutilStyles['primary-action'])}>
        {customPrimaryAction ?? (
          <InternalButton
            className={clsx(styles['action-button'], testutilStyles['action-button'])}
            ariaLabel={actionButtonAriaLabel}
            disabled={disabled || readOnly || disableActionButton}
            __focusable={readOnly}
            iconName={actionButtonIconName}
            iconUrl={actionButtonIconUrl}
            iconSvg={actionButtonIconSvg}
            iconAlt={actionButtonIconAlt}
            onClick={() => {
              const plainText = isTokenMode
                ? tokensToText
                  ? tokensToText(tokens ?? [])
                  : getPromptText(tokens ?? [])
                : value;
              fireNonCancelableEvent(onAction, { value: plainText, tokens: [...(tokens ?? [])] });
            }}
            variant="icon"
          />
        )}
      </div>
    );

    return (
      <div
        {...baseProps}
        aria-label={ariaLabel}
        className={clsx(styles.root, testutilStyles.root, baseProps.className, {
          [styles['textarea-readonly']]: readOnly,
          [styles['textarea-invalid']]: invalid,
          [styles['textarea-warning']]: warning && !invalid,
          [styles.disabled]: disabled,
        })}
        ref={__internalRootRef}
        role="region"
        style={getPromptInputStyles(style)}
      >
        {secondaryContent && (
          <div
            className={clsx(styles['secondary-content'], testutilStyles['secondary-content'], {
              [styles['with-paddings']]: !disableSecondaryContentPaddings,
              [styles.invalid]: invalid,
              [styles.warning]: warning,
            })}
          >
            {secondaryContent}
          </div>
        )}

        <div className={styles['textarea-wrapper']}>
          {isTokenMode ? (
            <>
              {name && (
                <input
                  type="hidden"
                  name={name}
                  value={tokensToText ? tokensToText(tokens ?? []) : getPromptText(tokens ?? [])}
                />
              )}
              <div
                id={controlId}
                ref={editableElementRef}
                role="textbox"
                contentEditable={!disabled && !readOnly}
                suppressContentEditableWarning={true}
                {...editableElementAttributes}
              />
            </>
          ) : (
            <WithNativeAttributes
              {...textareaAttributes}
              tag="textarea"
              componentName="PromptInput"
              nativeAttributes={nativeTextareaAttributes}
              ref={textareaRef}
              id={controlId}
            />
          )}
          {hasActionButton && !secondaryActions && actionButton}
        </div>

        {secondaryActions && (
          <div
            className={clsx(styles['action-stripe'], {
              [styles.invalid]: invalid,
              [styles.warning]: warning,
            })}
          >
            <div
              className={clsx(styles['secondary-actions'], testutilStyles['secondary-actions'], {
                [styles['with-paddings']]: !disableSecondaryActionsPaddings,
                [styles['with-paddings-and-actions']]: !disableSecondaryActionsPaddings && hasActionButton,
                [styles.invalid]: invalid,
                [styles.warning]: warning,
              })}
            >
              {secondaryActions}
            </div>
            <div
              className={styles.buffer}
              onClick={() => (isTokenMode ? editableElementRef.current?.focus() : textareaRef.current?.focus())}
            />
            {hasActionButton && actionButton}
          </div>
        )}
      </div>
    );
  }
);

export default InternalPromptInput;
