import { OutreachNavBar } from '@/components/outreach-nav-bar';
import EmailTemplatesPage from '../settings/email-templates/page';

export default function EmailTemplatesStandalonePage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <OutreachNavBar />
      <div className="flex-1 overflow-y-auto">
        <EmailTemplatesPage />
      </div>
    </div>
  );
}
