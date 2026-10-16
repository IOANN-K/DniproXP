import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useVolunteerState } from "../lib/use-volunteer";
export function PlatformToast() {
  const state = useVolunteerState();
  const before = useRef(state.revision);
  const previousEvent = useRef(state.activity[0]?.id);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (state.revision !== before.current) {
      const event = state.activity[0];
      if (event && event.id !== previousEvent.current)
        setNotice({ id: state.revision, text: event.title });
      previousEvent.current = event?.id;
      before.current = state.revision;
    }
  }, [state.revision, state.activity]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  return notice ? (
    <div className="platform-toast" role="status">
      <CheckCircle2 size={22} />
      <p>{notice.text}</p>
      <button onClick={() => setNotice(null)} aria-label="Закрити сповіщення">
        <X size={18} />
      </button>
    </div>
  ) : null;
}
