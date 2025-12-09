// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';

import { AutosuggestProps } from '../autosuggest/interfaces';
import { IconProps } from '../icon/interfaces';
import {
  BaseInputProps,
  InputAutoComplete,
  InputAutoCorrect,
  InputKeyEvents,
  InputSpellcheck,
} from '../input/interfaces';
import { BaseComponentProps } from '../internal/base-component';
import {
  BaseDropdownHostProps,
  OptionsFilteringType,
  OptionsLoadItemsDetail,
} from '../internal/components/dropdown/interfaces';
import { DropdownStatusProps } from '../internal/components/dropdown-status';
import { OptionDefinition } from '../internal/components/option/interfaces';
import { FormFieldValidationControlProps } from '../internal/context/form-field-context';
import { BaseKeyDetail, NonCancelableEventHandler } from '../internal/events';
/**
 * @awsuiSystem core
 */
import { NativeAttributes } from '../internal/utils/with-native-attributes';

export interface PromptInputProps
  extends Omit<BaseInputProps, 'nativeInputAttributes' | 'name' | 'value' | 'onChange'>,
    InputKeyEvents,
    InputAutoCorrect,
    InputAutoComplete,
    InputSpellcheck,
    BaseComponentProps,
    FormFieldValidationControlProps {
  /**
   * Specifies the name of the prompt input for form submissions.
   *
   * When `tokens` is set, the value will be the `tokensToText` output if provided,
   * else it will be the concatenated `value` properties from `tokens`.
   */
  name?: string;

  /**
   * Specifies the content of the prompt input, not in use if `tokens` is defined.
   */
  value?: string;

  /**
   * Specifies the content of the prompt input when using token mode.
   *
   * All tokens use the same unified structure with a `value` property:
   * - Text tokens: `value` contains the text content
   * - Reference tokens: `value` contains the reference value, `label` for display (e.g., '@john')
   * - Mode tokens: Use the `mode` prop instead of including in this array
   *
   * When defined, `autocomplete` will no longer function.
   */
  tokens?: readonly PromptInputProps.InputToken[];

  /**
   * Specifies the active mode (e.g., /dev, /creative).
   * Set `type` to `mode`.
   */
  mode?: PromptInputProps.InputToken;

  /**
   * Called when the user removes the active mode.
   */
  onModeRemoved?: NonCancelableEventHandler<PromptInputProps.ModeChangeDetail>;

  /**
   * Custom function to transform tokens into plain text for the `value` field in `onChange` and `onAction` events
   * and for the hidden input when `name` is specified.
   *
   * If not provided, the default implementation concatenates the `value` property from all tokens.
   *
   * Use this to customize serialization, for example:
   * - Using `label` instead of `value` for reference tokens
   * - Adding custom formatting or separators between tokens
   */
  tokensToText?: (tokens: readonly PromptInputProps.InputToken[]) => string;

  /**
   * Called whenever a user changes the input value (by typing or pasting).
   * The event `detail` contains the current value as a React.ReactNode.
   *
   * When `tokens` is defined this will return `undefined` for `value` and an array of `tokens` representing the current content in the input.
   */
  onChange?: NonCancelableEventHandler<PromptInputProps.ChangeDetail>;

  /**
   * Called whenever a user clicks the action button or presses the "Enter" key.
   * The event `detail` contains the current value of the field.
   *
   * When `tokens` is defined this will return `undefined` for `value` and an array of `tokens` representing the current content in the input.
   */
  onAction?: NonCancelableEventHandler<PromptInputProps.ActionDetail>;

  /**
   * Determines what icon to display in the action button.
   */
  actionButtonIconName?: IconProps.Name;

  /**
   * Specifies the URL of a custom icon. Use this property if the icon you want isn't available.
   *
   * If you set both `actionButtonIconUrl` and `actionButtonIconSvg`, `actionButtonIconSvg` will take precedence.
   */
  actionButtonIconUrl?: string;

  /**
   * Specifies the SVG of a custom icon.
   *
   * Use this property if you want your custom icon to inherit colors dictated by variant or hover states.
   * When this property is set, the component will be decorated with `aria-hidden="true"`. Ensure that the `svg` element:
   * - has attribute `focusable="false"`.
   * - has `viewBox="0 0 16 16"`.
   *
   * If you set the `svg` element as the root node of the slot, the component will automatically
   * - set `stroke="currentColor"`, `fill="none"`, and `vertical-align="top"`.
   * - set the stroke width based on the size of the icon.
   * - set the width and height of the SVG element based on the size of the icon.
   *
   * If you don't want these styles to be automatically set, wrap the `svg` element into a `span`.
   * You can still set the stroke to `currentColor` to inherit the color of the surrounding elements.
   *
   * If you set both `actionButtonIconUrl` and `actionButtonIconSvg`, `iconSvg` will take precedence.
   *
   * *Note:* Remember to remove any additional elements (for example: `defs`) and related CSS classes from SVG files exported from design software.
   * In most cases, they aren't needed, as the `svg` element inherits styles from the icon component.
   */
  actionButtonIconSvg?: React.ReactNode;

  /**
   * Specifies alternate text for a custom icon. We recommend that you provide this for accessibility.
   * This property is ignored if you use a predefined icon or if you set your custom icon using the `iconSvg` slot.
   */
  actionButtonIconAlt?: string;

  /**
   * Adds an aria-label to the action button.
   * @i18n
   */
  actionButtonAriaLabel?: string;

  /**
   * Specifies whether to disable the action button.
   */
  disableActionButton?: boolean;

  /**
   * Specifies the minimum number of lines of text to set the height to.
   */
  minRows?: number;

  /**
   * Specifies the maximum number of lines of text the textarea will expand to.
   * Defaults to 3. Use -1 for infinite rows.
   */
  maxRows?: number;

  /**
   * Use this to replace the primary action.
   * If this is provided then any other `actionButton*` properties will be ignored.
   * Note that you should still provide an `onAction` function in order to handle keyboard submission.
   *
   * @awsuiSystem core
   */
  customPrimaryAction?: React.ReactNode;

  /**
   * Use this slot to add secondary actions to the prompt input.
   */
  secondaryActions?: React.ReactNode;

  /**
   * Use this slot to add secondary content, such as file attachments, to the prompt input.
   */
  secondaryContent?: React.ReactNode;

  /**
   * Determines whether the secondary actions area of the input has padding. If true, removes the default padding from the secondary actions area.
   */
  disableSecondaryActionsPaddings?: boolean;

  /**
   * Determines whether the secondary content area of the input has padding. If true, removes the default padding from the secondary content area.
   */
  disableSecondaryContentPaddings?: boolean;

  /**
   * Menus that can be triggered via specific symbols (e.g., "/" or "@").
   * For menus only relevant to triggers at the start of the input, set `useAtStart: true`, defaults to `false`.
   */
  menus?: PromptInputProps.MenuDefinition[];

  /**
   * Called whenever a user selects an option in the menu.
   */
  onMenuSelect?: NonCancelableEventHandler<PromptInputProps.MenuSelectDetail>;

  /**
   * Use this event to implement the asynchronous behavior for the menu.
   *
   * The event is called in the following situations:
   * - The user scrolls to the end of the list of options, if `statusType` is set to `pending`.
   * - The user clicks on the recovery button in the error state.
   * - The user types after the trigger character.
   * - The menu is opened.
   *
   * The detail object contains the following properties:
   * - `filteringText` - The value that you need to use to fetch options.
   * - `firstPage` - Indicates that you should fetch the first page of options that match the `filteringText`.
   * - `samePage` - Indicates that you should fetch the same page that you have previously fetched (for example, when the user clicks on the recovery button).
   */
  onMenuLoadItems?: NonCancelableEventHandler<PromptInputProps.MenuLoadItemsDetail>;

  /**
   * Provides a text alternative for the error icon in the error message in menus.
   * @i18n
   */
  menuErrorIconAriaLabel?: string;

  /**
   * Specifies the localized string that describes an option as being selected.
   * This is required to provide a good screen reader experience. For more information, see the
   * [accessibility guidelines](/components/prompt-input/?tabId=usage#accessibility-guidelines).
   * @i18n
   */
  selectedMenuItemAriaLabel?: string;

  /**
   * Overrides the element that is announced to screen readers in menus
   * when the highlighted option changes. By default, this announces
   * the option's name and properties, and its selected state if
   * the `selectedLabel` property is defined.
   * The highlighted option is provided, and its group (if groups
   * are used and it differs from the group of the previously highlighted option).
   *
   * For more information, see the
   * [accessibility guidelines](/components/prompt-input/?tabId=usage#accessibility-guidelines).
   */
  renderHighlightedMenuItemAriaLive?: AutosuggestProps.ContainingOptionAndGroupString;

  /**
   * Attributes to add to the native `textarea` element.
   * Some attributes will be automatically combined with internal attribute values:
   * - `className` will be appended.
   * - Event handlers will be chained, unless the default is prevented.
   *
   * We do not support using this attribute to apply custom styling.
   * If `tokens` is defined, nativeTextareaAttributes will be ignored.
   *
   * @awsuiSystem core
   */
  nativeTextareaAttributes?: NativeAttributes<React.TextareaHTMLAttributes<HTMLTextAreaElement>>;

  /**
   * @awsuiSystem core
   */
  style?: PromptInputProps.Style;
}

export namespace PromptInputProps {
  export type KeyDetail = BaseKeyDetail;

  export interface InputToken {
    type: 'text' | 'reference' | 'mode';
    id?: string;
    label?: string;
    value?: string;
  }

  export interface ChangeDetail {
    value?: string;
    tokens?: InputToken[];
    /**
     * @experimental Prototype feature - communicates mode detection.
     * Will be replaced by menu system in final implementation.
     */
    mode?: InputToken;
  }

  export interface ActionDetail {
    value?: string;
    tokens?: InputToken[];
  }

  export interface MenuSelectDetail {
    menuId: string;
    option: OptionDefinition;
  }

  export interface MenuLoadItemsDetail extends OptionsLoadItemsDetail {
    menuId: string;
  }

  export interface ModeChangeDetail {
    mode?: InputToken;
  }

  export interface MenuDefinition
    extends Omit<DropdownStatusProps, 'onLoadItems' | 'errorIconAriaLabel' | 'recoveryText'>,
      Pick<BaseDropdownHostProps, 'virtualScroll'> {
    /**
     * The unique identifier for this menu.
     */
    id: string;

    /**
     * The unique trigger symbol for showing this menu.
     */
    trigger: string;

    /**
     * Set `useAtStart=true` for menus where a trigger should only be detected at the start of input.
     */
    useAtStart?: boolean;

    /**
     * Specifies an array of options that are displayed to the user as a dropdown list.
     * The options can be grouped using `OptionGroup` objects.
     *
     * #### Option
     * - `value` (string) - The returned value of the option when selected.
     * - `label` (string) - (Optional) Option text displayed to the user.
     * - `lang` (string) - (Optional) The language of the option, provided as a BCP 47 language tag.
     * - `description` (string) - (Optional) Further information about the option that appears below the label.
     * - `disabled` (boolean) - (Optional) Determines whether the option is disabled.
     * - `labelTag` (string) - (Optional) A label tag that provides additional guidance, shown next to the label.
     * - `tags` [string[]] - (Optional) A list of tags giving further guidance about the option.
     * - `filteringTags` [string[]] - (Optional) A list of additional tags used for automatic filtering.
     * - `iconName` (string) - (Optional) Specifies the name of an [icon](/components/icon/) to display in the option.
     * - `iconAriaLabel` (string) - (Optional) Specifies alternate text for the icon. We recommend that you provide this for accessibility.
     * - `iconAlt` (string) - (Optional) **Deprecated**, replaced by \`iconAriaLabel\`. Specifies alternate text for a custom icon, for use with `iconUrl`.
     * - `iconUrl` (string) - (Optional) URL of a custom icon.
     * - `iconSvg` (ReactNode) - (Optional) Custom SVG icon. Equivalent to the `svg` slot of the [icon component](/components/icon/).
     *
     * #### OptionGroup
     * - `label` (string) - Option group text displayed to the user.
     * - `disabled` (boolean) - (Optional) Determines whether the option group is disabled.
     * - `options` (Option[]) - (Optional) The options under this group.
     *
     * Note: Only one level of option nesting is supported.
     *
     * If you want to use the built-in filtering capabilities of this component, provide
     * a list of all valid options here and they will be automatically filtered based on the user's filtering input.
     *
     * Alternatively, you can listen to the `onChange` or `onLoadItems` event and set new options
     * on your own.
     */
    options: OptionDefinition[];

    /**
     * Determines how filtering is applied to the list of `options`:
     *
     * * `auto` - The component will automatically filter options based on user input.
     * * `manual` - You will set up `onChange` or `onMenuLoadItems` event listeners and filter options on your side or request
     * them from server.
     *
     * By default the component will filter the provided `options` based on the value of the filtering input field.
     * Only options that have a `value`, `label`, `description` or `labelTag` that contains the input value as a substring
     * are displayed in the list of options.
     *
     * If you set this property to `manual`, this default filtering mechanism is disabled and all provided `options` are
     * displayed in the dropdown list. In that case make sure that you use the `onChange` or `onMenuLoadItems` events in order
     * to set the `options` property to the options that are relevant for the user, given the filtering input value.
     *
     * Note: Manual filtering doesn't disable match highlighting.
     **/
    filteringType?: Exclude<OptionsFilteringType, 'none'>;

    /**
     * Specifies the text for the recovery button. The text is displayed next to the error text.
     * Use the `onMenuLoadItems` event to perform a recovery action (for example, retrying the request).
     * @i18n
     */
    recoveryText?: string;
  }

  export interface Ref {
    /**
     * Sets input focus on the textarea control.
     */
    focus(): void;

    /**
     * Selects all text in the textarea control.
     */
    select(): void;

    /**
     * Selects a range of text in the textarea control.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement/setSelectionRange
     * for more details on this method. Be aware that using this method in React has some
     * common pitfalls: https://stackoverflow.com/questions/60129605/is-javascripts-setselectionrange-incompatible-with-react-hooks
     */
    setSelectionRange(start: number | null, end: number | null, direction?: 'forward' | 'backward' | 'none'): void;
  }

  export interface Style {
    root?: {
      backgroundColor?: {
        default?: string;
        disabled?: string;
        focus?: string;
        hover?: string;
        readonly?: string;
      };
      borderColor?: {
        default?: string;
        disabled?: string;
        focus?: string;
        hover?: string;
        readonly?: string;
      };
      borderRadius?: string;
      borderWidth?: string;
      boxShadow?: {
        default?: string;
        disabled?: string;
        focus?: string;
        hover?: string;
        readonly?: string;
      };
      color?: {
        default?: string;
        disabled?: string;
        focus?: string;
        hover?: string;
        readonly?: string;
      };
      fontSize?: string;
      fontWeight?: string;
      paddingBlock?: string;
      paddingInline?: string;
    };
    placeholder?: {
      color?: string;
      fontSize?: string;
      fontStyle?: string;
      fontWeight?: string;
    };
  }
}
