import { useState, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';
import { playTimerBuzzer, stopTimerBuzzer } from '../../utils/studyBuzzer';

/**
 * Custom hook to monitor phase countdown timer and trigger a 5-second buzzer
 * upon timer expiry when the speaker toggle is ON.
 * 
 * @param {Object} currentPhase Active study phase record
 * @param {Object} timing Timing metrics calculated from calculatePhaseTiming
 */
export function useStudyTimerAlert(currentPhase, timing) {
  const studySoundAlertEnabled = useStore((s) => s.studySoundAlertEnabled);
  const toggleStudySoundAlert = useStore((s) => s.toggleStudySoundAlert);

  const [isBuzzing, setIsBuzzing] = useState(false);
  const alertedPhaseIdRef = useRef(null);
  const initialMountRef = useRef(true);

  // Guard against buzzing on initial page load if the phase is already well into overtime
  useEffect(() => {
    if (initialMountRef.current && currentPhase?.id) {
      initialMountRef.current = false;
      if (timing.isOvertime && timing.overtimeSeconds > 3) {
        // Phase was already expired in the past before this screen opened
        alertedPhaseIdRef.current = currentPhase.id;
      }
    }
  }, [currentPhase?.id]);

  // Monitor timer expiry
  useEffect(() => {
    if (!currentPhase || !currentPhase.id) return;

    // Stop buzzing if phase gets paused or completed
    if (timing.isPaused || currentPhase.status === 'completed' || currentPhase.status === 'interrupted') {
      if (isBuzzing) {
        stopTimerBuzzer();
        setIsBuzzing(false);
      }
      return;
    }

    const hasExpired = timing.isOvertime && !timing.isPaused;

    if (hasExpired) {
      if (alertedPhaseIdRef.current !== currentPhase.id) {
        alertedPhaseIdRef.current = currentPhase.id;

        if (studySoundAlertEnabled) {
          setIsBuzzing(true);
          playTimerBuzzer(5000, () => {
            setIsBuzzing(false);
          });
        }
      }
    } else {
      // Countdown still running before expiry; ensure ready to alert when reaching 0
      if (alertedPhaseIdRef.current === currentPhase.id) {
        alertedPhaseIdRef.current = null;
      }
    }
  }, [
    currentPhase?.id,
    currentPhase?.status,
    timing.isOvertime,
    timing.isPaused,
    timing.overtimeSeconds,
    studySoundAlertEnabled,
    isBuzzing,
  ]);

  // Stop buzzing if unmounting or phase changes
  useEffect(() => {
    return () => {
      stopTimerBuzzer();
      setIsBuzzing(false);
    };
  }, [currentPhase?.id]);

  const handleStopBuzzing = () => {
    stopTimerBuzzer();
    setIsBuzzing(false);
  };

  return {
    isBuzzing,
    studySoundAlertEnabled,
    toggleStudySoundAlert,
    stopBuzzing: handleStopBuzzing,
  };
}
