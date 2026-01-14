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
interface RenderLatestFeaturePromptProps {
  triggerRef: RefObject<HTMLElement>;
}
export interface FeatureNotificationsProps {
  renderLatestFeaturePrompt: RenderLatestFeaturePrompt;
  drawerId?: string | null;
}

export type RenderLatestFeaturePrompt = (props: RenderLatestFeaturePromptProps) => JSX.Element | null;

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
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const features = payload.features
        .slice()
        .filter(
          payload.filterFeatures
            ? payload.filterFeatures
            : feature => {
                return feature.releaseDate >= ninetyDaysAgo;
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

  function renderLatestFeaturePrompt({ triggerRef }: RenderLatestFeaturePromptProps) {
    if (!(triggerRef && featureNotificationsData && latestFeature)) {
      return null;
    }
    return (
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
    );
  }

  const featureNotificationsProps: FeatureNotificationsProps = {
    renderLatestFeaturePrompt,
    drawerId: featureNotificationsData?.id,
  };

  return {
    featureNotificationsProps,
    featureNotificationsMessageHandler,
  };
}
