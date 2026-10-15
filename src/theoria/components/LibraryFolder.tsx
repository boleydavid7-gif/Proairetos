import { useEffect, useState } from 'react';
import { folderSupported, useBackupFolder } from '../../app/family/backupFolder';
import { browseCloud, chooseCloudFolder, chosenCloudFolder, cloudConnected, cloudsOffered, CLOUD_NAMES, connectCloud, disconnectCloud, dropboxWhole, type CloudEntry, type CloudFolder, type CloudProvider } from '../data/cloudLibrary';
import { chooseLibraryFolder, forgetLibraryFolder, LIBRARY_KEY } from '../data/libraryFolder';

const ICON_PATH = 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';
const icon = (path = ICON_PATH) => <span className="row__icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg></span>;

/** Folders of a connected storage, one level at a time, to choose the library folder. */
function FolderBrowser({ provider, onChosen, onClose }: { provider: CloudProvider; onChosen: (folder: CloudFolder) => void; onClose: () => void }) {
  const [trail, setTrail] = useState<{ id?: string; name: string; path?: string }[]>([{ name: CLOUD_NAMES[provider] }]);
  const [entries, setEntries] = useState<CloudEntry[]>();
  const [problem, setProblem] = useState<string>();
  const here = trail[trail.length - 1];
  useEffect(() => {
    let live = true;
    setEntries(undefined);
    setProblem(undefined);
    browseCloud(provider, here.id).then((found) => live && setEntries(found)).catch((error: unknown) => live && setProblem(error instanceof Error ? error.message : 'That did not open.'));
    return () => {
      live = false;
    };
  }, [provider, here.id]);
  const folders = entries?.filter((entry) => entry.isFolder) ?? [];
  const books = entries?.filter((entry) => !entry.isFolder && /\.(epub|pdf|txt|md|markdown)$/i.test(entry.name)).length ?? 0;
  return (
    <section className="card theoria-folder-browser" aria-label="Choose a folder">
      <div className="theoria-folder-browser__trail">
        {trail.map((step, index) => (
          <button key={`${step.id}-${index}`} type="button" className="text-link" disabled={index === trail.length - 1} onClick={() => setTrail(trail.slice(0, index + 1))}>{step.name}</button>
        ))}
      </div>
      {problem && <p className="hint" role="alert">{problem}</p>}
      {!entries && !problem && <p className="muted">Opening…</p>}
      {entries && (
        <ul className="rows">
          {folders.map((folder) => (
            <li key={folder.id}><button type="button" className="row" onClick={() => setTrail([...trail, { id: folder.id, name: folder.name, path: folder.path }])}>{icon()}<span className="row__text"><span>{folder.name}</span></span></button></li>
          ))}
          {!folders.length && <li><p className="muted theoria-folder-browser__empty">No folders inside.</p></li>}
        </ul>
      )}
      {entries && <p className="muted">{books === 0 ? 'No books directly in this folder.' : books === 1 ? 'One book directly in this folder.' : `${books} books directly in this folder.`} Subfolders are read too.</p>}
      <div className="button-row">
        <button type="button" className="button-quiet" onClick={onClose}>Cancel</button>
        {here.id !== undefined || provider === 'dropbox' ? (
          <button type="button" className="button-main" onClick={() => onChosen({ provider, id: here.id ?? '', name: here.name, path: here.path ?? (provider === 'dropbox' && !here.id ? '' : undefined) })}>Use “{here.name}”</button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Settings > Library folder: a folder in OneDrive, Google Drive or Dropbox (any device), or one on this computer
 * (Chrome, Edge). Theoria looks through it whenever it opens and brings in new books.
 */
export function LibraryFolder({ onCheck, returned, booksFromFolder }: { onCheck: () => Promise<string | undefined>; returned?: CloudProvider; booksFromFolder: boolean }) {
  const [clouds, setClouds] = useState<CloudProvider[]>([]);
  const [whole, setWhole] = useState(true);
  const [cloud, setCloud] = useState(chosenCloudFolder);
  const [browsing, setBrowsing] = useState<CloudProvider | undefined>(returned);
  const [said, setSaid] = useState<string>();
  const [busy, setBusy] = useState(false);
  const local = useBackupFolder(LIBRARY_KEY);
  useEffect(() => {
    void cloudsOffered().then(setClouds);
    void dropboxWhole().then(setWhole);
  }, []);
  useEffect(() => {
    if (returned) setBrowsing(returned);
  }, [returned]);

  const check = async () => {
    setBusy(true);
    setSaid(undefined);
    try {
      setSaid((await onCheck()) ?? 'Done.');
    } catch (error) {
      setSaid(error instanceof Error ? error.message : 'That did not finish.');
    } finally {
      setBusy(false);
    }
  };
  const start = (provider: CloudProvider) => {
    setSaid(undefined);
    if (cloudConnected(provider)) setBrowsing(provider);
    else void connectCloud(provider).catch((error: unknown) => setSaid(error instanceof Error ? error.message : 'That did not open.'));
  };

  if (browsing) {
    return (
      <FolderBrowser
        provider={browsing}
        onClose={() => setBrowsing(undefined)}
        onChosen={(folder) => {
          chooseCloudFolder(folder);
          setCloud(folder);
          setBrowsing(undefined);
          void check();
        }}
      />
    );
  }

  const connectedHere = cloud ? cloudConnected(cloud.provider) : false;
  return (
    <>
      <ul className="rows">
        {cloud && (
          <li>
            <button type="button" className="row" disabled={busy} onClick={() => (connectedHere ? void check() : start(cloud.provider))}>
              {icon()}
              <span className="row__text">
                <span>{cloud.name}</span>
                <span className="row__detail">{connectedHere ? `${CLOUD_NAMES[cloud.provider]} · ${busy ? 'looking…' : 'look for new books now'}` : `${CLOUD_NAMES[cloud.provider]} · connect it on this device too`}</span>
              </span>
            </button>
          </li>
        )}
        {local.name && (
          <li>
            <button type="button" className="row" disabled={busy} onClick={() => void check()}>
              {icon('M4 5h16v11H4zM2 19h20')}
              <span className="row__text"><span>{local.name}</span><span className="row__detail">On this computer · {busy ? 'looking…' : 'look for new books now'}</span></span>
            </button>
          </li>
        )}
        {!cloud && clouds.map((provider) => (
          <li key={provider}>
            <button type="button" className="row" onClick={() => start(provider)}>
              {icon('M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.5A3.5 3.5 0 0 1 17.5 18z')}
              <span className="row__text"><span>A folder in {CLOUD_NAMES[provider]}</span><span className="row__detail">{provider === 'dropbox' && !whole ? 'Inside Apps › the app folder' : cloudConnected(provider) ? 'Connected here' : 'On any device'}</span></span>
            </button>
          </li>
        ))}
        {folderSupported() && !local.name && (
          <li>
            <button type="button" className="row" onClick={() => void chooseLibraryFolder().then((name) => { if (name) void check(); }).catch(() => undefined)}>
              {icon('M4 5h16v11H4zM2 19h20')}
              <span className="row__text"><span>A folder on this computer</span><span className="row__detail">Read when Theoria opens here</span></span>
            </button>
          </li>
        )}
      </ul>
      {said && <p className="muted" role="status">{said}</p>}
      {!cloud && !local.name && !clouds.length && !folderSupported() && <p className="muted">{booksFromFolder ? 'Books from your library folder come here through your account.' : 'A library folder needs OneDrive, Google Drive or Dropbox set up on this site.'}</p>}
      {(cloud || local.name) && (
        <div className="button-row">
          {cloud && <button type="button" className="text-link" onClick={() => (cloudConnected(cloud.provider) ? setBrowsing(cloud.provider) : start(cloud.provider))}>Choose another folder</button>}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (cloud) {
                chooseCloudFolder(undefined);
                disconnectCloud(cloud.provider);
                setCloud(undefined);
              }
              if (local.name) void forgetLibraryFolder();
              setSaid('Stopped. The books already in stay on your shelf.');
            }}
          >
            Stop using it
          </button>
        </div>
      )}
    </>
  );
}

/** Settings > Your storage: the cloud storages this device reads books from, connected or not. */
export function CloudConnections() {
  const [clouds, setClouds] = useState<CloudProvider[]>([]);
  const [turn, setTurn] = useState(0);
  const [problem, setProblem] = useState<string>();
  useEffect(() => {
    void cloudsOffered().then(setClouds);
  }, []);
  if (!clouds.length) return null;
  return (
    <>
      <ul className="rows" key={turn}>
        {clouds.map((provider) => {
          const connected = cloudConnected(provider);
          return (
            <li key={provider}>
              <button
                type="button"
                className="row"
                role={connected ? 'switch' : undefined}
                aria-checked={connected ? true : undefined}
                onClick={() => {
                  setProblem(undefined);
                  if (connected) {
                    disconnectCloud(provider);
                    setTurn(turn + 1);
                  } else void connectCloud(provider, 'books').catch((error: unknown) => setProblem(error instanceof Error ? error.message : 'That did not open.'));
                }}
              >
                {icon('M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.5A3.5 3.5 0 0 1 17.5 18z')}
                <span className="row__text">
                  <span>{CLOUD_NAMES[provider]}</span>
                  <span className="row__detail">{connected ? 'Books not on this device come from here' : 'Connect, read only'}</span>
                </span>
                <span className={`switch${connected ? ' switch--on' : ''}`} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {problem && <p className="hint" role="alert">{problem}</p>}
    </>
  );
}
