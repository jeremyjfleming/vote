// Register groups here. Each group is a folder in forms/ with an index.ts that
// lists its forms (copy forms/cwru-cru as a starting point). A group's forms live at
// /<group-id>/<form-id>.
import type { FormGroupConfig } from '../lib/types.ts';
import cru from './cwru-cru/index.ts';

const groups: FormGroupConfig[] = [cru];

export default groups;
