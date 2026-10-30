import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';

/** Account, backups and the family list (with Send feedback), as in every other app's More. */
export default function MorePage() {
  return (
    <main className="mneme-page mneme-more">
      <div className="page-top"><h1 className="title">More</h1></div>
      <AccountCard app="Mneme" what="Your notes" waiting="Notes" />
      <section>
        <p className="label">Your data</p>
        <FamilyBackup />
      </section>
      <FamilyApps current="mneme" />
    </main>
  );
}
