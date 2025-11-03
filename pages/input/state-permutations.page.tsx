// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';

import Input, { InputProps } from '~components/input';

import createPermutations from '../utils/permutations';
import PermutationsView from '../utils/permutations-view';
import ScreenshotArea from '../utils/screenshot-area';

const permutations = createPermutations<InputProps>([
  {
    value: ['This is an example value'],
    placeholder: ['This is an example placeholder'],
    disabled: [false, true],
    invalid: [false, true],
    readOnly: [false, true],
    warning: [false, true],
    onChange: [() => {}],
  },
]);

export default function InputStylePermutations() {
  return (
    <>
      <h1>Input Style permutations</h1>
      <ScreenshotArea disableAnimations={true}>
        <PermutationsView
          permutations={permutations}
          render={permutation => <Input ariaLabel="Input field" {...permutation} />}
        />
      </ScreenshotArea>
    </>
  );
}
