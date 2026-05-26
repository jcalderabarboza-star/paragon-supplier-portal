import React from 'react';
import { User } from 'lucide-react';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';

const NoSupplierIdentity: React.FC = () => (
  <AppShellV2>
    <PageHeader
      breadcrumb={['SUPPLIER']}
      title="No supplier identity in session"
      subtitle="Supplier pages require a supplier identity. Use the persona toggle in the sidebar to switch to Supplier mode."
    />
    <div className="py-16 px-6 flex flex-col items-center text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
        <User size={24} className="text-text-tertiary" />
      </div>
      <div className="text-base font-semibold text-text-primary mb-1">
        Switch to the supplier persona
      </div>
      <div className="text-sm text-text-tertiary max-w-md">
        Toggle <span className="font-semibold">Supplier</span> in the sidebar to
        load your supplier workspace.
      </div>
    </div>
  </AppShellV2>
);

export default NoSupplierIdentity;
