import { useState } from 'react';
import SearchSheet from '../../features/search/SearchSheet';
import { SearchIcon } from '../icons/Icons';
import { IconButton } from '../../lamplight/icons';

/** Search, beside the gear on every main tab. */
export default function SearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label="Search" className="header-action" onClick={() => setOpen(true)}>
        <SearchIcon size={22} />
      </IconButton>
      {open && <SearchSheet onClose={() => setOpen(false)} />}
    </>
  );
}
