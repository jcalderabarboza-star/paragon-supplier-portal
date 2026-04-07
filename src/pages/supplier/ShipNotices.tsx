import React from 'react';
import { Title, IllustratedMessage } from '@ui5/webcomponents-react';

const ShipNotices: React.FC = () => {
  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Ship Notices (ASNs)</Title>
      <IllustratedMessage name="NoData" titleText="No Ship Notices" subtitleText="Ship notices will appear here once created." />
    </div>
  );
};

export default ShipNotices;
