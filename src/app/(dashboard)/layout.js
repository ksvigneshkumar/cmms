import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import { MobileMenuProvider } from '@/components/layout/MobileMenuContext';

export default function DashboardLayout({ children }) {
  return (
    <MobileMenuProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </MobileMenuProvider>
  );
}
