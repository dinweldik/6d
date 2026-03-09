import { useCallback, useRef, type TouchEvent } from "react";

import { isInteractiveTouchTarget } from "./touchTargets";

const DEFAULT_MIN_SWIPE_DISTANCE_PX = 56;
const DEFAULT_DIRECTION_LOCK_RATIO = 1.15;
const DEFAULT_MAX_VERTICAL_DRIFT_PX = 72;

interface HorizontalSwipeState {
  readonly startX: number;
  readonly startY: number;
}

export function useHorizontalSwipe(input: {
  readonly enabled: boolean;
  readonly onSwipeLeft?: () => void;
  readonly onSwipeRight?: () => void;
  readonly minSwipeDistancePx?: number;
  readonly maxVerticalDriftPx?: number;
  readonly directionLockRatio?: number;
  readonly ignoreInteractiveTargets?: boolean;
}) {
  const stateRef = useRef<HorizontalSwipeState | null>(null);
  const triggeredRef = useRef(false);
  const enabled = input.enabled;
  const minSwipeDistancePx = input.minSwipeDistancePx ?? DEFAULT_MIN_SWIPE_DISTANCE_PX;
  const maxVerticalDriftPx = input.maxVerticalDriftPx ?? DEFAULT_MAX_VERTICAL_DRIFT_PX;
  const directionLockRatio = input.directionLockRatio ?? DEFAULT_DIRECTION_LOCK_RATIO;
  const ignoreInteractiveTargets = input.ignoreInteractiveTargets ?? true;
  const onSwipeLeft = input.onSwipeLeft;
  const onSwipeRight = input.onSwipeRight;

  const clearGestureState = useCallback(() => {
    stateRef.current = null;
    triggeredRef.current = false;
  }, []);

  const onTouchStartCapture = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      clearGestureState();
      if (!enabled || event.touches.length !== 1) {
        return;
      }
      if (ignoreInteractiveTargets && isInteractiveTouchTarget(event.target)) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;

      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
      };
    },
    [clearGestureState, enabled, ignoreInteractiveTargets],
  );

  const onTouchMoveCapture = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (triggeredRef.current) {
        return;
      }

      const gesture = stateRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch) {
        return;
      }

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaY > maxVerticalDriftPx && absDeltaY >= absDeltaX) {
        clearGestureState();
        return;
      }
      if (absDeltaX < minSwipeDistancePx) {
        return;
      }
      if (absDeltaX < absDeltaY * directionLockRatio) {
        return;
      }

      triggeredRef.current = true;
      if (deltaX < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
      clearGestureState();
    },
    [
      clearGestureState,
      directionLockRatio,
      maxVerticalDriftPx,
      minSwipeDistancePx,
      onSwipeLeft,
      onSwipeRight,
    ],
  );

  const onTouchEndCapture = useCallback(() => {
    clearGestureState();
  }, [clearGestureState]);

  return {
    onTouchCancelCapture: onTouchEndCapture,
    onTouchEndCapture,
    onTouchMoveCapture,
    onTouchStartCapture,
  };
}
