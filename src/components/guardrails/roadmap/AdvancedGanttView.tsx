import { AlertCircle } from 'lucide-react';

interface AdvancedGanttViewProps {
  masterProjectId: string;
  sections?: any[];
  itemsBySectionId?: Map<string, any[]>;
  onItemsChange?: () => void;
  activeSectionId?: string | null;
}

export function AdvancedGanttView(_props: AdvancedGanttViewProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border-2 border-gray-200">
      <div className="text-center max-w-lg p-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          This view has been deprecated
        </h3>
        <p className="text-gray-600 mb-4">
          The section-based Gantt view is no longer supported and has been replaced with track-based timelines.
        </p>
        <p className="text-sm text-gray-500">
          Please use the <span className="font-medium">Infinite Roadmap</span> view for track-based timeline visualization.
        </p>
      </div>
    </div>
  );
}
