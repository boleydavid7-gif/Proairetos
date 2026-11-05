import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';

/** Account, backups and the family list (with Send feedback), as in every other app's More. */
export default function MorePage() {
  return (
    <div className="page melete-page">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Meletē" what="Your subjects and sessions" waiting="Study" />
      <section>
        <p className="label">Your data</p>
        <FamilyBackup />
      </section>
      <FamilyApps current="melete" />
    </div>
  );
}
