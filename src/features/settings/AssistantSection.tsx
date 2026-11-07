import { setAssistantOn, useAssistantOn } from '../../app/assistant/webmcp';

/** Settings > The app > Browser assistant: whether the browser's own assistant may use the to-do list. */
export default function AssistantSection() {
  const on = useAssistantOn();
  return (
    <section className="settings-card">
      <button type="button" className="toggle-row" aria-pressed={on} onClick={() => setAssistantOn(!on)}>
        <span className={`toggle-switch${on ? ' toggle-switch--on' : ''}`} aria-hidden="true" />
        <span>Let the assistant use my to-dos</span>
      </button>
      <p className="section-description">
        It can read your open to-dos and add or finish them, each with an undo. What it reads goes through the browser’s own AI. Nothing
        from Reflect, your journal, health or other apps.
      </p>
    </section>
  );
}
