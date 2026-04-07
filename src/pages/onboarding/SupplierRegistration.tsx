import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, Input, Button, Title, Text, Select, Option } from '@ui5/webcomponents-react';

const SupplierRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = () => {
    // Placeholder: navigate to login after registration
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f6f7',
      padding: '2rem',
    }}>
      <Card
        header={<CardHeader titleText="Supplier Registration" subtitleText="Join the Paragon Procurement Network" />}
        style={{ width: '500px' }}
      >
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Text>Company Name</Text>
            <Input
              placeholder="Acme Corp."
              value={companyName}
              onInput={(e) => setCompanyName((e.target as unknown as HTMLInputElement).value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <Text>Contact Name</Text>
            <Input
              placeholder="Jane Smith"
              value={contactName}
              onInput={(e) => setContactName((e.target as unknown as HTMLInputElement).value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <Text>Business Email</Text>
            <Input
              placeholder="contact@company.com"
              value={email}
              onInput={(e) => setEmail((e.target as unknown as HTMLInputElement).value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <Text>Category</Text>
            <Select
              onChange={(e) => setCategory(e.detail.selectedOption.textContent ?? '')}
              style={{ width: '100%' }}
            >
              <Option>Raw Materials</Option>
              <Option>Electronics</Option>
              <Option>Components</Option>
              <Option>Logistics</Option>
              <Option>Services</Option>
            </Select>
          </div>
          <Button design="Emphasized" onClick={handleSubmit} style={{ width: '100%' }}>
            Submit Registration
          </Button>
          <Button design="Transparent" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SupplierRegistration;
