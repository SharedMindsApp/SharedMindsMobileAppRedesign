import { ReactNode } from 'react';

interface MobilePhoneFrameProps {
  children: ReactNode;
}

export function MobilePhoneFrame({ children }: MobilePhoneFrameProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-8">
      <div className="relative">
        <div className="relative w-[390px] h-[844px] bg-black rounded-[60px] shadow-2xl p-3">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-black rounded-b-3xl z-20"></div>

          <div className="w-full h-full bg-white rounded-[48px] overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/5 to-transparent z-10 pointer-events-none"></div>

            <div className="w-full h-full overflow-hidden">
              {children}
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-900 rounded-full"></div>
          </div>
        </div>

        <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-[68px] -z-10 blur-xl"></div>
      </div>
    </div>
  );
}
