import React from 'react';
import { useTranslation } from 'react-i18next';
import { isSampleMaterial } from '../../services/planning/publishedMaterial';

// SDC-5 · the marker a generated sample material carries wherever it is named
// to a person. ONE component, so a surface cannot name a sample material and
// forget to say so — and it decides by the generator's own set, never by the
// `SIM-` prefix. Renders nothing for a material the real master names.
const SampleMaterialTag: React.FC<{ materialCode: string }> = ({ materialCode }) => {
  const { t } = useTranslation();
  if (!isSampleMaterial(materialCode)) return null;
  return (
    <span
      data-testid="sample-material-tag"
      className="inline-flex items-center rounded-sm border border-border-subtle bg-bg-hover px-1.5 py-0.5 text-[11px] font-medium text-text-secondary"
    >
      {t('sdc.material.sample')}
    </span>
  );
};

export default SampleMaterialTag;
