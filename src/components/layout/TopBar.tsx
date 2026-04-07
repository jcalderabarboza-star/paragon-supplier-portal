import React from 'react';
import { ShellBar, ShellBarItem } from '@ui5/webcomponents-react';

const TopBar: React.FC = () => {
  return (
    <ShellBar
      primaryTitle="Paragon Supplier Portal"
      secondaryTitle="Procurement Network"
      logo={<img src="/src/assets/paragon-logo.svg" alt="Paragon Logo" style={{ height: '2rem' }} />}
    >
      <ShellBarItem icon="customer" text="Profile" />
    </ShellBar>
  );
};

export default TopBar;
