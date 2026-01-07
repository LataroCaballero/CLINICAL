'use client';

import { useState } from 'react';
import { TemplateList } from './TemplateList';
import { TemplateBuilder } from './TemplateBuilder';
import type { HCTemplateWithVersions } from '@/types/hc-templates';

export function GestionPlantillasHC() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<HCTemplateWithVersions | null>(null);

  if (selectedTemplate) {
    return (
      <TemplateBuilder
        templateId={selectedTemplate.id}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  return <TemplateList onSelectTemplate={setSelectedTemplate} />;
}

export { TemplateList } from './TemplateList';
export { TemplateBuilder } from './TemplateBuilder';
export { NodeList } from './NodeList';
export { NodePropertiesEditor } from './NodePropertiesEditor';
export { EdgeEditor } from './EdgeEditor';
