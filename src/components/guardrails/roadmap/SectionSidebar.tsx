import { AlertCircle } from 'lucide-react';

interface SectionSidebarProps {
  masterProjectId: string;
  sections: any[];
  onSectionsChange: () => void;
  onSectionClick: (sectionId: string) => void;
  activeSectionId: string | null;
}

export function SectionSidebar(_props: SectionSidebarProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg border-2 border-gray-200 p-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-3">
          <div className="p-2 bg-yellow-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          Sections Deprecated
        </h4>
        <p className="text-sm text-gray-600">
          Roadmap sections have been replaced with hierarchical tracks.
        </p>
      </div>
    </div>
  );
}
