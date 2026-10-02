import { useState } from 'react';
import SearchSheet from '../../features/search/SearchSheet';
import { SearchIcon } from '../icons/Icons';

/** Search, beside the gear on every main tab. */
export default function SearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="header-action" aria-label="Search" onClick={() => setOpen(true)}>
        <SearchIcon size={22} />
      </button>
      {open && <SearchSheet onClose={() => setOpen(false)} />}
    </>
  );
}
