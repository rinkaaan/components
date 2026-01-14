// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React, { RefObject, useEffect, useRef, useState } from 'react';

import FeaturePrompt, { FeaturePromptProps } from '../../../internal/do-not-use/feature-prompt';
import awsuiPlugins from '../../../internal/plugins';
import { Feature, FeatureNotificationsPayload, WidgetMessage } from '../../../internal/plugins/widget/interfaces';
import RuntimeFeaturesNotificationDrawer, { RuntimeContentPart } from '../drawer/feature-notifications-drawer-content';
interface UseFeatureNotificationsProps {
  activeDrawersIds: Array<string>;
}
export interface RenderLatestFeaturePromptProps {
  triggerRef: RefObject<HTMLElement>;
}
interface RenderLatestFeaturePromptReturns {
  element: JSX.Element | null;
  drawerId?: string | null;
}

export type RenderLatestFeaturePrompt = (
  props: RenderLatestFeaturePromptProps
) => RenderLatestFeaturePromptReturns | null;

// TODO replace with a real continuum request
const delay = () =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(1);
    }, 200);
  });

export function useFeatureNotifications({ activeDrawersIds }: UseFeatureNotificationsProps) {
  const [markAllAsRead, setMarkAllAsRead] = useState(false);
  const [featurePromptDismissed, setFeaturePromptDismissed] = useState(false);
  const [featureNotificationsData, setFeatureNotificationsData] = useState<FeatureNotificationsPayload<unknown> | null>(
    null
  );
  const featurePromptRef = useRef<FeaturePromptProps.Ref>(null);
  let latestFeature: Feature<unknown> | null = null;
  if (featureNotificationsData) {
    latestFeature = featureNotificationsData.features![0];
  }

  useEffect(() => {
    if (!featureNotificationsData || markAllAsRead) {
      return;
    }
    const id = featureNotificationsData.id;
    if (activeDrawersIds.includes(id)) {
      // TODO make a request to continuum and mark all notifications as read
      awsuiPlugins.appLayout.updateDrawer({ id, badge: false });
      setMarkAllAsRead(true);
      return;
    }
    // call continuum to determine if all notifications were read, if not, show the badge and trigger the feature prompt
    delay().then(() => {
      if (!featureNotificationsData.suppressFeaturePrompt && !featurePromptDismissed) {
        featurePromptRef.current?.show();
      }
      // awsuiPlugins.appLayout.updateDrawer({ id, badge: true });
    });
  }, [featureNotificationsData, activeDrawersIds, markAllAsRead, featurePromptDismissed]);

  function featureNotificationsMessageHandler(event: WidgetMessage) {
    if (event.type === 'registerFeatureNotifications') {
      const payload = event.payload;
      setFeatureNotificationsData(payload);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const features = payload.features
        .slice()
        .filter(
          payload.filterFeatures
            ? payload.filterFeatures
            : feature => {
                return feature.releaseDate >= thirtyDaysAgo;
              }
        )
        .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
      // TODO pass correct properties
      awsuiPlugins.appLayout.registerDrawer({
        id: payload.id,
        defaultActive: false,
        resizable: true,
        defaultSize: 320,

        ariaLabels: {
          closeButton: 'Close button',
          content: 'Content',
          triggerButton: 'Trigger button',
          resizeHandle: 'Resize handle',
        },

        trigger: { __iconName: 'suggestions' },
        mountContent: () => {},
        unmountContent: () => {},

        __content: (
          <RuntimeFeaturesNotificationDrawer
            features={features}
            featuresPageLink={payload.featuresPageLink}
            mountItem={payload.mountItem}
          />
        ),
      });
      return;
    }

    if (event.type === 'showFeaturePromptIfPossible') {
      if (markAllAsRead) {
        return;
      }
      featurePromptRef.current?.show();
      return;
    }
  }

  function renderLatestFeaturePrompt({
    triggerRef,
  }: RenderLatestFeaturePromptProps): RenderLatestFeaturePromptReturns | null {
    if (!(triggerRef && featureNotificationsData && latestFeature)) {
      return null;
    }
    return {
      element: (
        <FeaturePrompt
          ref={featurePromptRef}
          onShow={() => {
            triggerRef.current!.dataset!.awsuiSuppressTooltip = 'true';
          }}
          onDismiss={() => {
            triggerRef.current!.dataset!.awsuiSuppressTooltip = 'false';
            setFeaturePromptDismissed(true);
          }}
          header={
            <RuntimeContentPart mountContent={featureNotificationsData?.mountItem} content={latestFeature.header} />
          }
          content={
            <RuntimeContentPart mountContent={featureNotificationsData?.mountItem} content={latestFeature.content} />
          }
          trackKey={latestFeature.id}
          position="left"
          getTrack={() => triggerRef.current}
        />
      ),
      drawerId: featureNotificationsData.id,
    };
  }

  return {
    renderLatestFeaturePrompt,
    featureNotificationsMessageHandler,
  };
}
