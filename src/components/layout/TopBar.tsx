import React from 'react';
import { ShellBar, ShellBarItem, Avatar } from '@ui5/webcomponents-react';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import { mockAlerts } from '../../data/mockKpis';

const ParagonLogo: React.FC = () => (
  <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="4" fill="#0097A7" />
    <text x="8" y="22" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="white">P</text>
    <text x="40" y="22" fontFamily="Arial" fontSize="14" fontWeight="600" fill="#354A5F">Paragon</text>
  </svg>
);

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { persona, setPersona } = usePersona();

  const initials = persona === 'buyer' ? 'JC' : 'SK';
  const toggleLabel = persona === 'buyer' ? 'Switch to Supplier' : 'Switch to Buyer';

  const handlePersonaToggle = () => {
    const next = persona === 'buyer' ? 'supplier' : 'buyer';
    setPersona(next);
    navigate(next === 'buyer' ? '/buyer/dashboard' : '/supplier/dashboard');
  };

  return (
    <ShellBar
      primaryTitle="Paragon Supplier Portal"
      secondaryTitle={persona === 'buyer' ? 'Buyer View' : 'Supplier View'}
      logo={<ParagonLogo />}
      notificationsCount={String(mockAlerts.unacknowledgedPOs)}
      showNotifications
      onNotificationsClick={() => {}}
      profile={
        <Avatar initials={initials} colorScheme="Accent6" />
      }
    >
      <ShellBarItem
        icon={persona === 'buyer' ? 'supplier' : 'manager'}
        text={toggleLabel}
        onClick={handlePersonaToggle}
      />
    </ShellBar>
  );
};

export default TopBar;
