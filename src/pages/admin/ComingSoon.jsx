import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { Construction } from 'lucide-react';

export default function ComingSoon({ title, subtitle }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="ws-card">
        <EmptyState
          icon={<Construction className="w-8 h-8" />}
          title={`${title} is on the way`}
          description="This area is part of the next ByteBridge iteration and will appear here once it lands."
        />
      </div>
    </div>
  );
}