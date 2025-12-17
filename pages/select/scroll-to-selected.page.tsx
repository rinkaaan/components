// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useContext, useState } from 'react';

import { SpaceBetween } from '~components';
import Select, { SelectProps } from '~components/select';

import AppContext, { AppContextType } from '../app/app-context';
import ScreenshotArea from '../utils/screenshot-area';

const generateOptions = (count: number): SelectProps.Options => {
  return Array.from({ length: count }, (_, i) => ({
    value: `option-${i + 1}`,
    label: `Option ${i + 1}`,
  }));
};

type PageContext = React.Context<
  AppContextType<{
    filterEnabled?: boolean;
  }>
>;

export default function () {
  const { urlParams, setUrlParams } = useContext(AppContext as PageContext);
  const filterEnabled = urlParams.filterEnabled ?? true;

  const options = generateOptions(50);
  const [selected, setSelected] = useState<SelectProps['selectedOption']>(options[25]);

  return (
    <>
      <h1>Select scroll to selected option</h1>
      <SpaceBetween size="l">
        <button id="toggle-virtual" onClick={() => setUrlParams({ filterEnabled: !filterEnabled })}>
          Toggle filter ({filterEnabled ? 'on' : 'off'})
        </button>

        <ScreenshotArea
          style={{
            // extra space to include dropdown in the screenshot area
            paddingBlockEnd: 300,
          }}
        >
          <div>
            <Select
              data-testid="select-demo"
              ariaLabel="select demo"
              selectedOption={selected}
              options={options}
              onChange={event => setSelected(event.detail.selectedOption)}
              filteringType={filterEnabled ? 'auto' : 'none'}
            />
          </div>
        </ScreenshotArea>
      </SpaceBetween>
    </>
  );
}
