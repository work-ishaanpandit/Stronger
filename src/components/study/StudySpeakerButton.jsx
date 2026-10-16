import { Volume2, VolumeX, BellRing } from 'lucide-react';
import useStore from '../../store/useStore';
import { playConfirmationChime, stopTimerBuzzer, unlockAudioContext } from '../../utils/studyBuzzer';

export default function StudySpeakerButton({
  isBuzzing = false,
  onStopBuzzing,
  themeColor = 'var(--blue)',
  size = 'md', // 'sm' | 'md'
}) {
  const studySoundAlertEnabled = useStore((s) => s.studySoundAlertEnabled ?? true);
  const toggleStudySoundAlert = useStore((s) => s.toggleStudySoundAlert);

  const handleClick = (e) => {
    e.stopPropagation();

    // If currently buzzing, clicking the button silences it immediately
    if (isBuzzing) {
      stopTimerBuzzer();
      if (onStopBuzzing) onStopBuzzing();
      return;
    }

    unlockAudioContext();
    const willBeEnabled = !studySoundAlertEnabled;
    toggleStudySoundAlert();

    if (willBeEnabled) {
      playConfirmationChime();
    } else {
      stopTimerBuzzer();
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`btn ${isBuzzing ? 'btn-warning anim-pulse' : 'btn-ghost'}`}
      title={
        isBuzzing
          ? 'Timer ended! Buzzing device (click to silence)'
          : studySoundAlertEnabled
          ? 'Timer Alert: ON (buzzes device for 5s when countdown reaches 0)'
          : 'Timer Alert: MUTED (stays quiet when countdown reaches 0)'
      }
      aria-label={
        isBuzzing
          ? 'Silence timer buzzer'
          : studySoundAlertEnabled
          ? 'Mute timer buzzer'
          : 'Enable timer buzzer'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 5 : 7,
        padding: isSmall ? '3px 8px' : '5px 12px',
        borderRadius: 'var(--radius-full)',
        border: isBuzzing
          ? '1px solid var(--orange)'
          : studySoundAlertEnabled
          ? `1px solid ${themeColor}`
          : '1px solid var(--border)',
        background: isBuzzing
          ? 'rgba(234, 88, 12, 0.2)'
          : studySoundAlertEnabled
          ? 'rgba(255, 255, 255, 0.04)'
          : 'transparent',
        color: isBuzzing
          ? 'var(--orange)'
          : studySoundAlertEnabled
          ? themeColor
          : 'var(--text-tertiary)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      {isBuzzing ? (
        <>
          <BellRing size={isSmall ? 13 : 16} className="anim-wiggle" />
          <span style={{ fontSize: isSmall ? 11 : 12, fontWeight: 600 }}>
            Buzzing (Silence)
          </span>
        </>
      ) : studySoundAlertEnabled ? (
        <>
          <Volume2 size={isSmall ? 14 : 16} />
          <span style={{ fontSize: isSmall ? 11 : 12, fontWeight: 500 }}>
            Alert On
          </span>
        </>
      ) : (
        <>
          <VolumeX size={isSmall ? 14 : 16} />
          <span style={{ fontSize: isSmall ? 11 : 12, fontWeight: 500 }}>
            Quiet
          </span>
        </>
      )}
    </button>
  );
}
