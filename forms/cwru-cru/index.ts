import type { FormGroupConfig } from '../../lib/types.ts';
import lifegroupSurvey from './lifegroup-survey.ts';
import theologyNight from './theology-night.ts';

// Forms for this group live at /cwru-cru/<form-id>. Order here is the order on /cwru-cru.
export default {
  id: 'cwru-cru',
  name: 'CWRU Cru',
  timeZone: 'America/New_York',
  forms: [lifegroupSurvey, theologyNight],
} satisfies FormGroupConfig;
