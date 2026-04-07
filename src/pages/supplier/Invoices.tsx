import React from 'react';
import { Title, IllustratedMessage } from '@ui5/webcomponents-react';

const Invoices: React.FC = () => {
  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Invoices</Title>
      <IllustratedMessage name="NoData" titleText="No Invoices" subtitleText="Submitted invoices will appear here." />
    </div>
  );
};

export default Invoices;
