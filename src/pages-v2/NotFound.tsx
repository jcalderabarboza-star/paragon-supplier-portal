import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Button from '../components/ui-v2/Button';

// Real 404 (NAV-02). Unknown routes previously fell through to the buyer
// dashboard, silently masking bad links. This surfaces the miss honestly and
// offers a route home.
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['404']}
        title="Page not found"
        subtitle="The page you are looking for does not exist."
      />
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
          <Compass size={24} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          404 — Not found
        </div>
        <div className="text-sm text-text-tertiary max-w-md mb-4">
          This route does not match any page. It may have moved, or the link may
          be wrong.
        </div>
        <Button variant="primary" onClick={() => navigate('/buyer/dashboard')}>
          Back to dashboard
        </Button>
      </div>
    </AppShellV2>
  );
};

export default NotFound;
