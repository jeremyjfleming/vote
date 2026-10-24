import type { FormGroupConfig } from '../../lib/types.ts';
import theologyNight from './theology-night.ts';

// Forms for this group live at /cru/<form-id>. Order here is the order on /cru.
export default {
  id: 'cwru-cru',
  name: 'CWRU Cru',
  forms: [theologyNight],
} satisfies FormGroupConfig;
