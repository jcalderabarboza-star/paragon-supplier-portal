import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, Input, Button, Title, Text } from '@ui5/webcomponents-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Placeholder: navigate to buyer dashboard
    navigate('/buyer/dashboard');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f5f6f7',
    }}>
      <Card
        header={<CardHeader titleText="Paragon Supplier Portal" subtitleText="Sign in to continue" />}
        style={{ width: '400px' }}
      >
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Text>Email</Text>
            <Input
              placeholder="your@email.com"
              value={email}
              onInput={(e) => setEmail((e.target as unknown as HTMLInputElement).value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <Text>Password</Text>
            <Input
              type="Password"
              placeholder="••••••••"
              value={password}
              onInput={(e) => setPassword((e.target as unknown as HTMLInputElement).value)}
              style={{ width: '100%' }}
            />
          </div>
          <Button design="Emphasized" onClick={handleLogin} style={{ width: '100%' }}>
            Sign In
          </Button>
          <Button design="Transparent" onClick={() => navigate('/register')}>
            Register as Supplier
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
