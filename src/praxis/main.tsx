// Praxis is retired: its study room lives in Theoria as Pomodoro. An installed Praxis, an old link or a notice
// lands here and is sent on, keeping what the link asked for (`?open=sessions` opens Pomodoro's Sessions).
const asked = new URLSearchParams(location.search).get('open');
const wanted = asked && asked !== 'start' && asked !== 'today' ? `pomodoro:${asked}` : 'pomodoro';
location.replace(`/theoria/?open=${encodeURIComponent(wanted)}`);
export {};
