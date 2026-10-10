import { describe, expect, it } from 'vitest';
import { addFix, between, paused, readActivityFile, type Track } from '../../askesis/core/track';
import { toLocalDate } from '../../core/scheduling/dates';

// About 111 m per 0.001 degree of latitude.
const fix = (north: number, seconds: number, accuracy = 5) => ({ lat: 51.5 + north * 0.001, lon: -0.12, at: seconds * 1000, accuracy });

describe('distance from the phone while running', () => {
  it('measures between points', () => {
    expect(between({ lat: 51.5, lon: -0.12 }, { lat: 51.501, lon: -0.12 })).toBeCloseTo(111.2, 0);
  });

  it('adds steady steps and leaves out rough fixes and jumps', () => {
    let track: Track = { meters: 0 };
    track = addFix(track, fix(0, 0));
    track = addFix(track, fix(1, 30)); // 111 m in 30 s: a run
    track = addFix(track, fix(5, 31, 80)); // rough: ignored
    track = addFix(track, fix(20, 32)); // 2 km in a second: a jump, starts afresh
    track = addFix(track, fix(21, 62));
    expect(track.meters).toBeGreaterThan(220);
    expect(track.meters).toBeLessThan(225);
  });

  it('adds nothing while standing still', () => {
    let track: Track = { meters: 0 };
    for (let second = 0; second < 60; second += 5) track = addFix(track, { lat: 51.5 + (second % 2) * 0.00001, lon: -0.12, at: second * 1000, accuracy: 8 });
    expect(track.meters).toBe(0);
  });

  it('starts afresh after a pause', () => {
    let track: Track = addFix(addFix({ meters: 0 }, fix(0, 0)), fix(1, 30));
    track = paused(track);
    track = addFix(track, fix(10, 600));
    expect(track.meters).toBeCloseTo(111.2, 0);
  });
});

describe('a run from a watch file', () => {
  it('reads a GPX track: day, time and distance', () => {
    const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="Watch"><trk><type>running</type><trkseg>
      <trkpt lat="51.5" lon="-0.12"><time>2026-10-08T06:00:00Z</time></trkpt>
      <trkpt lat="51.501" lon="-0.12"><time>2026-10-08T06:00:40Z</time></trkpt>
      <trkpt lat="51.502" lon="-0.12"><time>2026-10-08T06:01:20Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const read = readActivityFile(gpx, toLocalDate)!;
    expect(read.activity).toBe('run');
    expect(read.seconds).toBe(80);
    expect(read.meters).toBe(222);
    expect(read.startedAt).toBe('2026-10-08T06:00:00.000Z');
  });

  it('reads a TCX file, trusting the watch’s own totals', () => {
    const tcx = `<TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>2026-10-09T17:30:00Z</Id>
      <Lap StartTime="2026-10-09T17:30:00Z"><TotalTimeSeconds>1500</TotalTimeSeconds><DistanceMeters>4020.5</DistanceMeters>
        <Track><Trackpoint><Time>2026-10-09T17:30:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint></Track></Lap>
      <Lap StartTime="2026-10-09T17:55:00Z"><TotalTimeSeconds>300</TotalTimeSeconds><DistanceMeters>600</DistanceMeters></Lap>
    </Activity></Activities></TrainingCenterDatabase>`;
    const read = readActivityFile(tcx, toLocalDate)!;
    expect(read).toMatchObject({ activity: 'run', seconds: 1800, meters: 4621 });
  });

  it('says nothing for a file that is not an activity', () => {
    expect(readActivityFile('<html>hello</html>', toLocalDate)).toBeUndefined();
  });
});
