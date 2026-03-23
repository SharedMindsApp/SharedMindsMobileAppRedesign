import { ReactNode } from 'react';

interface MobilePhoneViewportProps {
  children: ReactNode;
}

export function MobilePhoneViewport({ children }: MobilePhoneViewportProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="relative w-[430px] h-[calc(100vh-4rem)] max-h-[932px] bg-black rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-50 flex items-center justify-center">
          <div className="w-24 h-1.5 bg-gray-800 rounded-full"></div>
        </div>

        <div className="absolute inset-0 top-7 bottom-2 bg-white rounded-[2.5rem] overflow-hidden">
          {children}
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  );
}
