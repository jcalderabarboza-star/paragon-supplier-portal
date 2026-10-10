import React from 'react';
import { useTranslation } from 'react-i18next';
import { isSampleMaterial } from '../../services/planning/publishedMaterial';
import StatusPill from './StatusPill';

// SDC-5 · the marker a generated sample material carries wherever it is named
// to a person. ONE component, so a surface cannot name a sample material and
// forget to say so — and it decides by the generator's own set, never by the
// `SIM-` prefix. Renders nothing for a material the real master names.
const SampleMaterialTag: React.FC<{ materialCode: string }> = ({ materialCode }) => {
  const { t } = useTranslation();
  if (!isSampleMaterial(materialCode)) return null;
  return (
    <StatusPill variant="neutral" size="sm" data-testid="sample-material-tag">
      {t('sdc.material.sample')}
    </StatusPill>
  );
};

export default SampleMaterialTag;
