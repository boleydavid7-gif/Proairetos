import type { AppId } from '../../core/apps/manifest';
import type { Provider } from '../../core/providers';

/*
 * Where each app's provider module is. The manifest says which apps provide what (`provides`); this only supplies the
 * code for an id the manifest already declares, loaded when it is needed. A test holds the two together.
 */
type Module = { providers: readonly Provider[] };

export const providerModules: Partial<Record<AppId, () => Promise<Module>>> = {
  oikonomia: () => import('../../oikonomia/providers'),
  hydros: () => import('../../hydros/providers'),
  ktema: () => import('../../ktema/providers'),
  therapeia: () => import('../../therapeia/providers'),
  ergon: () => import('../../ergon/providers'),
  philia: () => import('../../philia/providers'),
  theoria: () => import('../../theoria/providers'),
  soma: () => import('../../soma/providers'),
};
